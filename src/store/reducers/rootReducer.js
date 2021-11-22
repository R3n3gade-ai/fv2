import authReducer from './authReducer'
import chartsReducer from './chartsReducer'
import miscReducer from './miscReducer'
import userReducer from './userReducer'
import { combineReducers } from 'redux'
import { firebaseReducer } from 'react-redux-firebase'

const rootReducer = combineReducers({
  auth: authReducer,
  charts: chartsReducer,
  misc: miscReducer,
  user: userReducer,
  firebase: firebaseReducer
})

export default rootReducer