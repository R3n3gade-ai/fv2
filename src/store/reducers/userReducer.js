const initState = {
    updateProfileError: null,
    updateInProgress: false,
    updateProfileSuccess: false,
    userHasCancelled: false,
    userLastRoute: '',
    userLastSearch: '',
    discordInfo: false
}

const userReducer = (state = initState, action) => {
  switch(action.type){
    case 'UPDATE_ERROR':
      return {
        ...state,
        updateProfileError: action.err.message || 'Updating Failed'
      }
    case 'UPDATE_SUCESS':
      return {
        ...state,
        updateProfileSuccess: true
      }
    case 'UPDATE_IN_PROGRESS':
      return {
        ...state,
        updateInProgress: true
      }
    case 'UPDATE_DONE':
      return {
        ...state,
        updateInProgress: false,
        updateProfileSuccess: false,
        updateProfileError: null
      }
    case 'UPDATE_RESET':
      return {
        ...state,
        updateProfileError: null
      }
    case 'set':
      const {
        actionType, ...rest
      } = action
      return {...state, ...rest }
    default:
      return state
  }
}

export default userReducer