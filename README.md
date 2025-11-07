# Flowtrade local setup (Windows)

This project is a Webpack-powered React app with Firebase emulators and optional Express static server.

CI note: trigger deploy at {{timestamp}}.

Prereqs
- Node.js 14.x (recommended 14.21.3). Newer Node versions (18/20/22/24) will fail due to node-sass from legacy deps.
- npm 6/7/8 (comes with Node 14)
- Git (optional)

Install Node 14 with nvm-windows
1) If you have Node >=18 installed, switch to Node 14. If you don't have nvm, install it: https://github.com/coreybutler/nvm-windows/releases
2) In PowerShell (as your user):

```
nvm install 14.21.3
nvm use 14.21.3
node -v
npm -v
```

Install dependencies
From the project root `fv2-bilalbranch` (the one that contains `package.json`, `webpack.config.js`):

```
# install root deps (legacy peers to avoid older libs conflicts)
npm install --legacy-peer-deps

# install Firebase functions deps
npm install --prefix functions --legacy-peer-deps
```

Run Firebase emulators (optional but recommended)
You can use npx (no global install) or install firebase-tools globally.

```
# with npx
npx firebase emulators:start --import ./emulator-data --export-on-exit ./emulator-data

# or install globally (optional)
npm install -g firebase-tools
firebase emulators:start --import ./emulator-data --export-on-exit ./emulator-data
```
- Emulator UI: http://localhost:4001
- Auth: 9099, Realtime DB: 9001, Firestore: 8081, Functions: 9002

Start the app (development)

```
# starts webpack-dev-server with HMR
npm start
```
- Default dev URL (webpack-dev-server): http://localhost:8080

Serve the production build locally (optional)
A prebuilt `build/` folder exists; you can serve it with Express:

```
# if not already installed above
npm install --legacy-peer-deps

# run the static server
node server.js
```
- Express server URL: http://localhost:3000

Build the app (optional)

```
npm run build
```

Notes
- If ports are in use, change them in `firebase.json` (emulators) or pass `--port` to webpack dev server.
- If Windows firewall prompts for access, allow it for the emulator ports and webpack dev server.
- The local library `@t0x1c3500/react-stockcharts` is installed from the repo; no extra steps are required.
