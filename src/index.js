import 'react-app-polyfill/ie11'; // For IE 11 support
import 'react-app-polyfill/stable';
import 'core-js';
import './polyfill'
import React from 'react';
import ReactDOM from 'react-dom';
// Import as namespace and resolve default to avoid bundler interop issues
import * as firebaseNS from 'firebase/app';
import 'firebase/auth';
import 'firebase/database';
import App from './App';
//import * as serviceWorker from './serviceWorker';

import { icons } from './assets/icons'
import { firebaseInstance } from './utilities/Firebase'

import { Provider } from 'react-redux'
import { createStore, applyMiddleware, compose } from 'redux'
import rootReducer from './store/reducers/rootReducer'
import thunk from 'redux-thunk'
import { reactReduxFirebase, getFirebase } from 'react-redux-firebase';
import * as Sentry from "@sentry/react";
import { Integrations } from "@sentry/tracing";

for (var key in localStorage) {
  if (key.includes('firebaseio.com')) {
    localStorage.removeItem(key);
  }
}

// Sentry.init({
//   dsn: "https://38e9db4510b943d5bdac8afd926390d7@o1028368.ingest.sentry.io/5995727",
//   integrations: [new Integrations.BrowserTracing()],
//   tracesSampleRate: 1.0,
// });

// Choose firebase library object; unwrap default export if present
let firebaseLib = (firebaseNS && (firebaseNS.default || firebaseNS));
try {
  if (firebaseLib && firebaseLib.default && !firebaseLib.SDK_VERSION) {
    firebaseLib = firebaseLib.default;
  }
} catch (_) {}
// Force SDK_VERSION fallback to prevent enhancer crash
if (!firebaseLib.SDK_VERSION) {
  firebaseLib.SDK_VERSION = '8.10.1';
  // eslint-disable-next-line no-console
  console.warn('[bootstrap] Injected fallback SDK_VERSION on firebaseLib');
}
// eslint-disable-next-line no-console
console.debug('[init] firebaseLib keys:', Object.keys(firebaseLib || {}));

// Wrap the library into an object with `firebase_` to satisfy rrf v2 shape check
const firebaseForRRF = { firebase_: firebaseLib };

// Safe wrapper around reactReduxFirebase to prevent hard crash during bootstrap
function safeReactReduxFirebase(param, config){
  try {
    return reactReduxFirebase(param, config);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[bootstrap] reactReduxFirebase init failed, continuing without RRF:', err);
    if (typeof window !== 'undefined') {
      window.__RRF_INIT_FAILED__ = String(err && err.message || err);
    }
    // no-op enhancer
    return (next) => next;
  }
}

const store = createStore(
  rootReducer,
  compose(
    applyMiddleware(thunk.withExtraArgument({ getFirebase })),
    safeReactReduxFirebase(firebaseForRRF, { userProfile: 'users' })
  )
);

React.icons = icons
// Keep legacy global references
React.firebase = firebaseInstance;

// Basic runtime ErrorBoundary to reveal crashes instead of a white screen
class RootErrorBoundary extends React.Component {
  constructor(props){
    super(props);
    this.state = { error: null, info: null };
  }
  componentDidCatch(error, info){
    this.setState({ error, info });
    // eslint-disable-next-line no-console
    console.error('[Runtime ErrorBoundary]', error, info);
  }
  render(){
    const { error, info } = this.state;
    if (error) {
      return (
        <div style={{ padding: '1rem', fontFamily: 'monospace' }}>
          <h2 style={{ color: '#b50000' }}>Application Error</h2>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{String(error.stack || error)}</pre>
          {info && <pre>{JSON.stringify(info, null, 2)}</pre>}
          <p>Remove <code>RootErrorBoundary</code> in <code>src/index.js</code> to disable this overlay.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    // eslint-disable-next-line no-console
    console.error('[window.error]', e.error || e.message);
  });
  window.addEventListener('unhandledrejection', (e) => {
    // eslint-disable-next-line no-console
    console.error('[window.unhandledrejection]', e.reason);
  });
}

ReactDOM.render(
  <RootErrorBoundary>
    <Provider store={store}>
      <App />
    </Provider>
  </RootErrorBoundary>,
  document.getElementById('root')
)