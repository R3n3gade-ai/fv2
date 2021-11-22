import React, { useState, useEffect, useRef } from 'react'
import { connect } from 'react-redux'
import { signUp, signIn, signOut } from '../../../store/actions/AuthActions'
import { Link, Redirect } from 'react-router-dom'
import {Elements} from '@stripe/react-stripe-js'
import {loadStripe} from '@stripe/stripe-js'
import {
  CButton,
  CCard,
  CCardBody,
  CCardFooter,
  CCol,
  CContainer,
  CForm,
  CFormGroup,
  CInput,
  CLabel,
  CInvalidFeedback,
  CRow,

  CToast,
  CToastBody,
  CToastHeader,
  CToaster,

  CModal,
  CModalHeader,
  CModalBody
} from '@coreui/react'
import CIcon from '@coreui/icons-react'

import CheckoutForm from '../../components/pages/CheckoutForm'

import { Formik } from 'formik'
import * as Yup from 'yup'
import 'yup-phone'

const stripePromise = loadStripe('pk_test_HDKDEi8pI20UnIW0zhWiyMhU00fBvEqV7v')

const Register = props => {
  const {
    auth,
    loadedProfile,
    signupError,
    signupSuccess,
    signupProgress,
    paymentError,
    paymentSuccess,
    signUp,
    signIn,
    signOut
  } = props

  const [showPaymentModal, setShowPaymentModal] = useState(false)

  const [xpackage, setXpackage] = useState('Trial')
  const [isTestingMode, setIsTestingMode] = useState(true)
  const [isTestingAccount, setIsTestingAccount] = useState(true)
  const [incomingRef, setIncomingRef] = useState('')
  const [refCode, setRefCode] = useState('')
  const [iURL, setIURL] = useState('')
  const [fURL, setFURL] = useState('')
  const [utmSource, setUtmSource] = useState('')
  const [utmList, setUtmList] = useState(19)
  const [funnel, setFunnel] = useState(false)

  const [userPayload, setUserPayload] = useState({})
  const [userCredentials, setUserCredentials] = useState({})

  const [toasts, setToasts] = useState([])
  const [position, setPosition] = useState('top-center')
  const [autohide, setAutohide] = useState(true)
  const [autohideValue, setAutohideValue] = useState(5000)
  const [closeButton, setCloseButton] = useState(true)
  const [fade, setFade] = useState(true)
  const [toastType, setToastType] = useState('bg-danger')

  const finishedRegistration = useRef(false)

  useEffect(() => {
    // signOut()

    if (signupError !== null) {
      setToastType('bg-danger')
      addToast('Signup Failed', signupError)
    }
    if (paymentError !== null) {
      setToastType('bg-danger')
      addToast('Payment Failed', paymentError)
    }

    if (signupSuccess) {
      setShowPaymentModal(true)
    }
    if (paymentSuccess) {
      setShowPaymentModal(false)
      finishedRegistration.current = true
    }


    checkSignupParams()
  }, [signupError, paymentError, signupSuccess, paymentSuccess])

  if (finishedRegistration.current) {
    return <Redirect to='/dashboard' />
  }

  // Notifications Functions
  const addToast = (title, body) => {
    setToasts([
      ...toasts, 
      { 
        position, 
        autohide: autohide && autohideValue, 
        closeButton, 
        fade,
        type: toastType,
        title: title,
        body: body
      }
    ])
  }

  const toasters = (()=>{
    return toasts.reduce((toasters, toast) => {
      toasters[toast.position] = toasters[toast.position] || []
      toasters[toast.position].push(toast)
      return toasters
    }, {})
  })()

  // Form Validations and Submit Functions
  const validationSchema = function (values) {
    return Yup.object().shape({
      firstName: Yup.string()
        .min(2, `First name has to be at least 2 characters`)
        .required('First name is required'),
      lastName: Yup.string()
        .min(1, `Last name has to be at least 1 character`)
        .required('Last name is required'),
      phoneNumber: Yup.string()
        .phone()
        .required('Phone Number is required'),
      email: Yup.string()
        .email('Invalid email address')
        .required('Email is required!'),
      password: Yup.string()
        .min(6, `Password has to be at least ${6} characters!`)
        .matches(/(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,}/, 'Password must contain: numbers, uppercase and lowercase letters\n')
        .required('Password is required'),
      confirmPassword: Yup.string()
        .oneOf([values.password], 'Passwords must match')
        .required('Password confirmation is required'),
    })
  }

  const validate = (getValidationSchema) => {
    return async(values) => {
      const validationSchema = getValidationSchema(values)
      let returnedErrors = {}
      await validationSchema.validate(values, { abortEarly: false })
        .then(() => {
        })
        .catch(error => {
          returnedErrors = getErrorsFromValidationError(error)
        })

      return returnedErrors
    }
  }

  const getErrorsFromValidationError = (validationError) => {
    const FIRST_ERROR = 0
    return validationError.inner.reduce((errors, error) => {
      return {
        ...errors,
        [error.path]: error.errors[FIRST_ERROR],
      }
    }, {})
  }

  const initialValues = {
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: ''
  }

  const onSubmit = (values, { setSubmitting, setErrors }) => {
    let initialPayload = {
      fURL: fURL,
      chatWidth:'Half',
      passwordShow: false,
      verifyShow: false,
      entrancePath: 'Trial',
      fromCancel: false,
      alreadyLoggedIn: false,
      funnel: funnel,
      refCode: refCode,
      utmSource: utmSource,
      xpackage: xpackage,
      incomingURL: iURL,
      progress: 1,
      signupComplete: false,
      state: {value: '', label: ''},
      city: '',
      address: '',
      validUserName: true,
      country: {value: '', label: ''},
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      emailExists: false,
      phoneNumber: values.phoneNumber,
      phoneCode: 1,
      userImage: '../images/avatarplaceholder.png',
      fourview: false,
      credits: 0,
      signUpTime: new Date().getTime(),
      trialExpires: new Date().getTime() + (7 * 24 * 60 * 60 * 1000),
      testingMode: isTestingMode,
      testAccount: isTestingAccount,
      utmList: utmList,
      showTour: true
    }

    setUserCredentials({
      email: values.email,
      password: values.password
    })
    setUserPayload(initialPayload)
    signUp(values, initialPayload)
  }

  const findFirstError = (formName, hasError) => {
    const form = document.forms[formName]
    for (let i = 0; i < form.length; i++) {
      if (hasError(form[i].name)) {
        form[i].focus()
        break
      }
    }
  }

  const validateForm = (errors) => {
    findFirstError('simpleForm', (fieldName) => {
      return Boolean(errors[fieldName])
    })
  }

  const touchAll = (setTouched, errors) => {
    setTouched({
      firstName: true,
      lastName: true,
      phoneNumber: true,
      email: true,
      password: true,
      confirmPassword: true
    })
    validateForm(errors)
  }

  // Misc Functions

  const checkSignupParams = () => {
    let parsed = {}

    try {
      parsed = queryString.parse(window.top.location.search)
    } catch(e) {}

    if (parsed.pid == 'BasePackage') {
      setXpackage('Regular')
    }
    if (parsed.pid == 'YearlyPackage') {
      setXpackage('Yearly')
    }
    if (parsed.testingMode) {
      setIsTestingMode(true)
    }
    if (getCookie('refCode') != '') {
      setIncomingRef(getCookie('refCode'))
      setRefCode(getCookie('refCode'))
    }
    if (parsed.Ref) {
      setIncomingRef(parsed.Ref)
      setRefCode(parsed.Ref)
      if (getCookie('refCode') != 'Marketing') {
        setCookie('refCode', incomingRef, 7)
      }
    }
    if (parsed.Funnel == 'true') {
      setFunnel(true)
    }
    if (getCookie('incomingURL') != '') {
      setIURL(getCookie('incomingURL'))
    }
    if (getCookie('firstURL') != '') {
      setFURL(getCookie('firstURL'))
    }
    if (getCookie('utmSource') != '') {
      setUtmSource(getCookie("utmSource"))
    }
    if (getCookie('utmList') != '') {
      setUtmList(parseInt(getCookie('utmList')))
    }
  }

  const setCookie = (cname, cvalue, exdays) => {
      var d = new Date()
      d.setTime(d.getTime() + exdays * 24 * 60 * 60 * 1000)
      var expires = 'expires=' + d.toUTCString()
      document.cookie = cname + '=' + cvalue + ';' + expires + ';path=/'
  }

  const getCookie = (cname) => {
    var name = cname + '='
    var ca = document.cookie.split(';')
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i]
        while (c.charAt(0) == ' ') {
            c = c.substring(1)
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length)
        }
    }

    return ''
  } 

  return (
    <div className="c-app c-dark-theme c-default-layout flex-row align-items-center login-app-bg">
      <>
        <CContainer>
          <CRow className="justify-content-center">
            <CCol md="9" lg="7" xl="6">
              <CCard className="mx-4">
                <CCardBody className="p-4">
                  <Formik
                    initialValues={initialValues}
                    validate={validate(validationSchema)}
                    onSubmit={onSubmit}
                  >
                    {
                      ({
                        values,
                        errors,
                        touched,
                        status,
                        dirty,
                        handleChange,
                        handleBlur,
                        handleSubmit,
                        isSubmitting,
                        isValid,
                        handleReset,
                        setTouched
                      }) => (
                        <CForm onSubmit={handleSubmit} noValidate name='simpleForm'>
                          <h1 className='text-center'>Register</h1>
                          <p className="text-muted text-center">Create your account</p>
                          <CRow>
                            <CCol sm="12" md="6" lg="6" xl="6">
                              <CFormGroup>
                                <CLabel htmlFor="firstName">First Name</CLabel>
                                <CInput type="text"
                                        name="firstName"
                                        id="firstName"
                                        // placeholder="First Name"
                                        autoComplete="given-name"
                                        valid={touched.firstName && !errors.firstName}
                                        invalid={touched.firstName && !!errors.firstName}
                                        // autoFocus={true}
                                        required
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        value={values.firstName} />
                                <CInvalidFeedback>{errors.firstName}</CInvalidFeedback>
                              </CFormGroup>
                            </CCol>
                            <CCol sm="12" md="6" lg="6" xl="6">
                              <CFormGroup>
                                <CLabel htmlFor="lastName">Last Name</CLabel>
                                <CInput type="text"
                                        name="lastName"
                                        id="lastName"
                                        // placeholder="Last Name"
                                        autoComplete="family-name"
                                        valid={touched.lastName && !errors.lastName}
                                        invalid={touched.lastName && !!errors.lastName}
                                        required
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        value={values.lastName} />
                                <CInvalidFeedback>{errors.lastName}</CInvalidFeedback>
                              </CFormGroup>
                            </CCol>
                            <CCol sm="12" md="6" lg="6" xl="6">
                              <CFormGroup>
                                <CLabel htmlFor="phoneNumber">Phone Number</CLabel>
                                <CInput type="text"
                                        name="phoneNumber"
                                        id="phoneNumber"
                                        // placeholder="Phone Number"
                                        autoComplete="phone-number"
                                        valid={touched.phoneNumber && !errors.phoneNumber}
                                        invalid={touched.phoneNumber && !!errors.phoneNumber}
                                        required
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        value={values.phoneNumber} />
                                <CInvalidFeedback>{errors.phoneNumber}</CInvalidFeedback>
                              </CFormGroup>
                            </CCol>
                            <CCol sm="12" md="6" lg="6" xl="6">
                              <CFormGroup>
                                <CLabel htmlFor="email">Email Address</CLabel>
                                <CInput type="email"
                                        name="email"
                                        id="email"
                                        // placeholder="Email"
                                        autoComplete="email"
                                        valid={touched.email && !errors.email}
                                        invalid={touched.email && !!errors.email}
                                        required
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        value={values.email} />
                                <CInvalidFeedback>{errors.email}</CInvalidFeedback>
                              </CFormGroup>
                            </CCol>
                            <CCol sm="12" md="6" lg="6" xl="6">
                              <CFormGroup>
                                <CLabel htmlFor="password">Password</CLabel>
                                <CInput type="password"
                                        name="password"
                                        id="password"
                                        // placeholder="Password"
                                        autoComplete="new-password"
                                        valid={touched.password && !errors.password}
                                        invalid={touched.password && !!errors.password}
                                        required
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        value={values.password} />
                                <CInvalidFeedback>{errors.password}</CInvalidFeedback>
                              </CFormGroup>
                            </CCol>
                            <CCol sm="12" md="6" lg="6" xl="6">
                              <CFormGroup>
                                <CLabel htmlFor="confirmPassword">Confirm Password</CLabel>
                                <CInput type="password"
                                        name="confirmPassword"
                                        id="confirmPassword"
                                        // placeholder="Confirm password"
                                        autoComplete="new-password"
                                        valid={touched.confirmPassword && !errors.confirmPassword}
                                        invalid={touched.confirmPassword && !!errors.confirmPassword}
                                        required
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        value={values.confirmPassword} />
                                <CInvalidFeedback>{errors.confirmPassword}</CInvalidFeedback>
                              </CFormGroup>
                            </CCol>
                          </CRow>
                          <CButton type="submit" color="primary" className="mr-1 mt-3" 
                            disabled={signupProgress || !isValid} block>{signupProgress ? 'Loading...' : 'Create Account'}</CButton>
                        </CForm>
                      )}
                  </Formik>
                </CCardBody>
              </CCard>
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
                        className={toast.type}
                        key={'toast' + key}
                        show={true}
                        autohide={toast.autohide}
                        fade={toast.fade}
                      >
                        <CToastHeader className='bg-danger' closeButton={toast.closeButton}>
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
        <CModal
          show={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false)
          }}
          //onOpened={() => alert('opened')}
          closeOnBackdrop={false}
          size='lg'
          className='checkout_modal'
        >
          <CModalHeader className='h5 mb-0' closeButton={false}>Complete Registration</CModalHeader>
          <CModalBody className=''>
            <Elements stripe={stripePromise} options={{}}>
              <CheckoutForm userPayload={userPayload} />
            </Elements>
          </CModalBody>
        </CModal>
      </>
    </div>
  )
}

const mapStateToProps = (state) => {
  return{
    auth: state.firebase.auth,
    loadedProfile: state.firebase.auth.isLoaded,
    signupError: state.auth.signupError,
    signupSuccess: state.auth.signupSuccess,
    signupProgress: state.auth.signupProgress,
    paymentError: state.auth.paymentError,
    paymentSuccess: state.auth.paymentSuccess
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    signUp: (credentials, userData) => dispatch(signUp(credentials, userData)),
    signIn: (creds) => dispatch(signIn(creds)),
    signOut: () => dispatch(signOut())
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Register)