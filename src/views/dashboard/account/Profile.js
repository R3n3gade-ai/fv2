import React, { useState, useEffect, useRef } from 'react'
import { compose } from 'redux'
import { connect } from 'react-redux'
import { updateProperty } from '../../../store/actions/StylesActions'
import { EditProfile } from '../../../store/actions/UserActions'
import { passwordReset, resubscribeUser } from '../../../store/actions/AuthActions'
import { 
  getGeoToken, 
  getGeoCountry, 
  getGeoState, 
  getGeoCity 
} from '../../../store/actions/MiscActions'
import {
  CButton,
  CCard,
  CCardHeader,
  CCardBody,
  CCol,
  CForm,
  CFormGroup,
  CInput,
  CLabel,
  CInvalidFeedback,
  CRow,
  CImg,

  CModal,
  CModalHeader,
  CModalBody,
  CModalFooter,

  CToast,
  CToastBody,
  CToastHeader,
  CToaster,

  CSelect,

  CBadge,
  CListGroup,
  CListGroupItem,

  CSwitch
} from '@coreui/react'
import CIcon from '@coreui/icons-react'

import { LiveChatWidget } from "@livechat/widget-react"
import queryString from 'query-string'

import { Formik } from 'formik'
import * as Yup from 'yup'
import 'yup-phone'

const Profile = props => {
    const {
        auth,
        updateProfileError,
        updateProfileSuccess,
        profileInfo,
        updateInProgress,
        userLastSearch,
        resetError,
        resetSuccess,
        resetProgress,
        userHasCancelled,
        discordInfo,
        resubscribeError,
        resubscribeSuccess,
        resubscribeProgress,
        geoPullApi,
        updateProperty,
        EditProfile,
        passwordReset,
        resubscribeUser,
        getGeoToken,
        getGeoCountry,
        getGeoState,
        getGeoCity
    } = props

    const [toasts, setToasts] = useState([])
    const [position, setPosition] = useState('top-center')
    const [autohide, setAutohide] = useState(true)
    const [autohideValue, setAutohideValue] = useState(5000)
    const [closeButton, setCloseButton] = useState(true)
    const [fade, setFade] = useState(true)
    const [toastType, setToastType] = useState('bg-danger')

    const [selectedCountry, setSelectedCountry] = useState('-1')
    const [selectedState, setSelectedState] = useState('-1')
    const [selectedCity, setSelectedCity] = useState('-1')

    const [showConfirmationModal, setShowConfirmationModal] = useState(false)

    const useGeoApi = useRef(false)
    const useCountryApi = useRef(false)
    const useStateApi = useRef(false)
    const useCityApi = useRef(false)

    const [billingLinkProgress, setBillingLinkProgress] = useState(false)
    const [linkingDiscord, setLinkingDiscord] = useState(false)
    const [unlinkingDiscord, setUnlinkingDiscord] = useState(false)

    const [reSubscribeValue, setResubscribeValue] = useState(true)

    useEffect(async() => {
        if (geoPullApi == null) {
            getGeoToken()
        } else {
            useGeoApi.current = true

            const getAsyncCountries = new Promise(async(resolve, reject) => {
                if (useCountryApi.current == false) {
                    if (typeof profileInfo.country === 'object' && profileInfo.country !== null) {
                        const geoCountries = await getGeoCountry()
                        if (geoCountries !== false && geoCountries.length > 0) {
                            if ( geoCountries.some((countryObject, index) => {
                                return countryObject.country_short_name.toLowerCase() == profileInfo.country.value.toLowerCase()
                            }) ) {
                                useCountryApi.current = geoCountries
                                setSelectedCountry(profileInfo.country.value.toLowerCase())
                                resolve(profileInfo.country.label || profileInfo.country.value)
                            } else {
                                setSelectedCountry(profileInfo.country.label || profileInfo.country.value)
                                resolve(profileInfo.country.label || profileInfo.country.value)
                            }
                        } else {
                            setSelectedCountry(profileInfo.country.label || profileInfo.country.value)
                            resolve(profileInfo.country.label || profileInfo.country.value)
                        }
                    } else {
                        setSelectedCountry(profileInfo.country)
                        resolve(profileInfo.country)                       
                    }
                } else {
                    resolve(false)
                }
            })
            const selectedGotCountry = await getAsyncCountries

            const getAsyncStates = new Promise(async(resolve, reject) => {
                if (useStateApi.current == false) {
                    if (typeof profileInfo.state === 'object' && profileInfo.state !== null && selectedGotCountry !== false) {
                        const geoStates = await getGeoState(selectedGotCountry)
                        if (geoStates !== false && geoStates.length > 0) {
                            if ( geoStates.some((stateObject, index) => {
                                return stateObject.state_name == profileInfo.state.value
                            }) ) {
                                useStateApi.current = geoStates
                                setSelectedState(profileInfo.state.value)
                            } else {
                                setSelectedState(profileInfo.state.label || profileInfo.state.value)
                                resolve(profileInfo.state.label || profileInfo.state.value)
                            }
                        } else {
                            setSelectedState(profileInfo.state.label || profileInfo.state.value)
                            resolve(profileInfo.state.label || profileInfo.state.value)
                        }
                    } else {
                        setSelectedState(profileInfo.state)
                        resolve(profileInfo.state)
                    }
                } else {
                    resolve(false)
                }
            })
            const selectedGotSate = await getAsyncStates

            const getAsyncCities = new Promise(async(resolve, reject) => {
                if (useCityApi.current == false) {
                    if (typeof profileInfo.city === 'object' && profileInfo.city !== null && selectedGotSate !== false) {
                        const geoCities = await getGeoCity(selectedGotSate)
                        if (geoCities !== false && geoCities.length > 0) {
                            if ( geoCities.some((cityObject, index) => {
                                return cityObject.city_name == profileInfo.city.value
                            }) ) {
                                useCityApi.current = geoCities
                                setSelectedCity(profileInfo.city.value)
                            } else {
                                setSelectedCity(profileInfo.city.label || profileInfo.city.value)
                                resolve(profileInfo.city.label || profileInfo.city.value)
                            }
                        } else {
                            setSelectedCity(profileInfo.city.label || profileInfo.city.value)
                            resolve(profileInfo.city.label || profileInfo.city.value)
                        }
                    } else {
                        setSelectedCity(profileInfo.city)
                        resolve(profileInfo.city)
                    }
                } else {
                    resolve(false)
                }
            })
            await getAsyncCities
        }
    }, [geoPullApi])

    useEffect(() => {
        if (typeof profileInfo.discordCodeRevoke !== typeof undefined) {
            setUnlinkingDiscord(true)
        } else {
            setUnlinkingDiscord(false)
        }

        if (typeof profileInfo.discordError !== typeof undefined) {
            setToastType('bg-danger')
            addToast('Discord Error', discordError)

            EditProfile({
                discordError: null
            })
            setLinkingDiscord(false)
            setUnlinkingDiscord(false)
        }
    }, [profileInfo])

    useEffect(() => {
        if (userLastSearch !== '') {
            setLinkingDiscord(true)
            let discordQuery = queryString.parse(userLastSearch, true)

            if ('code' in discordQuery && discordQuery.code != '') {
                EditProfile({
                    discordCode: discordQuery.code
                })
            } else {
                setLinkingDiscord(false)
            }

            updateProperty({userLastSearch: ''})
        }

        if (discordInfo !== false) {
            setLinkingDiscord(false)
        } else {
            setUnlinkingDiscord(false)
        }
    }, [userLastSearch, discordInfo])

    useEffect(() => {
        if (resetError !== null) {
            setToastType('bg-danger')
            addToast('Password Reset Failed', resetError)
          }
      
          if (resetSuccess !== false) {
            setToastType('bg-success')
            addToast('Password Reset', 'Please check your email for password reset instructions')
          }
    }, [resetError, resetSuccess])

    useEffect(() => {
        if (updateProfileError !== null) {
            setToastType('bg-danger')
            addToast('Error', updateProfileError)
          }

          if (updateProfileSuccess !== false) {
            setToastType('bg-success')
            addToast('Profile Update', 'Your profile information has been updated !')
          }
    }, [updateProfileError, updateProfileSuccess])

    useEffect(() => {
        if (resubscribeError !== null) {
            setToastType('bg-danger')
            addToast('Error', resubscribeError)
          }

          if (resubscribeSuccess !== false) {
            window.location.assign(resubscribeSuccess)
          }
    }, [resubscribeError, resubscribeSuccess])
    
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
                .required('Phone Number is required')
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
        firstName: typeof profileInfo.firstName !== typeof undefined ? profileInfo.firstName : '',
        lastName: typeof profileInfo.lastName !== typeof undefined ? profileInfo.lastName : '',
        userOrganization: typeof profileInfo.organization !== typeof undefined ? profileInfo.organization : '',
        phoneNumber: typeof profileInfo.phoneNumber !== typeof undefined ? profileInfo.phoneNumber : '',
        selectedCountry: selectedCountry,
        selectedState: selectedState,
        selectedCity: selectedCity,
        zipCode: typeof profileInfo.zip !== typeof undefined ? profileInfo.zip : '',
        address: typeof profileInfo.address !== typeof undefined ? profileInfo.address : ''
    }

    const onSubmit = (values, { setSubmitting, setErrors }) => {
        let initialValues = {
            address: values.address,
            firstName: values.firstName,
            lastName: values.lastName,
            phoneNumber: values.phoneNumber,
            organization: values.userOrganization,
            zip: values.zipCode
        }

        let initialCountry
        if (useCountryApi.current !== false) {
            let foundCountry = useCountryApi.current.find(x => x.country_short_name.toLowerCase() == selectedCountry)
            if (typeof foundCountry != typeof undefined) {
                initialCountry = {
                    'label': foundCountry.country_name || '',
                    'value': foundCountry.country_short_name || ''
                }
            } else {
                initialCountry = selectedCountry
            }
        } else {
            initialCountry = selectedCountry
        }

        let initialState
        if (useStateApi.current !== false) {
            let foundState = useStateApi.current.find(x => x.city_name == selectedState)
            if (typeof foundState != typeof undefined) {
                initialState = {
                    'label': foundState.state_name || '',
                    'value': foundState.state_name || ''
                }
            } else {
                initialState = selectedState
            }
        } else {
            initialState = selectedState
        }

        let initialCity
        if (useCityApi.current !== false) {
            let foundCity = useCityApi.current.find(x => x.city_name == selectedCity)
            if (typeof foundCity != typeof undefined) {
                initialCity = {
                    'label': foundCity.city_name || '',
                    'value': foundCity.city_name || ''
                }
            } else {
                initialCity = selectedCity
            }
        } else {
            initialCity = selectedCity
        }

        initialValues = {
            ...initialValues,
            ...{
                country: initialCountry,
                city: initialCity,
                state: initialState
            }
        }

        EditProfile(initialValues)
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
            phoneNumber: true
        })
        validateForm(errors)
    }

    // Account Actions
    const generateBillingLink = async() => {
        setBillingLinkProgress(true)
        try {
            const functionRef = React.firebase.firebase
                .app()
                .functions('us-central1')
                .httpsCallable('ext-firestore-stripe-payments-createPortalLink')
            
            const { data } = await functionRef({ returnUrl: window.location.origin });
            window.location.assign(data.url);
        } catch(e) {
            alert('something went wrong')
            setBillingLinkProgress(false)
        }
    }

    const handleForgotPassword = () => {
        let user = React.firebase.firebase.auth().currentUser
        if (typeof user != typeof undefined && 'email' in user) {
            passwordReset(user.email)
        }
    }

    const unlinkDiscordAccount = () => {
        setUnlinkingDiscord(true)

        EditProfile({
            discordCodeRevoke: true
        })  
    }

    const preResubscribeUser = () => {
        const checkoutSession = {
            line_items: [{
                price: reSubscribeValue ? 'price_1KTqRLD48AfiHVvU6GSQOFCD' : 'price_1HWBeeD48AfiHVvUKs7scuuN',
                quantity: 1
            }],
            success_url: 'http://localhost:8080',
            cancel_url: 'http://localhost:8080',
            metadata: {
                userUid: auth.uid
            },
            subscription_data: [
                {
                    metadata: {
                        renewSubscription: true,
                        renewPeriod: reSubscribeValue ? 'Monthly' : 'Yearly',
                        newCheckout: true,
                        userUid: auth.uid,
                        email: profileInfo.email,
                        first_name: profileInfo.firstName || '',
                        last_name: profileInfo.lastName || '',
                        incoming_request: 'Resubscribed From Platform',
                    },
                }
            ],
        }

        resubscribeUser(checkoutSession)
    }

    return (
        <>
        <CCardBody>
            <CRow>
                <CCol sm="12" md="8" lg="8" xl="8">
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
                                <CRow>
                                    <CCol sm="12" md="12" lg="12" xl="12">
                                        <CCard>
                                            <CCardHeader>
                                                <h4 className="card-title mb-0">Account Information</h4>
                                            </CCardHeader>
                                            <CCardBody>
                                                <CRow>
                                                    <CCol sm="12" md="12" lg="12" xl="12">
                                                        <div className='mb-3 d-flex flex-direction-row justify-content-between'>
                                                            <div className='d-flex align-items-center'>
                                                                <div className='c-avatar mr-3' style={{width: 45, height: 45}}>
                                                                    <CImg
                                                                        src={'https://flowtrade.com/images/avatarplaceholder.png'}
                                                                        className='c-avatar-img'
                                                                    />
                                                                </div>
                                                                <h3 className=''>{profileInfo.email}</h3>
                                                            </div>
                                                        </div>
                                                    </CCol>
                                                </CRow>
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
                                                            <CLabel htmlFor="userOrganization">Organization</CLabel>
                                                            <CInput type="text"
                                                                    name="userOrganization"
                                                                    id="userOrganization"
                                                                    // placeholder="Email"
                                                                    autoComplete="userOrganization"
                                                                    valid={touched.userOrganization && !errors.userOrganization}
                                                                    invalid={touched.userOrganization && !!errors.userOrganization}
                                                                    required
                                                                    onChange={handleChange}
                                                                    onBlur={handleBlur}
                                                                    value={values.userOrganization} />
                                                            <CInvalidFeedback>{errors.userOrganization}</CInvalidFeedback>
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
                                                            <CLabel htmlFor="selectedCountry">Country</CLabel>
                                                            { ( useGeoApi.current && useCountryApi.current ) && 
                                                                ( <CSelect 
                                                                    onChange={(event) => {
                                                                        gotCountry(event)
                                                                        setSelectedCountry(event.target.value)
                                                                        setFieldValue('selectedCountry', event.target.value)
                                                                    }} 
                                                                    valid={touched.selectedCountry && !errors.selectedCountry}
                                                                    invalid={touched.selectedCountry && !!errors.selectedCountry}
                                                                    name='selectedCountry' 
                                                                    id='selectedCountry'
                                                                    value={selectedCountry}
                                                                    custom required>
                                                                <option key='-1' value='-1' disabled>Country</option>
                                                                {useCountryApi.current.map((countryObject, index) => {
                                                                    return <option key={index} value={countryObject.country_short_name.toLowerCase()}>{countryObject.country_name}</option>
                                                                })}
                                                                </CSelect> ) ||
                                                                <CInput type='text'
                                                                        name='selectedCountry'
                                                                        id='selectedCountry'
                                                                        placeholder='Country'
                                                                        valid={touched.selectedCountry && !errors.selectedCountry}
                                                                        invalid={touched.selectedCountry && !!errors.selectedCountry}
                                                                        required
                                                                        onChange={(event) => {
                                                                            setSelectedCountry(event.target.value)
                                                                            handleChange(event)
                                                                        }}
                                                                        onBlur={handleBlur}
                                                                        value={selectedCountry == '-1' ? '' : selectedCountry} />
                                                            }
                                                            <CInvalidFeedback>{errors.selectedCountry}</CInvalidFeedback>
                                                        </CFormGroup>
                                                    </CCol>
                                                    <CCol sm="12" md="6" lg="6" xl="6">
                                                        <CFormGroup>
                                                            <CLabel htmlFor="selectedState">State</CLabel>
                                                            { ( useGeoApi.current && useStateApi.current ) && 
                                                                ( <CSelect 
                                                                    onChange={(event) => {
                                                                        gotState(event)
                                                                        setSelectedState(event.target.value)
                                                                        setFieldValue('selectedState', event.target.value)
                                                                    }} 
                                                                    valid={touched.selectedState && !errors.selectedState}
                                                                    invalid={touched.selectedState && !!errors.selectedState}
                                                                    name='selectedState' 
                                                                    id='selectedState' 
                                                                    value={selectedState}
                                                                    custom required>
                                                                <option key='-1' value='-1' disabled>State</option>
                                                                {useStateApi.current.map((stateObject, index) => {
                                                                    return <option key={index} value={stateObject.state_name}>{stateObject.state_name}</option>
                                                                })}
                                                                </CSelect> ) ||
                                                                <CInput type='text'
                                                                        name='selectedState'
                                                                        id='selectedState'
                                                                        placeholder='State'
                                                                        valid={touched.selectedState && !errors.selectedState}
                                                                        invalid={touched.selectedState && !!errors.selectedState}
                                                                        required
                                                                        onChange={(event) => {
                                                                            setSelectedState(event.target.value)
                                                                            handleChange(event)
                                                                        }}
                                                                        onBlur={handleBlur}
                                                                        value={selectedState == '-1' ? '' : selectedState} />
                                                            }
                                                            <CInvalidFeedback>{errors.selectedState}</CInvalidFeedback>
                                                        </CFormGroup>
                                                    </CCol>
                                                    <CCol sm="12" md="6" lg="6" xl="6">
                                                        <CFormGroup>
                                                            <CLabel htmlFor="selectedCity">City</CLabel>
                                                            { ( useGeoApi.current && useCityApi.current ) && 
                                                                ( <CSelect 
                                                                    onChange={(event) => {
                                                                        setSelectedCity(event.target.value)
                                                                        setFieldValue('selectedCity', event.target.value)
                                                                    }} 
                                                                    valid={touched.selectedCity && !errors.selectedCity}
                                                                    invalid={touched.selectedCity && !!errors.selectedCity}
                                                                    name='selectedCity' 
                                                                    id='selectedCity'
                                                                    value={selectedCity}
                                                                    custom required>
                                                                <option key='-1' value='-1' disabled>City</option>
                                                                {useCityApi.current.map((cityObject, index) => {
                                                                    return <option key={index} value={cityObject.city_name}>{cityObject.city_name}</option>
                                                                })}
                                                                </CSelect> ) ||
                                                                <CInput type='text'
                                                                        name='selectedCity'
                                                                        id='selectedCity'
                                                                        placeholder='City'
                                                                        valid={touched.selectedCity && !errors.selectedCity}
                                                                        invalid={touched.selectedCity && !!errors.selectedCity}
                                                                        required
                                                                        onChange={(event) => {
                                                                            setSelectedCity(event.target.value)
                                                                            handleChange(event)
                                                                        }}
                                                                        onBlur={handleBlur}
                                                                        value={selectedCity == '-1' ? '' : selectedCity} />
                                                            }
                                                            <CInvalidFeedback>{errors.selectedCity}</CInvalidFeedback>
                                                        </CFormGroup>
                                                    </CCol>
                                                    <CCol sm="12" md="6" lg="6" xl="6">
                                                        <CFormGroup>
                                                        <CLabel htmlFor="zipCode">ZIP Code</CLabel>
                                                        <CInput type='text'
                                                                name='zipCode'
                                                                id='zipCode'
                                                                placeholder='ZIP Code'
                                                                valid={touched.zipCode && !errors.zipCode}
                                                                invalid={touched.zipCode && !!errors.zipCode}
                                                                required
                                                                onChange={handleChange}
                                                                onBlur={handleBlur}
                                                                value={values.zipCode} />
                                                        <CInvalidFeedback>{errors.zipCode}</CInvalidFeedback>
                                                        </CFormGroup>
                                                    </CCol>
                                                    <CCol sm="12" md="12" lg="12" xl="12">
                                                        <CFormGroup>
                                                        <CLabel htmlFor="address">Address</CLabel>
                                                        <CInput type='text'
                                                                name='address'
                                                                id='address'
                                                                placeholder='Address'
                                                                valid={touched.address && !errors.address}
                                                                invalid={touched.address && !!errors.address}
                                                                required
                                                                onChange={handleChange}
                                                                onBlur={handleBlur}
                                                                value={values.address} />
                                                        <CInvalidFeedback>{errors.address}</CInvalidFeedback>
                                                        </CFormGroup>
                                                    </CCol>
                                                </CRow>
                                                <div className='mr-1 mt-3 text-center'>
                                                    <CButton style={{width: '30%'}} type='submit' color='primary' className='btn btn-primary btn-pill font-weight-bold' 
                                                    disabled={!isValid || updateInProgress}>{updateInProgress ? 'Updating ...' : 'Update'}</CButton>
                                                </div>
                                            </CCardBody>
                                        </CCard>
                                    </CCol>
                                </CRow>
                            </CForm>
                        )}
                    </Formik>
                </CCol>
                <CCol sm="12" md="4" lg="4" xl="4">
                        <CRow>
                            <CCol sm="12" md="12" lg="12" xl="12">
                                <CCard>
                                    <CCardHeader>
                                        <h4 className="card-title mb-0">Account Actions</h4>
                                    </CCardHeader>
                                    <CCardBody>
                                        <CListGroup flush>
                                            <CListGroupItem className="d-flex justify-content-between align-items-center">
                                                <div className='d-flex align-items-center'>
                                                    <CIcon size={'lg'} name="cil-lock-locked" className='mr-1' /> Password
                                                </div>
                                                <CButton onClick={handleForgotPassword} className='font-weight-bold' shape='pill' color='primary'
                                                disabled={resetProgress}>
                                                {resetProgress ? 'Change my password ...' : 'Change my password'}
                                                </CButton>
                                            </CListGroupItem>
                                            <CListGroupItem className="d-flex justify-content-between align-items-center">
                                                <div className='d-flex align-items-center'>
                                                    <CIcon size={'lg'} name="cil-document" className='mr-1' /> {userHasCancelled ? 'Billing' : 'Billing / Subscription'}
                                                </div>
                                                <CButton className='font-weight-bold' shape='pill' color='primary'
                                                onClick={generateBillingLink} disabled={billingLinkProgress}>
                                                {billingLinkProgress ? 'Loading...' : (
                                                    userHasCancelled ? 'Update billing' : 'Update billing | Cancel subscription')}
                                                </CButton>
                                            </CListGroupItem>
                                            {userHasCancelled &&
                                            <CListGroupItem className="d-flex justify-content-between align-items-center">
                                                <div className='d-flex align-items-center'>
                                                    <CIcon size={'lg'} name="cil-update" className='mr-1' /> ReSubscribe
                                                </div>
                                                <div className='d-flex justify-content-center align-items-center'>
                                                    <span className='font-weight-bold mr-1'>Yearly</span>
                                                    <CSwitch
                                                        key={'planMode'}
                                                        color={'primary'}
                                                        checked={reSubscribeValue}
                                                        value={'primary'}
                                                        variant={'3d'}
                                                        shape={'pill'}
                                                        onChange={() => setResubscribeValue(!reSubscribeValue)}
                                                    />
                                                    <span className='font-weight-bold ml-1'>Monthly</span>
                                                    <CButton className='font-weight-bold ml-3' shape='pill' color='primary'
                                                    onClick={preResubscribeUser} disabled={resubscribeProgress}>
                                                        {resubscribeProgress ? 'Loading...' : 'ReSubscribe'}
                                                    </CButton>
                                                </div>
                                            </CListGroupItem>}
                                        </CListGroup>
                                    </CCardBody>
                                </CCard>
                            </CCol>
                        </CRow>
                        <CRow>
                            <CCol sm="12" md="12" lg="12" xl="12">
                            <CCard>
                                    <CCardHeader>
                                        <h4 className="card-title mb-0">Account Integrations</h4>
                                    </CCardHeader>
                                    <CCardBody>
                                        <CListGroup flush>
                                            {!discordInfo && <CListGroupItem className="d-flex justify-content-between align-items-center">
                                                <div className='d-flex align-items-center'>
                                                    <CIcon size={'lg'} name="cib-discord" className='mr-1' /> Discord
                                                </div>
                                                <CButton 
                                                    href='https://discord.com/api/oauth2/authorize?client_id=973592883699519558&redirect_uri=https%3A%2F%2Fapp.flowtrade.com%2Faccount%2Fprofile&response_type=code&scope=identify%20email' 
                                                    className='font-weight-bold text-white' shape='pill' style={{backgroundColor: '#5865F2'}}
                                                    disabled={linkingDiscord}>
                                                {linkingDiscord ? 'Linking your discord ...' : 'Link discord account'}
                                                </CButton>
                                            </CListGroupItem>}
                                            {discordInfo && <CListGroupItem className="d-flex justify-content-between align-items-center">
                                                <div className='d-flex align-items-center'>
                                                    <CIcon size={'lg'} name="cib-discord" className='mr-1' /> Discord
                                                </div>
                                                <CButton 
                                                    onClick={unlinkDiscordAccount}
                                                    disabled={unlinkingDiscord}
                                                    className='font-weight-bold text-white' shape='pill' style={{backgroundColor: '#5865F2'}}>
                                                        <div className='d-flex align-items-center'>
                                                            <div className='c-avatar mr-3' style={{width: 25, height: 25}}>
                                                                <CImg
                                                                    src={'https://cdn.discordapp.com/avatars/' + discordInfo.id + '/' + discordInfo.avatar + '.png'}
                                                                    className='c-avatar-img'
                                                                />
                                                            </div>
                                                            <div className=''>{unlinkingDiscord ? 'Unlinking ... ' : 'Unlink '} <span className='font-weight-light font-italic'>{discordInfo.username + '#' + discordInfo.discriminator}</span></div>
                                                        </div>
                                                </CButton>
                                            </CListGroupItem>}
                                            {/* <CListGroupItem className="d-flex justify-content-between align-items-center">
                                                <div className='d-flex align-items-center'>
                                                    <CIcon size={'lg'} name="cib-twitter" className='mr-1' /> Twitter
                                                </div>
                                                <CButton className='font-weight-bold text-white' shape='pill' style={{backgroundColor: '#00ACEE'}}>
                                                Link twitter account
                                                </CButton>
                                            </CListGroupItem> */}
                                        </CListGroup>
                                    </CCardBody>
                                </CCard>
                            </CCol>
                        </CRow>
                </CCol>
                <CCol sm="12" lg="12">
                    {Object.keys(toasters).map((toasterKey) => (
                        <CToaster
                        position={toasterKey}
                        key={'toaster' + toasterKey}>
                        {
                            toasters[toasterKey].map((toast, key)=>{
                            return(
                                <CToast
                                    className={toastType}
                                    key={'toast' + key}
                                    show={true}
                                    autohide={toast.autohide}
                                    fade={toast.fade}>
                                    <CToastHeader className={toastType} closeButton={toast.closeButton}>
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
        </CCardBody>
        <LiveChatWidget license="11797593" />
        </>
    )
}

const mapStateToProps = (state) => {
  return {
    auth: state.firebase.auth,
    profileInfo: state.firebase.profile,
    updateProfileError: state.user.updateProfileError,
    updateProfileSuccess: state.user.updateProfileSuccess,
    geoPullApi: state.misc.geoPullApi,
    updateInProgress: state.user.updateInProgress,
    userLastSearch: state.user.userLastSearch,
    resetError: state.auth.resetError,
    resetSuccess: state.auth.resetSuccess,
    resetProgress: state.auth.resetProgress,
    userHasCancelled: state.user.userHasCancelled,
    discordInfo: state.user.discordInfo,

    resubscribeError: state.auth.resubscribeError,
    resubscribeSuccess: state.auth.resubscribeSuccess,
    resubscribeProgress: state.auth.resubscribeProgress
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    updateProperty: (property) => dispatch(updateProperty(property)),
    EditProfile: (propertyUpdate) => dispatch(EditProfile(propertyUpdate)),
    passwordReset: (email) => dispatch(passwordReset(email)),
    resubscribeUser: (checkoutSession) => dispatch(resubscribeUser(checkoutSession)),
    getGeoToken: () => dispatch(getGeoToken()),
    getGeoCountry: () => dispatch(getGeoCountry()),
    getGeoState: (country) => dispatch(getGeoState(country)),
    getGeoCity: (state) => dispatch(getGeoCity(state))
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Profile)