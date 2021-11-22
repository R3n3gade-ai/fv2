const initState = {
    updateProfileError: null
}

const userReducer = (state = initState, action) => {
  switch(action.type){
    case 'UPDATE_ERROR':
      return {
        ...state,
        updateProfileError: action.err.message || 'Updating Failed'
      }
    case 'UPDATE_RESET':
      return {
        ...state,
        updateProfileError: null
      }
    default:
      return state
  }
}

export default userReducer