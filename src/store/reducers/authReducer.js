const initState = {
  authError: null,
  signupError: null,
  signupSuccess: false,
  signinProgress: false,
  signupProgress: false,
  signedUpCredentials: {},
  paymentError: null,
  paymentSuccess: false,
  paymentProgress: false
}

const authReducer = (state = initState, action) => {
  switch(action.type){
    case 'LOGIN_ERROR':
      return {
        ...state,
        authError: action.err.message || 'Login failed'
      }
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        authError: null
      }
    case 'SIGNUP_ERROR':
      return {
        ...state,
        signupError: action.err.message || 'Login failed'
      }
    case 'SIGNUP_SUCCESS':
      return {
        ...state,
        signupError: null,
        signupSuccess: true,
        signedUpCredentials: action.userCredential
      }
    case 'PAYMENT_ERROR':
      return {
        ...state,
        paymentError: action.err.message || 'Payment failed',
        paymentProgress: false
      }
    case 'PAYMENT_SUCCESS':
      return {
        ...state,
        paymentError: null,
        paymentSuccess: true,
        paymentProgress: false
      }
    case 'SIGNOUT_SUCCESS':
      return {
        ...state,
        authError: null
      }
    case 'RESET':
      return {
        ...state,
        authError: null
      }
    case 'PROGRESS_IN':
      return {
        ...state,
        signinProgress: true,
      }
    case 'PROGRESS_OUT':
      return {
        ...state,
        signinProgress: false
      }
    case 'SIGNUP_PROGRESS_IN':
      return {
        ...state,
        signupProgress: true,
      }
    case 'SIGNUP_PROGRESS_OUT':
      return {
        ...state,
        signupProgress: false
      }
    case 'PAYMENT_PROGRESS_IN':
      return {
        ...state,
        paymentProgress: true,
      }
    default:
      return state
  }
};

export default authReducer;