const axios = require('axios');
const fs = require('fs');
const csv = require('csv-parser');
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./service-account.json'); // Replace with your service account key path
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://tradingproject25-default-rtdb.firebaseio.com' // Replace with your database URL
});

const db = admin.database();


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
      const userId = user.localId; // Use localId as the key
      updates[`/users/${userId}`] = {
        address: "address",
        city: "city",
        country: "country",
        email: user.email,
        firstName: user.email, // Adjust as needed
        fullName: user.email, // Adjust as needed
        isEmpty: false, // Set default or modify as needed
        isLoaded: true,
        lastName: user.email, // Adjust as needed
        package: "FTSTND",
        paymentStatus: "Paid",
        phoneNumber: "1234", // Adjust as needed
        postalCode: "postalCode", // Adjust as needed
        referral: "referral", // Adjust as needed
        showTour: false,
        state: "state" // Adjust as needed
      };
    });

    // Update Firebase with the new user data
    db.ref().update(updates)
      .then(() => {
        console.log('Data successfully uploaded to Firebase.');
      })
      .catch((error) => {
        console.error('Error uploading data to Firebase:', error);
      });
  });
}

// Call the function with your JSON file path
uploadUsersFromJSON('./users.json');
