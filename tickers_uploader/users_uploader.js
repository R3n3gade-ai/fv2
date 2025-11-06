const axios = require('axios');
const fs = require('fs');
const admin = require('firebase-admin');

// ✅ Switch this flag ON when using emulator
const USE_FIREBASE_EMULATOR = true;

// Initialize Firebase Admin
const serviceAccount = require('./service-account.json');

// Initialize app (no databaseURL needed for emulator)
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: USE_FIREBASE_EMULATOR
    ? 'http://localhost:9001?ns=tradingproject25-default-rtdb'
    : 'https://tradingproject25-default-rtdb.firebaseio.com',
});

const db = admin.database();

// ✅ Important: Tell Admin SDK to use emulator
if (USE_FIREBASE_EMULATOR) {
  process.env.FIREBASE_DATABASE_EMULATOR_HOST = 'localhost:9001';
  console.log('🔥 Using Firebase Realtime Database Emulator on localhost:9001');
}

function uploadUsersFromJSON(filePath) {
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading JSON file:', err);
      return;
    }

    const jsonData = JSON.parse(data);
    const users = jsonData.users;
    const updates = {};

    users.forEach(user => {
      const userId = user.localId;
      updates[`/users/${userId}`] = {
        address: "address",
        city: "city",
        country: "country",
        email: user.email,
        firstName: user.email,
        fullName: user.email,
        isEmpty: false,
        isLoaded: true,
        lastName: user.email,
        package: "FTSTND",
        paymentStatus: "Paid",
        phoneNumber: "1234",
        postalCode: "postalCode",
        referral: "referral",
        showTour: false,
        state: "state"
      };
    });

    db.ref().update(updates)
      .then(() => console.log('✅ Data successfully uploaded to Firebase Emulator.'))
      .catch((error) => console.error('❌ Error uploading data:', error));
  });
}

// Call the function
uploadUsersFromJSON('./users.json');
