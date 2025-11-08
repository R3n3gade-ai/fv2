import authReducer from './authReducer'
import chartsReducer from './chartsReducer'
import miscReducer from './miscReducer'
import userReducer from './userReducer'
import { combineReducers } from 'redux'

// Lightweight replacement for react-redux-firebase's firebaseReducer to avoid SDK_VERSION crash.
// Provides the minimal shape accessed by components: auth, profile, data.
const initialFirebaseState = {
  auth: { isLoaded: true, uid: null },
  profile: { isEmpty: true },
  data: {
    favoritesv2: null,
    defaultv2: null,
    cancelledv2: null,
  }
};

function firebaseLiteReducer(state = initialFirebaseState, action) {
  switch (action.type) {
    case 'FIREBASE_AUTH_UPDATE': {
      const uid = action.payload ? action.payload.uid : null;
      return {
        ...state,
        auth: { isLoaded: true, uid }
      };
    }
    case 'FIREBASE_PROFILE_UPDATE': {
      const profile = action.payload || {};
      return {
        ...state,
        profile: { ...profile, isEmpty: Object.keys(profile).length === 0 }
      };
    }
    case 'FIREBASE_DATA_UPDATE': {
      return {
        ...state,
        data: { ...state.data, ...action.payload }
      };
    }
    default:
      return state;
  }
}

const appReducer = combineReducers({
  auth: authReducer,
  charts: chartsReducer,
  misc: miscReducer,
  user: userReducer,
  firebase: firebaseLiteReducer
})

const rootReducer = (state, action) => {
  if (action.type === 'USER_LOGGEDOUT') {
    return appReducer(undefined, action)
  }

  return appReducer(state, action)
}

export default rootReducer