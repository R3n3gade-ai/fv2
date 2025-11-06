const initialState = {
    geoPullApi: null
}

const miscReducer = (state = initialState, { type, ...rest }) => {
  switch (type) {
    case 'misc_set':
      return {...state, ...rest }
    default:
      return state
  }
}

export default miscReducer