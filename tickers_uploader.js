const axios = require('axios');
const fs = require('fs');
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./service-account.json'); // Replace with your service account key path
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://tradingproject25-default-rtdb.firebaseio.com' // Replace with your database URL
});

const db = admin.database();

const API_KEY = 'sGaP6bC36mepdAAoq7q9duJ7tyxe50yI'; // Your API key
const BASE_URL = 'https://api.polygon.io/v3/reference/tickers';
let allResults = [];

async function fetchTickers(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${API_KEY}` // Add the Authorization header
      }
    });
    const data = response.data;

    // Extract "ticker" and "name" from the results
    const extractedData = data.results.map(ticker => ({
      ticker: ticker.ticker,
      name: ticker.name
    }));

    // Append the current extracted data to allResults
    allResults = allResults.concat(extractedData);

    // Check if there's a next URL to fetch
    if (data.next_url) {
      await fetchTickers(data.next_url); // Recursively fetch the next page
    } else {
      console.log('All records fetched. Total records:', allResults.length);
      uploadToFirebase(allResults);
    }
  } catch (error) {
    console.error('Error fetching data:', error.message);
  }
}

function uploadToFirebase(data) {
  const updates = {};
  
  data.forEach(item => {
	   const sanitizedTicker = item.ticker.replace(/[.#$\/\[\]]/g, '_');
    updates[`/polySymbols/${sanitizedTicker}`] = item.name; // Set ticker as key and name as value
  });

  db.ref().update(updates)
    .then(() => {
      console.log('Data successfully uploaded to Firebase.');
    })
    .catch((error) => {
      console.error('Error uploading data to Firebase:', error);
    });
}

// Start fetching from the initial URL
fetchTickers(`${BASE_URL}?active=true&limit=1000&market=stocks&apiKey=${API_KEY}`);
