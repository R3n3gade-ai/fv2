import React, { useState, useEffect, useRef } from 'react'
import { connect } from 'react-redux'
import { signIn, passwordReset } from '../../../store/actions/AuthActions'
import { updateProperty } from '../../../store/actions/StylesActions'
import { Redirect } from 'react-router-dom'
import {
  CButton,
  CCard,
  CCardBody,
  CCardGroup,
  CCol,
  CContainer,
  CForm,
  CFormGroup,
  CInput,
  CInputGroup,
  CInputGroupPrepend,
  CInputGroupText,
  CRow,
  CInvalidFeedback,

  CToast,
  CToastBody,
  CToastHeader,
  CToaster,

  CImg,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  TheLoader
} from '../../../containers'

import ReCAPTCHA from 'react-google-recaptcha'

const Login = props => {
  const {
    auth,
    loadedProfile,
    profileInfo,
    authError,
    signinProgress,
    resetError,
    resetSuccess,
    resetProgress,
    userLastRoute,
    userLastSearch,
    signIn,
    passwordReset,
    updateProperty
  } = props

  if (auth.uid && profileInfo.isLoaded) {
    console.log(profileInfo, 'bilal saeed');
    if (profileInfo.paymentStatus == 'Cancelled') {
      return <Redirect to='/account/profile' />
    } else {
      if (userLastRoute != '') {
        return <Redirect to={userLastRoute} />
      } else {
        return <Redirect to='/dashboard' />
      }
    }    
  }

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [validated, setValidated] = useState(false)

  const [loginProgress, setLoginProgress] = useState(false)
  const [resetLoginProgress, setResetLoginProgress] = useState(false)

  const [toasts, setToasts] = useState([])
  const [position, setPosition] = useState('top-center')
  const [autohide, setAutohide] = useState(true)
  const [autohideValue, setAutohideValue] = useState(5000)
  const [closeButton, setCloseButton] = useState(true)
  const [toastStyle, setToastStyle] = useState('bg-danger')
  const [fade, setFade] = useState(true)

  const loginButtonRef = useRef(null)

  const recaptchaRef = React.useRef()
  const [reCaptchaToken, setReCaptchaToken] = useState('')

  useEffect(() => {
    if (authError !== null) {
      setToastStyle('bg-danger')
      addToast('Login Failed', authError)
    }

    if (resetError !== null) {
      setToastStyle('bg-danger')
      addToast('Password Reset Failed', resetError)
    }

    if (resetSuccess !== false) {
      setToastStyle('bg-success')
      addToast('Password Reset', 'Please check your email for password reset instructions')
    }

    window.addEventListener('keyup', onKeyPress)
  }, [authError, resetError, resetSuccess])

  useEffect(() => {
    new React.firebase.firebase.auth.RecaptchaVerifier('recaptcha', { size: 'invisible' })
      .verify()
      .then(setReCaptchaToken);
  }, [])

  useEffect(() => {
    return () => {
      window.removeEventListener('keyup', onKeyPress)
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const user = decodeURIComponent(params.get('user'));
    const pass = decodeURIComponent(params.get('pass'));
    
    if (user && pass) {
      // setEmail(user);
      // setPassword(pass);
      // // Automatically trigger login process here
      // console.log(email, password, user, pass);
      handleAutoLogin(user,pass);
    }
  }, []);

  const handleSubmit = async(event) => {
    event.preventDefault()

    setLoginProgress(true)
    if (reCaptchaToken) {
      const form = event.target.form
      if (form.checkValidity()) {
        signIn({
          email: email,
          password: password
        }) 
      }
  
      setValidated(true)
    }

    setLoginProgress(false)
  }

  const handleAutoLogin = async(user,pass) => {
    setLoginProgress(true);
    console.log(email,password);
        signIn({
          email: user,
          password: pass
        }) 
      setValidated(true)
    setLoginProgress(false)
  }

  const handleForgotPassword = () => {
    if (email == '') {
      setToastStyle('bg-danger')
      addToast('Password reset error', 'Please specify your email in the field !')
    } else {
      setResetLoginProgress(true)
      if (reCaptchaToken) {
        passwordReset(email) 
      }

      setResetLoginProgress(false)
    }
  }

  const addToast = (title, body) => {
    setToasts([
      ...toasts, 
      { 
        position, 
        autohide: autohide && autohideValue, 
        closeButton, 
        fade,
        title: title,
        body: body
      }
    ])
  }

  const onKeyPress = (event) => {
    const keyCode = event.which
    
    if (loginButtonRef.current == null) return

    switch (keyCode) {
      case 13:
        loginButtonRef.current.click()
        break
    }
  }

  const toasters = (()=>{
    return toasts.reduce((toasters, toast) => {
      toasters[toast.position] = toasters[toast.position] || []
      toasters[toast.position].push(toast)
      return toasters
    }, {})
  })()

  return (
    <>
      {!profileInfo.isLoaded && <TheLoader/>}
      <div className="c-app c-dark-theme c-default-layout flex-row align-items-center login-app-bg">
        <CContainer>
          <CRow className="justify-content-center">
            <CCol md="8">
              <CCardGroup>
                <CCard className="p-4">
                  <CCardBody>
                    <CForm noValidate wasValidated={validated} id='loginForm' name='simpleForm'>
                      {/* <ReCAPTCHA
                        ref={recaptchaRef}
                        size='invisible'
                        sitekey='6Lc0PA0gAAAAANf20Pmpa6Mvhmq1UL0H-hnmhf2u'
                      /> */}
                      <div id='recaptcha'></div>

                      <h1 className='text-center'>Login</h1>
                      <p className="text-muted text-center">Sign In to your account</p>
                      <CFormGroup>
                        <CInputGroup className="mb-3">
                          <CInputGroupPrepend>
                            <CInputGroupText>
                              <CIcon name="cil-user" />
                            </CInputGroupText>
                          </CInputGroupPrepend>
                          <CInput 
                            type="email"
                            name="emailAddress"
                            placeholder="Email" 
                            id="emailAddress"
                            onChange={(changedEmail) => setEmail(changedEmail.target.value)}
                            required
                          />
                          <CInvalidFeedback>Invalid Email address</CInvalidFeedback>
                        </CInputGroup>
                      </CFormGroup>
                      <CFormGroup>
                        <CInputGroup className="mb-4">
                          <CInputGroupPrepend>
                            <CInputGroupText>
                              <CIcon name="cil-lock-locked" />
                            </CInputGroupText>
                          </CInputGroupPrepend>
                          <CInput 
                            type="password"
                            name="password"
                            placeholder="Password" 
                            id="password"
                            onChange={(changedPassword) => setPassword(changedPassword.target.value)}
                            required
                          />
                          <CInvalidFeedback>Password required</CInvalidFeedback>
                        </CInputGroup>
                      </CFormGroup>
                      <CRow>
                        <CCol xs="6">
                          <CButton type="button" innerRef={loginButtonRef} onClick={handleSubmit} color="primary" className="px-4"
                            disabled={signinProgress || loginProgress}>{signinProgress || loginProgress ? 'Loading...' : 'Login'}</CButton>
                        </CCol>
                        <CCol xs="6" className="text-right">
                          {(resetProgress || resetLoginProgress) && 
                          <span>Wait a moment please ...</span>}
                          {(!resetProgress || !resetLoginProgress) && 
                          <CButton onClick={handleForgotPassword} color="link" className="px-0">Forgot password?</CButton>}
                        </CCol>
                      </CRow>
                    </CForm>
                  </CCardBody>
                </CCard>
                <CCard className="text-white bg-primary py-5 d-md-down-none" style={{ width: '44%' }}>
                  <CCardBody className="text-center">
                    <div>
                      <h2>Welcome To Flow Trade, Your Unique Trading Assistant</h2>
                    </div>
                  </CCardBody>
                </CCard>
              </CCardGroup>
            </CCol>
            <CCol sm="12" lg="12">
              {Object.keys(toasters).map((toasterKey) => (
                <CToaster
                  position={toasterKey}
                  key={'toaster' + toasterKey}
                >
                  {
                    toasters[toasterKey].map((toast, key)=>{
                    return(
                      <CToast
                        className={toastStyle}
                        key={'toast' + key}
                        show={true}
                        autohide={toast.autohide}
                        fade={toast.fade}
                      >
                        <CToastHeader className={toastStyle} closeButton={toast.closeButton}>
                          {toast.title}
                        </CToastHeader>
                        <CToastBody>
                          {toast.body}
                        </CToastBody>
                      </CToast>
                    )
                  })
                  }
                </CToaster>
              ))}
            </CCol>
          </CRow>
        </CContainer>
      </div>
    </>
  )
}

const mapStateToProps = (state) => {
  return{
    auth: state.firebase.auth,
    loadedProfile: state.firebase.auth.isLoaded,
    profileInfo: state.firebase.profile,
    authError: state.auth.authError,
    signinProgress: state.auth.signinProgress,
    resetError: state.auth.resetError,
    resetSuccess: state.auth.resetSuccess,
    resetProgress: state.auth.resetProgress,
    userLastRoute: state.user.userLastRoute,
    userLastSearch: state.user.userLastSearch
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    signIn: (creds) => dispatch(signIn(creds)),
    passwordReset: (email) => dispatch(passwordReset(email)),
    updateProperty: (propery, type) => dispatch(updateProperty(propery, type))
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Login)