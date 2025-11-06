import authReducer from './authReducer'
import chartsReducer from './chartsReducer'
import miscReducer from './miscReducer'
import userReducer from './userReducer'
import { combineReducers } from 'redux'
import { firebaseReducer } from 'react-redux-firebase'

const appReducer = combineReducers({
  auth: authReducer,
  charts: chartsReducer,
  misc: miscReducer,
  user: userReducer,
  firebase: firebaseReducer
})

const rootReducer = (state, action) => {
  if (action.type === 'USER_LOGGEDOUT') {
    return appReducer(undefined, action)
  }

  return appReducer(state, action)
}

export default rootReducer