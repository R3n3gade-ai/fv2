const axios = require("axios");
const moment = require("moment-timezone");

const AdmZip = require("adm-zip");
const { unpack } = require("msgpackr");

function calculateOHLCV(trades, timeframe) {
    const timeZone = 'America/New_York';
    const ohlcvData = {};
  
    function getBucketStart(timestamp, timeframe) {
      const date = new Date(timestamp);
      const year = date.getFullYear();
      const month = date.getMonth();
      const day = date.getDate();
      const hours = date.getHours();
      const minutes = date.getMinutes();
  
      switch (timeframe) {
        case '1m':
          return new Date(year, month, day, hours, minutes).getTime();
        case '15m':
          return new Date(year, month, day, hours, Math.floor(minutes / 15) * 15).getTime();
        case '1h':
          return new Date(year, month, day, hours).getTime();
        default:
          throw new Error('Invalid timeframe: ' + timeframe);
      }
    }
  
    let previousTrade = null; // Store the previous trade for tick calculation
  
    for (const trade of trades) {
      const timestamp = trade.participant_timestamp;
      const symbol = trade.symbol || 'UNKNOWN';
      const price = trade.price;
      const size = trade.size;
      const exchange = trade.exchange;
      const conditions = trade.conditions || [];
  
      const bucketStart = getBucketStart(timestamp, timeframe);
  
      if (!ohlcvData[symbol]) {
        ohlcvData[symbol] = {};
      }
  
      if (!ohlcvData[symbol][bucketStart]) {
        ohlcvData[symbol][bucketStart] = {
          O: price,
          H: price,
          L: price,
          C: price,
          V: 0,
          U: 0,
          D: 0,
          DU: 0,
          DD: 0,
          MO: 0,
          T: bucketStart,
          gotOpenClose: false,
          direction: 0,
          previousPrice: null,
          initialUpDarkVolumes: { updark: 0, downdark: 0, upvol: 0, downvol: 0 },
          initialOHLCV: { open: 0, high: 0, low: 500000, close: 0, volume: 0 },
          tick: 0 // Initialize tick for the bucket
        };
      }
  
      const bucket = ohlcvData[symbol][bucketStart];
  
      // Calculate tick based on the previous trade
      let tick = 0;
      if (previousTrade) {
        if (trade.price > previousTrade.price) {
          tick = 1;
        } else if (trade.price < previousTrade.price) {
          tick = -1;
        }
      }
  
      bucket.tick = tick;
  
      const isOpeningTrade = (conditions.includes(12) && (!bucket.gotOpenClose || conditions.length === 1)) ||
                             (conditions.includes(22) || conditions.includes(33)) && conditions.length === 1;
  
      if (!bucket.gotOpenClose && isOpeningTrade) {
        bucket.MO = price;
        bucket.gotOpenClose = true;
        bucket.initialOHLCV.open = price;
      }
  
      bucket.H = Math.max(bucket.H, price);
      bucket.L = Math.min(bucket.L, price);
      bucket.C = price;
  
      const isDark = exchange === 4 || exchange === 11;
  
    //   if (bucket.previousPrice !== null) {
    //     const priceChange = price - bucket.previousPrice;
    //     if (priceChange > 0) {
    //       bucket.U += size;
    //       if (isDark) bucket.DU += size;
    //       bucket.direction = 1;
    //     } else if (priceChange < 0) {
    //       bucket.D += size;
    //       if (isDark) bucket.DD += size;
    //       bucket.direction = -1;
    //     }
    //   }
  
      bucket.V += size;
  
      if (!isDark) {
        bucket.initialOHLCV.volume += size;
      }
  
      if (bucket.tick === 0) {
        if (bucket.gotOpenClose) {
          if (bucket.initialOHLCV.volume > 0) {
            if (isDark) {
              if (bucket.direction === 1) {
                bucket.initialUpDarkVolumes.updark += size;
              } else {
                bucket.initialUpDarkVolumes.downdark += size;
              }
            } else {
              if (bucket.direction === 1) {
                bucket.initialUpDarkVolumes.upvol += size;
              } else {
                bucket.initialUpDarkVolumes.downvol += size;
              }
            }
          }
        }
      } else if (bucket.tick > 0) {
        if (bucket.gotOpenClose) {
          bucket.direction = 1;
          if (bucket.initialOHLCV.volume > 0) {
            if (isDark) {
              bucket.initialUpDarkVolumes.updark += size;
            } else {
              bucket.initialUpDarkVolumes.upvol += size;
            }
          }
        }
      } else {
        if (bucket.gotOpenClose) {
          bucket.direction = -1;
          if (bucket.initialOHLCV.volume > 0) {
            if (isDark) {
              bucket.initialUpDarkVolumes.downdark += size;
            } else {
              bucket.initialUpDarkVolumes.downvol += size;
            }
          }
        }
      }
  
      if (bucket.initialOHLCV.open === 0) {
        bucket.initialOHLCV.open = price;
      }
      bucket.initialOHLCV.high = Math.max(bucket.initialOHLCV.high, price);
      bucket.initialOHLCV.low = Math.min(bucket.initialOHLCV.low, price);
      bucket.initialOHLCV.close = price;
  
      bucket.previousPrice = price;
      previousTrade = trade;
    }
  
    const results = [];
    for (const symbol in ohlcvData) {
      for (const timestamp in ohlcvData[symbol]) {
        results.push(ohlcvData[symbol][timestamp]);
      }
    }
  
    return results;
  }
  
  
  
  
  
  // Example usage (replace with your actual trade data)
  const trades = [
    { sym: 'AAPL', t: 1678886400000, p: 150, s: 100, x: 1, c: [17] }, // Example trade data
    { sym: 'AAPL', t: 1678886460000, p: 150.5, s: 200, x: 1, c: [] },
    { sym: 'AAPL', t: 1678886520000, p: 150.2, s: 150, x: 4, c: [] }, // Dark pool trade
    // ... more trades
  ];


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
  getTrades("AAPL", 1738247400000, 1738248300000, 50000)
    .then((trades) => {
        const timeframe = '15m'; // Or '15m', '1h', etc.
  const ohlcv = calculateOHLCV(trades.results, timeframe);
  console.log(ohlcv); // Print the OHLCV data
    })
    .catch((error) => {
      console.error("Error fetching trades:", error.message);
    });