const fs = require('fs').promises;
const http = require('http');
const https = require('https');

// Configuration for Firebase Emulator
const USE_EMULATOR = true;//process.env.USE_FIREBASE_EMULATOR === 'true' || process.env.NODE_ENV === 'development' || true; // Set to true to use emulator
const EMULATOR_CONFIG = {
    auth: {
        host: 'localhost',
        port: 9099
    },
    database: {
        host: 'localhost',
        port: 9001
    }
};

// Firebase class equivalent
class Firebase {
    async addAuthenticatedUser(email, password) {
        const firebaseResponse = {
            Code: null,
            UserId: null,
            Message: null
        };

        try {
            let baseUrl;
            const authToken = "AIzaSyCnR2pZ-1T86KPKAUUjakBpV0h_UdRm5Co";
            
            if (USE_EMULATOR) {
                // Use emulator endpoint for auth
                baseUrl = `http://${EMULATOR_CONFIG.auth.host}:${EMULATOR_CONFIG.auth.port}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=`;
            } else {
                // Use production endpoint
                baseUrl = "https://www.googleapis.com/identitytoolkit/v3/relyingparty/signupNewUser?key=";
            }

            const customer = {
                email: email,
                password: password,
                returnSecureToken: false
            };

            const response = await makeHttpRequest(
                baseUrl + authToken,
                'POST',
                customer,
                USE_EMULATOR
            );

            if (response.success) {
                firebaseResponse.Code = 'Success';
                firebaseResponse.UserId = response.data.localId;
            } else {
                firebaseResponse.Code = 'Failure';
                firebaseResponse.Message = response.data.error?.message || 'Unknown error';
            }

            return firebaseResponse;
        } catch (ex) {
            firebaseResponse.Code = 'Failure';
            firebaseResponse.Message = "There was an error creating the user token. Please email info@flowtrade.com";
            console.error('Error in addAuthenticatedUser:', ex);
            return firebaseResponse;
        }
    }

    async addFirebaseUser(userId, firstName, lastName, email, phoneNumber, referral, address, city, state, postalCode, country, packageType, paymentStatus, zohoUserId) {
        try {
            let baseUrl;
            
            if (USE_EMULATOR) {
                // Use emulator endpoint for database
                baseUrl = `http://${EMULATOR_CONFIG.database.host}:${EMULATOR_CONFIG.database.port}/users/${userId}.json?ns=tradingproject25-default-rtdb`;
            } else {
                // Use production endpoint
                const authToken = "AIzaSyCnR2pZ-1T86KPKAUUjakBpV0h_UdRm5Co";
                baseUrl = `https://tradingproject24-default-rtdb.firebaseio.com/users/${userId}.json?auth=${authToken}`;
            }

            const customer = {
                firstName: firstName,
                lastName: lastName,
                fullName: firstName + " " + lastName,
                email: email,
                phoneNumber: phoneNumber,
                referral: referral,
                address: address,
                city: city,
                state: state,
                postalCode: postalCode,
                country: country,
                package: packageType,
                paymentStatus: paymentStatus,
                zohoUserId: zohoUserId
            };

            const response = await makeHttpRequest(
                baseUrl,
                'PUT',
                customer,
                USE_EMULATOR
            );

            if (response.success) {
                console.log(`Successfully added user ${userId} to Firebase ${USE_EMULATOR ? 'Emulator' : 'Production'}`);
            } else {
                console.error(`Failed to add user ${userId}:`, response.data);
            }

            return response.success;
        } catch (ex) {
            console.error('Error in addFirebaseUser:', ex);
            return false;
        }
    }
}

// Helper function to make HTTP requests
function makeHttpRequest(url, method, data, useHttp = false) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const protocol = useHttp ? http : https;
        
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port || (useHttp ? 80 : 443),
            path: urlObj.pathname + urlObj.search,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(JSON.stringify(data))
            }
        };

        console.log(`Making ${method} request to: ${url}`);

        const req = protocol.request(options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                try {
                    const parsedData = responseData ? JSON.parse(responseData) : {};
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve({ success: true, data: parsedData });
                    } else {
                        console.error(`HTTP ${res.statusCode} response:`, responseData);
                        resolve({ success: false, data: parsedData });
                    }
                } catch (e) {
                    console.error('Error parsing response:', e);
                    reject(e);
                }
            });
        });

        req.on('error', (error) => {
            console.error('Request error:', error);
            reject(error);
        });

        req.write(JSON.stringify(data));
        req.end();
    });
}

// Main execution
async function main() {
    try {
        console.log(`Firebase Emulator Mode: ${USE_EMULATOR ? 'ENABLED' : 'DISABLED'}`);
        
        if (USE_EMULATOR) {
            console.log('Using Firebase Emulator with configuration:');
            console.log(`- Auth: http://${EMULATOR_CONFIG.auth.host}:${EMULATOR_CONFIG.auth.port}`);
            console.log(`- Database: http://${EMULATOR_CONFIG.database.host}:${EMULATOR_CONFIG.database.port}`);
            console.log('\nMake sure Firebase emulator is running with: firebase emulators:start\n');
        }

        // Read the JSON file
        const jsonFilePath = "users.json";
        const jsonText = await fs.readFile(jsonFilePath, 'utf8');
        const root = JSON.parse(jsonText);

        const firebase = new Firebase();

        // Process each user
        console.log(`Processing ${root.users.length} users...`, root.users[0]);
        
        for (const user of root.users) {
        const userResponse = await firebase.addAuthenticatedUser(user.email, "flow123"
        )
            console.log(`\nProcessing - LocalId: ${user.localId}, Email: ${user.email}`);
            
            if (userResponse.UserId && userResponse.UserId !== '') {
                console.log(userResponse,'bilal');
                const success = await firebase.addFirebaseUser(
                    userResponse.UserId,
                    user.email,
                    user.email,
                    user.email,
                    "000",
                    "",
                    "address",
                    "city",
                    "state",
                    "postalcODE",
                    "country",
                    "FTSTND",
                    "Paid",
                    ""
                );
                
                if (!success) {
                    console.error(`Failed to add user ${user.LocalId}`);
                }
            } else {
                console.log(`Skipping user with empty LocalId`);
            }
        }

        console.log('\nProcessing complete!');
    } catch (error) {
        console.error('Error:', error);
    }
}

// Run the main function
main();
