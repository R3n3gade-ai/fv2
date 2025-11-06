const axios = require("axios");
const moment = require("moment-timezone");

const AdmZip = require("adm-zip");
const { unpack } = require("msgpackr");

// 1. Configure constants matching PHP setup
const TIME_ZONE = "America/New_York";

const fs = require("fs");

function exportJsonToFile(jsonData, filePath) {
  try {
    const jsonString = JSON.stringify(jsonData, null, 2); // Convert JSON object to string (pretty-printed)

    fs.writeFileSync(filePath, jsonString, "utf8"); // Write the JSON string to the file

    console.log(`JSON data successfully exported to ${filePath}`);
  } catch (err) {
    console.error(`Error exporting JSON data to ${filePath}:`, err);
    throw err; // Optionally re-throw the error for handling by the caller
  }
}

CONDITION_MAP = new Map();
initialConditions = { open_close: true, high_low: true, volume: true };

function aggregateTrades(trades, timeframeMinutes = 15) {
  const intervalMap = new Map();
  let totalSize = 0;

  for (let i = 0; i < trades.length; i++) {
    if (trades[i].exchange !== 4) totalSize += trades[i].size;
  }

  console.log(totalSize); // Output: 600
  trades.forEach((trade) => {
    // 2. Convert to proper timestamp with timezone
    const timestamp = moment(trade.participant_timestamp / 1000000);

    // 3. Align to 15-minute grid (e.g., 9:30, 9:45, 10:00)
    const alignedTime = timestamp
      .clone()
      .minute(
        Math.floor(timestamp.minute() / timeframeMinutes) * timeframeMinutes
      )
      .second(0)
      .millisecond(0);

    const intervalKey = alignedTime.valueOf();

    // 4. Get or create interval data
    if (!intervalMap.has(intervalKey)) {
      intervalMap.set(intervalKey, {
        tick: 0,
        T: intervalKey,
        O: null,
        H: -Infinity,
        L: Infinity,
        C: null,
        MO: null,
        D: 0,
        U: 0,
        DD: 0,
        DU: 0,
        V: 0,
        previousPrice: null,
        direction: 1, // Initial direction
        gotOpenClose: false,
        initialUpDarkVolumes: { updark: 0, downdark: 0, upvol: 0, downvol: 0 },
      });
    }

    const interval = intervalMap.get(intervalKey);
    //console.log(interval);
    processTrade(interval, trade, timestamp);
  });
  //console.log(Array.from(intervalMap.values()), "aa");
  // 5. Convert to sorted array and clean up values
  return Array.from(intervalMap.values());
  // .map(cleanInterval)
  // .sort((a, b) => a.T - b.T);
}

function processTrade(interval, trade, timestamp) {
  const conditions = trade.conditions || [];
  const conditionResults = getConditionResults(
    conditions,
    interval.gotOpenClose
  );
  const price = trade.price;
  const size = trade.size;
  const isDark = isDarkTrade(trade);

  // 1. TICK CALCULATION (EXACT PHP LOGIC)

  if (conditionResults.open_close) {
    if (interval.previousPrice !== null) {
      interval.tick = price - interval.previousPrice;
    } else {
      interval.tick = price; // Initial tick set to price as in PHP
    }
  }

  // 3. UPDATE OHLCV WITH CONDITIONS (AS PHP)
  if (conditionResults.open_close) {
    if (!interval.gotOpenClose) {
      interval.MO = price;
      interval.O = price;
      interval.gotOpenClose = true;
    }
    interval.C = price;
  }

  if (conditionResults.high_low) {
    interval.H = Math.max(interval.H, price);
    interval.L = Math.min(interval.L, price);
  }

  // 4. VOLUME CLASSIFICATION (EXACT PHP LOGIC)

  if (interval.tick === 0) {
    if (conditionResults.open_close && conditionResults.volume) {
      if (isDark) {
        interval.initialUpDarkVolumes[
          interval.direction === 1 ? "updark" : "downdark"
        ] += size;
      } else {
        interval.initialUpDarkVolumes[
          interval.direction === 1 ? "upvol" : "downvol"
        ] += size;
      }
    }
  } else if (interval.tick > 0) {
    if (conditionResults.open_close) {
      interval.direction = 1;
      if (conditionResults.volume) {
        if (isDark) {
          interval.initialUpDarkVolumes.updark += size;
        } else {
          interval.initialUpDarkVolumes.upvol += size;
        }
      }
    }
  } else {
    if (conditionResults.open_close) {
      interval.direction = -1;
      if (conditionResults.volume) {
        if (isDark) {
          interval.initialUpDarkVolumes.downdark += size;
        } else {
          interval.initialUpDarkVolumes.downvol += size;
        }
      }
    }
  }

  if (!isDark && conditionResults.volume) {
    interval.V += size;
  }

  // 5. STORE VALUES FOR NEXT ITERATION
  if(conditionResults.open_close)
    interval.previousPrice = price;
}

function getConditionResults(conditions, gotOpenClose) {
  // 10. Replicate PHP's condition logic exactly
  let open_close = true;
  let high_low = true;
  let volume = true;

  conditions.forEach((code) => {
    const condition = CONDITION_MAP.get(code) || {};

    // Original PHP conditional logic
    let oc = condition.updates_open_close ?? true;
    let hl = condition.updates_high_low ?? true;
    let vol = condition.updates_volume ?? true;

    // Special case handling from PHP
    if (code === 17) {
      if (!gotOpenClose || conditions.length === 1) oc = true;

      if (code === 22 || code == 33) {
        if (conditions.length === 1) oc = true;
      }
    }

    open_close = open_close && oc;
    high_low = high_low && hl;
    volume = volume && vol;
  });

  return { open_close, high_low, volume };
}

// 13. Implement your dark pool detection
function isDarkTrade(trade) {
  //console.log(trade.exchange,trade.price, trade.size);
  return trade.exchange === 4; // Example for dark pool exchange code
}

async function getTrades(symbol, fromTime, toTime, limit) {
  const url = `https://api.flowtrade.com/getTrades?symbol=${symbol}&fromTime=${fromTime}&toTime=${toTime}&limit=${limit}`;

  // Fetch binary data
  const response = await axios.get(url, { responseType: "arraybuffer" });

  // Read ZIP file
  const zip = new AdmZip(response.data);
  const zipEntries = zip.getEntries();

  // Check for entries
  if (zipEntries.length === 0) {
    throw new Error("No files found in ZIP archive");
  }

  // Get first file's content (modify if multiple files)
  const msgpackData = zipEntries[0].getData();
  //console.log(unpack(msgpackData));
  // Unpack MessagePack
  return unpack(msgpackData);
}

async function getConditions() {
  const url =
    "https://api.polygon.io/v3/reference/conditions?asset_class=stocks&data_type=trade&limit=1000&apiKey=JQQnSbCMEG0w9ftVedjyDtVRQxb5eLPy";
  const response = await axios.get(url);
  //let result = response.data.results;
  let conditionMap = new Map(
    response.data.results.map((condition) => [
      condition.id,
      condition.update_rules?.consolidated,
    ])
  );
  return conditionMap;
}

getConditions().then((conditionMap) => {
  CONDITION_MAP = conditionMap;
  getTrades("AAPL", 1738593000000, 1738593900000, 50000)
    .then((trades) => {
      console.log(trades.results.length);
      //exportJsonToFile(trades.results, "output.json");
      const aggregated = aggregateTrades(trades.results, 15);
      console.log(aggregated);
    })
    .catch((error) => {
      console.error("Error fetching trades:", error.message);
    });
});
