import React from 'react'; 
// Use namespaced v8 API explicitly to avoid tree/version mismatches
import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/database';

// CRITICAL: Set SDK_VERSION before any other Firebase code runs
if (firebase && !firebase.SDK_VERSION) {
  firebase.SDK_VERSION = '8.10.1';
  console.log('[Firebase.js] SDK_VERSION set to 8.10.1');
}

// Defensive global wiring: some bundled modules expect a global `firebase` with SDK_VERSION
if (typeof window !== 'undefined') {
  try {
    window.firebase = window.firebase || firebase;
  } catch (e) {
    // noop
  }
}

// --- base Firebase config (same as before) ---
const config = {
  apiKey: "AIzaSyBxhqjaqeU5_DWyf7JEhAU_kM51lG36QsI",
  authDomain: "trade-flow-4a5d8.firebaseapp.com",
  databaseURL: "https://trade-flow-4a5d8-default-rtdb.firebaseio.com",
  projectId: "trade-flow-4a5d8",
  storageBucket: "trade-flow-4a5d8.firebasestorage.app",
  messagingSenderId: "714182891815",
  appId: "1:714182891815:web:c0a3330dc653439b3c7102",
  measurementId: "G-ZFX8GDMVS5"
};

// --- emulator settings ---
const EMULATOR_HOST = '172.174.49.50';
const AUTH_PORT = 9099;
const DB_PORT = 9001;

// --- initialize default app ---
firebase.initializeApp({
  ...config,
  databaseURL: 'https://trade-flow-4a5d8-default-rtdb.firebaseio.com'
});

// --- define all instances (same as before) ---
export const firebaseInstance = Object.assign({}, {
  firebase,

  primary: firebase.initializeApp({
    ...config,
    databaseURL: 'https://trade-flow-4a5d8-default-rtdb.firebaseio.com'
  }, 'primary'),

  polyae: firebase.initializeApp({
    ...config,
    databaseURL: 'https://trade-flow-4a5d8-default-rtdb.firebaseio.com'
  }, 'polyae'),

  polyfl: firebase.initializeApp({
    ...config,
    databaseURL: 'https://trade-flow-4a5d8-default-rtdb.firebaseio.com'
  }, 'polyfl'),

  polyms: firebase.initializeApp({
    ...config,
    databaseURL: 'https://trade-flow-4a5d8-default-rtdb.firebaseio.com'
  }, 'polyms'),

  polytz: firebase.initializeApp({
    ...config,
    databaseURL: 'https://trade-flow-4a5d8-default-rtdb.firebaseio.com'
  }, 'polytz'),

  liveae: firebase.initializeApp({
    ...config,
    databaseURL: 'https://trade-flow-4a5d8-default-rtdb.firebaseio.com'
  }, 'liveae'),

  livefl: firebase.initializeApp({
    ...config,
    databaseURL: 'https://trade-flow-4a5d8-default-rtdb.firebaseio.com'
  }, 'livefl'),

  livems: firebase.initializeApp({
    ...config,
    databaseURL: 'https://trade-flow-4a5d8-default-rtdb.firebaseio.com'
  }, 'livems'),

  livetz: firebase.initializeApp({
    ...config,
    databaseURL: 'https://trade-flow-4a5d8-default-rtdb.firebaseio.com'
  }, 'livetz'),

  futures: firebase.initializeApp({
    ...config,
    databaseURL: 'https://trade-flow-4a5d8-default-rtdb.firebaseio.com'
  }, 'futures'),

  livefutures: firebase.initializeApp({
    ...config,
    databaseURL: 'https://trade-flow-4a5d8-default-rtdb.firebaseio.com'
  }, 'livefutures'),

  blocksfutures: firebase.initializeApp({
    ...config,
    databaseURL: 'https://trade-flow-4a5d8-default-rtdb.firebaseio.com'
  }, 'blocksfutures'),

  trackingfutures: firebase.initializeApp({
    ...config,
    databaseURL: 'https://trade-flow-4a5d8-default-rtdb.firebaseio.com'
  }, 'trackingfutures'),

  blocks: firebase.initializeApp({
    ...config,
    databaseURL: 'https://trade-flow-4a5d8-default-rtdb.firebaseio.com'
  }, 'blocks'),

  tracking: firebase.initializeApp({
    ...config,
    databaseURL: 'https://trade-flow-4a5d8-default-rtdb.firebaseio.com'
  }, 'tracking'),

  twitter: firebase.initializeApp({
    ...config,
    databaseURL: "https://trade-flow-4a5d8-default-rtdb.firebaseio.com"
  }, 'twitter'),

  calendar: firebase.initializeApp({
    ...config,
    databaseURL: "https://trade-flow-4a5d8-default-rtdb.firebaseio.com"
  }, 'calendar'),
});

// --- connect to emulators locally (disabled by default) ---
const shouldUseEmulators = (() => {
  try {
    const qs = new URLSearchParams(window.location.search);
    return qs.get('emulators') === '1' || localStorage.getItem('USE_EMULATORS') === '1';
  } catch (_) { return false }
})();

if (shouldUseEmulators) {
  console.log('⚙️ Connecting Firebase apps to local emulators...');

  const connectToEmulators = (app) => {
    try { app.auth().useEmulator(`http://${EMULATOR_HOST}:${AUTH_PORT}`); } catch (_) {}
    try { app.database().useEmulator(EMULATOR_HOST, DB_PORT); } catch (_) {}
  };

  Object.values(firebaseInstance).forEach((app) => {
    if (app?.auth && app?.database) connectToEmulators(app);
  });
}

// --- sync auth state across specific instances ---
firebase.auth().onIdTokenChanged((user) => {
  [
    firebaseInstance.twitter,
    firebaseInstance.calendar,
  ].forEach((instance) => {
    if (!instance?.auth) return;
    user
      ? instance.auth().updateCurrentUser(user)
      : instance.auth().signOut();
  });
});
