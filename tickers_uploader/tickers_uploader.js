const axios = require('axios');
const fs = require('fs');
const admin = require('firebase-admin');

// ✅ Switch between emulator and live Firebase
const USE_FIREBASE_EMULATOR = true;

// Initialize Firebase Admin
const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: USE_FIREBASE_EMULATOR
    ? 'http://localhost:9001?ns=tradingproject25-default-rtdb'
    : 'https://tradingproject25-default-rtdb.firebaseio.com',
});

if (USE_FIREBASE_EMULATOR) {
  process.env.FIREBASE_DATABASE_EMULATOR_HOST = 'localhost:9001';
  console.log('🔥 Using Firebase Realtime Database Emulator on localhost:9001');
}

const db = admin.database();

// 🔹 Polygon API setup
const API_KEY = 'sGaP6bC36mepdAAoq7q9duJ7tyxe50yI';
const BASE_URL = 'https://api.polygon.io/v3/reference/tickers';
let allResults = [];

// 🔹 Recursive ticker fetch
async function fetchTickers(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      }
    });
    const data = response.data;

    // Extract ticker + name
    const extractedData = data.results.map(ticker => ({
      ticker: ticker.ticker,
      name: ticker.name
    }));

    allResults = allResults.concat(extractedData);

    // Pagination support
    if (data.next_url) {
      console.log(`Fetched ${allResults.length} tickers so far...`);
      await fetchTickers(data.next_url);
    } else {
      console.log(`✅ All records fetched. Total: ${allResults.length}`);
      uploadToFirebase(allResults);
    }
  } catch (error) {
    console.error('❌ Error fetching data:', error.message);
  }
}

// 🔹 Upload data to Firebase
function uploadToFirebase(data) {
  const updates = {};

  data.forEach(item => {
    // Replace invalid Firebase key characters
    const sanitizedTicker = item.ticker.replace(/[.#$\/\[\]]/g, '_');
    updates[`/polySymbols/${sanitizedTicker}`] = item.name;
  });

  db.ref().update(updates)
    .then(() => {
      console.log(`✅ Uploaded ${data.length} tickers to Firebase ${USE_FIREBASE_EMULATOR ? '(Emulator)' : '(Live DB)'}.`);
    })
    .catch((error) => {
      console.error('❌ Error uploading data:', error);
    });
}

// Start fetching from Polygon
fetchTickers(`${BASE_URL}?active=true&limit=1000&market=stocks`);
