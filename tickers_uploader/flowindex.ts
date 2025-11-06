import axios from "axios";
import moment from "moment-timezone";
import * as AdmZip from "adm-zip";
import { unpack } from "msgpackr";
import fs from "fs";

// 1. Configure constants matching PHP setup
const TIME_ZONE: string = "America/New_York";

interface Trade {
    exchange: number;
    participant_timestamp: number;
    price: number;
    size: number;
    conditions?: number[];
}

interface IntervalData {
    tick: number;
    T: number;
    O: number | null;
    H: number;
    L: number;
    C: number | null;
    MO: number | null;
    D: number;
    U: number;
    DD: number;
    DU: number;
    V: number;
    previousPrice: number | null;
    direction: number;
    gotOpenClose: boolean;
    initialUpDarkVolumes: {
        updark: number;
        downdark: number;
        upvol: number;
        downvol: number;
    };
}

interface Condition {
    updates_open_close?: boolean;
    updates_high_low?: boolean;
    updates_volume?: boolean;
}

interface ConditionResult {
    open_close: boolean;
    high_low: boolean;
    volume: boolean;
}

let CONDITION_MAP: Map<number, Condition> = new Map();

function aggregateTrades(trades: Trade[], timeframeMinutes: number = 15): IntervalData[] {
    const intervalMap: Map<number, IntervalData> = new Map();
    let totalSize: number = 0;

    for (let i = 0; i < trades.length; i++) {
        if (trades[i].exchange !== 4) totalSize += trades[i].size;
    }

    console.log(totalSize); // Output: 600
    trades.forEach((trade: Trade) => {
        // 2. Convert to proper timestamp with timezone
        const timestamp = moment(trade.participant_timestamp / 1000000);

        // 3. Align to 15-minute grid (e.g., 9:30, 9:45, 10:00)
        const alignedTime = timestamp
            .clone()
            .minute(Math.floor(timestamp.minute() / timeframeMinutes) * timeframeMinutes)
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

        const interval = intervalMap.get(intervalKey)!;
        processTrade(interval, trade, timestamp);
    });

    // 5. Convert to sorted array and clean up values
    return Array.from(intervalMap.values());
}

function processTrade(interval: IntervalData, trade: Trade, timestamp: moment.Moment): void {
    const conditions = trade.conditions || [];
    const conditionResults = getConditionResults(conditions, interval.gotOpenClose);
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
                interval.initialUpDarkVolumes[interval.direction === 1 ? "updark" : "downdark"] += size;
            } else {
                interval.initialUpDarkVolumes[interval.direction === 1 ? "upvol" : "downvol"] += size;
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
    if (conditionResults.open_close) interval.previousPrice = price;
}

function getConditionResults(conditions: number[], gotOpenClose: boolean): ConditionResult {
    let open_close = true;
    let high_low = true;
    let volume = true;

    conditions.forEach((code: number) => {
        const condition = CONDITION_MAP.get(code) || {};

        // Original PHP conditional logic
        let oc = condition.updates_open_close ?? true;
        let hl = condition.updates_high_low ?? true;
        let vol = condition.updates_volume ?? true;

        // Special case handling from PHP
        if (code === 17) {
            if (!gotOpenClose || conditions.length === 1)
                oc = true;
        }

        open_close = open_close && oc;
        high_low = high_low && hl;
        volume = volume && vol;
    });

    return { open_close, high_low, volume };
}

function isDarkTrade(trade: Trade): boolean {
    return trade.exchange === 4; // Example for dark pool exchange code
}

async function getTrades(symbol: string, fromTime: number, toTime: number, limit: number): Promise<any> {
    const url = `https://api.flowtrade.com/getTrades?symbol=${symbol}&fromTime=${fromTime}&toTime=${toTime}&limit=${limit}`;

    // Fetch binary data
    const response = await axios.get(url, { responseType: "arraybuffer" });

    // Read ZIP file
    const zip = AdmZip(response.data);
    const zipEntries = zip.getEntries();

    // Check for entries
    if (zipEntries.length === 0) {
        throw new Error("No files found in ZIP archive");
    }

    // Get first file's content (modify if multiple files)
    const msgpackData = zipEntries[0].getData();
    return unpack(msgpackData);
}

async function getConditions(): Promise<Map<number, Condition>> {
    const url =
        "https://api.polygon.io/v3/reference/conditions?asset_class=stocks&data_type=trade&limit=1000&apiKey=JQQnSbCMEG0w9ftVedjyDtVRQxb5eLPy";
    const response = await axios.get(url);
    let conditionMap = new Map<number, Condition>();
    response.data.results.map((condition: any) => {
        conditionMap.set(condition.id, condition.update_rules?.consolidated);
    });
    return conditionMap;
}

getConditions().then((conditionMap: Map<number, Condition>) => {
    CONDITION_MAP = conditionMap;
    getTrades("AAPL", 1738593000000, 1738593900000, 50000)
        .then((trades: any) => {
            console.log(trades.results.length);
            //exportJsonToFile(trades.results, "output.json");
            const aggregated = aggregateTrades(trades.results, 15);
            console.log(aggregated);
        })
        .catch((error: Error) => {
            console.error("Error fetching trades:", error.message);
        });
});