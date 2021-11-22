import React, { useState, useEffect } from 'react'
import { compose } from 'redux'
import { connect } from 'react-redux'
import { updateProperty } from '../../../store/actions/StylesActions'
import { EditProfile } from '../../../store/actions/UserActions'
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

  CToast,
  CToastBody,
  CToastHeader,
  CToaster,

  CSelect
} from '@coreui/react'
import CIcon from '@coreui/icons-react'

import { Formik } from 'formik'
import * as Yup from 'yup'
import 'yup-phone'

const Profile = props => {
    const {
        updateProfileError,
        profileInfo,
        geoPullApi,
        updateProperty,
        EditProfile,
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
    
    const [useGeoApi, setUseGeoApi] = useState(false)
    const [useCountryApi, setUseCountryApi] = useState(false)
    const [useStateApi, setUseStateApi] = useState(false)
    const [useCityApi, setUseCityApi] = useState(false)

    useEffect(async() => {
        if (geoPullApi == null) {
            getGeoToken()
        } else {
            setUseGeoApi(true)
            const getAsyncCountries = new Promise(async(resolve, reject) => {
                if (useCountryApi == false) {
                    if (typeof profileInfo.country === 'object' && profileInfo.country !== null) {
                        const geoCountries = await getGeoCountry()
                        if (geoCountries !== false && geoCountries.length > 0) {
                            if ( geoCountries.some((countryObject, index) => {
                                return countryObject.country_short_name.toLowerCase() == profileInfo.country.value.toLowerCase()
                            }) ) {
                                setUseCountryApi(geoCountries)
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
                if (useStateApi == false) {
                    if (typeof profileInfo.state === 'object' && profileInfo.state !== null && selectedGotCountry !== false) {
                        const geoStates = await getGeoState(selectedGotCountry)
                        if (geoStates !== false && geoStates.length > 0) {
                            if ( geoStates.some((stateObject, index) => {
                                return stateObject.state_name == profileInfo.state.value
                            }) ) {
                                setUseStateApi(geoStates)
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
                if (useCityApi == false) {
                    if (typeof profileInfo.city === 'object' && profileInfo.city !== null && selectedGotSate !== false) {
                        const geoCities = await getGeoCity(selectedGotSate)
                        if (geoCities !== false && geoCities.length > 0) {
                            if ( geoCities.some((cityObject, index) => {
                                return cityObject.city_name == profileInfo.city.value
                            }) ) {
                                setUseCityApi(geoCities)
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
        firstName: profileInfo.firstName,
        lastName: profileInfo.lastName,
        userOrganization: profileInfo.organization,
        phoneNumber: profileInfo.phoneNumber,
        selectedCountry: selectedCountry,
        selectedState: selectedState,
        selectedCity: selectedCity,
        zipCode: profileInfo.zip,
        address: profileInfo.address,
        password: '',
        confirmPassword: ''
    }

    const onSubmit = (values, { setSubmitting, setErrors }) => {

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
    return (
        <CCardBody>
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
                        <div className='mb-3 d-flex flex-direction-row justify-content-between'>
                            <div className='d-flex align-items-center'>
                                <div className='c-avatar mr-3' style={{width: 75, height: 75}}>
                                    <CImg
                                        src={'https://flowtrade.com/images/avatarplaceholder.png'}
                                        className='c-avatar-img'
                                    />
                                </div>
                                <h1 className=''>{profileInfo.email}</h1>
                            </div>
                            <div className='d-flex align-items-center'>
                                <CButton type='button' color='danger' className='btn btn-pill font-weight-bold mr-3' 
                                >{'Cancel my account'}</CButton>
                                <CButton type='button' color='success' className='btn btn-pill font-weight-bold' 
                                >{'Reset password'}</CButton>
                            </div>
                        </div>
                        {/* <p className="text-muted text-center">Create your account</p> */}
                        <CRow>
                            <CCol sm="12" md="12" lg="12" xl="12">
                                <CCard>
                                    <CCardHeader>
                                        <h4 className="card-title mb-0">Account Information</h4>
                                    </CCardHeader>
                                    <CCardBody>
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
                                                    { ( useGeoApi && useCountryApi ) && 
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
                                                        {useCountryApi.map((countryObject, index) => {
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
                                                    { ( useGeoApi && useStateApi ) && 
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
                                                        {useStateApi.map((stateObject, index) => {
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
                                                    { ( useGeoApi && useCityApi ) && 
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
                                                        {useCityApi.map((cityObject, index) => {
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
                                            disabled={!isValid}>{'Update'}</CButton>
                                        </div>
                                    </CCardBody>
                                </CCard>
                            </CCol>  
                            {/* <CCol sm="12" md="5" lg="5" xl="5">
                                <CCard>
                                    <CCardHeader>
                                        Change Password
                                    </CCardHeader>
                                    <CCardBody>
                                        <CRow>
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
                                        disabled={!isValid} block>{'Update'}</CButton>
                                    </CCardBody>
                                </CCard>
                            </CCol>                        */}
                        </CRow>
                    </CForm>
                )}
            </Formik>
        </CCardBody>
    )
}

const mapStateToProps = (state) => {
  return {
    profileInfo: state.firebase.profile,
    updateProfileError: state.user.updateProfileError,
    geoPullApi: state.misc.geoPullApi
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    updateProperty: (property) => dispatch(updateProperty(property)),
    EditProfile: (propertyUpdate) => dispatch(EditProfile(propertyUpdate)),
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