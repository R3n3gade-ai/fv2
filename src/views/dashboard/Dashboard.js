import React, { 
  useCallback, 
  useState, 
  useEffect, 
  useRef 
} from 'react'
import { connect } from 'react-redux'
import { updateProperty } from '../../store/actions/StylesActions'
import { SetChartSettings } from '../../store/actions/ChartActions'
import { 
  getGeoToken, 
  getGeoCountry, 
  getGeoState, 
  getGeoCity 
} from '../../store/actions/MiscActions'
import { EditProfile } from '../../store/actions/UserActions'
import PerfectScrollbar from 'perfect-scrollbar'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CLink,
  CTooltip,
  CModal,
  CModalHeader,
  CModalBody,
  CModalFooter,
  CBadge,

  CRow,
  CCol,

  CSelect,
  CSpinner,

  CForm,
  CFormGroup,
  CLabel,
  CInput,
  CSwitch,
  CInvalidFeedback,

  CToast,
  CToastBody,
  CToastHeader,
  CToaster
} from '@coreui/react'
import CIcon from '@coreui/icons-react'

import ChartRender from '../charts/ChartRender.js'
import BrandList from '../components/dashboard/BrandList'
import ChartList from '../components/dashboard/ChartList'
import SettingsList from '../components/dashboard/SettingsList'

import StatesOptions from '../../utilities/States'

import { Formik } from 'formik'
import * as Yup from 'yup'
import moment from "moment"

let ps,
    compliancePs = null

const Dashboard = props => {
  const {
    charts,
    updateTheCharts,
    brands,
    mainHeight,
    headerHeight,
    fullScreenMode,
    fullScreenBrand,
    brandsModelShow,
    settingsModelShow,
    currentChartSettings,
    screenShotSrc,
    showScreenShotModal,
    selectedChart,
    showTourSteps,
    showTour,
    compSigned,
    geoPullApi,
    updateProfileError,
    updateProperty,
    EditProfile,
    SetChartSettings,
    getGeoToken,
    getGeoCountry,
    getGeoState,
    getGeoCity
  } = props

  const headerRef = useCallback(node => {
    if (node !== null) {
      updateProperty({headerHeight: node.getBoundingClientRect().height})
    }
  }, [])

  const [showCompliance, setShowCompliance] = useState(false)
  const [currentComplianceStep, setCurrentComplianceStep] = useState(1)

  const [useGeoApi, setUseGeoApi] = useState(false)
  const [useCountryApi, setUseCountryApi] = useState(false)
  const [useStateApi, setUseStateApi] = useState(false)
  const [useCityApi, setUseCityApi] = useState(false)

  const [subOccupation, setSubOccupation] = useState('Self Employed')
  const [subOrganization, setSubOrganization] = useState('None')
  const [jobTitle, setJobTitle] = useState('Self Employed')
  const [jobFunctions, setJobFunctions] = useState('Self Employed')
  const [selectedCountry, setSelectedCountry] = useState('-1')
  const [selectedState, setSelectedState] = useState('-1')
  const [selectedCity, setSelectedCity] = useState('-1')
  const [zipCode, setZipCode] = useState('')
  const [mailingAddress, setMailingAddress] = useState('')

  const [Q1, setQ1] = useState(true)
  const [Q2, setQ2] = useState(true)
  const [Q3, setQ3] = useState(false)
  const [Q4, setQ4] = useState(false)
  const [Q5, setQ5] = useState(false)
  const [Q6, setQ6] = useState(false)
  const [Q7, setQ7] = useState(false)
  const [Q8, setQ8] = useState(false)
  const [Q9, setQ9] = useState(false)
  const [Q10, setQ10] = useState(false)
  const [Q11, setQ11] = useState(false)

  const [toasts, setToasts] = useState([])
  const [position, setPosition] = useState('top-center')
  const [autohide, setAutohide] = useState(true)
  const [autohideValue, setAutohideValue] = useState(5000)
  const [closeButton, setCloseButton] = useState(true)
  const [fade, setFade] = useState(true)
  const [toastType, setToastType] = useState('bg-danger')

  const complianceRef = useRef(null)
  const formRef = useRef(null)

  useEffect(async() => {
    if (updateProfileError !== null) {
      setToastType('bg-danger')
      addToast('Updating Failed', updateProfileError)
    }

    if (showTour && compSigned) {
      updateProperty({showTourSteps: true})
    }

    if (compSigned === false) {
      if(!showCompliance) setShowCompliance(true)
      complianceRef.current && (compliancePs = new PerfectScrollbar('.modal-content_scroll'))

      const complianceContainer = document.querySelector('.modal-content_scroll');
      complianceContainer.scrollTop = 0
    } else {
      setShowCompliance(false)
    }

    if (geoPullApi == null) {
      getGeoToken()
    } else {
      setUseGeoApi(true)
      if (useCountryApi == false) {
        const geoCountries = await getGeoCountry()
        if (geoCountries !== false && geoCountries.length > 0) {
          setUseCountryApi(geoCountries)
        }
      }
    }

    if(ps) ps.update()
  }, [brands, currentComplianceStep, geoPullApi, updateProfileError, compSigned])

  const generateReport = async() => {
    console.log('generating now')

    let xusers = await React.firebase.firebase.database().ref('users').once("value")
    xusers = xusers.val()

    console.log('Got Users X', xusers)

    let xInvoices = await React.firebase.firebase.database().ref('invoices').once("value");
    xInvoices = xInvoices.val()
    console.log('Got Invoices', xInvoices)

    await gotUsersAndInvoices(xusers, xInvoices)
  }


  const sortBy = (xrecords, row) => {
    xrecords.sort((a, b) => (a[row] > b[row] ? 1 : -1))
    return xrecords
  }

  const returnsMonthStr = (val) => {
    switch (val){
      case 0: return "Jan"
      case 1: return "Feb"
      case 2: return "Mar"
      case 3: return "Apr"
      case 4: return "May"
      case 5: return "Jun"
      case 6: return "Jul"
      case 7: return "Aug"
      case 8: return "Sep"
      case 9: return "Oct"
      case 10: return "Nov"
      case 11: return "Dec"
    }
  }

  const gotUsersAndInvoices = async(xusers, xInvoices) => {
    console.log('Gen 1')
    let dateToday = new Date()
    let month1 = dateToday.getMonth()//0 is January
    let month2 = 0;
    let month3 = 0;
    let month4 = 0;
    let month5 = 0;
    let month6 = 0;
    let month7 = 0;

    if (month1 == 0) {
      month2 = 12
    } else {
      month2 = month1 - 1
    }
    if (month2 == 0) {
      month3 = 12
    } else {
      month3 = month2 - 1
    }
    if (month3 == 0) {
      month4 = 12
    } else {
      month4 = month3 - 1
    }
    if (month4 == 0) {
      month5 = 12
    } else {
      month5 = month4 - 1
    }
    if (month5 == 0) {
      month6 = 12
    } else {
      month6 = month5 - 1
    }
    if (month6 == 0) {
      month7 = 12
    } else {
      month7 = month6 - 1
    }

    let invoiceAmount = 0
    let invoiceDate = new Date()


    let exportedDetailedReport = []
    let detailedReportRow = {}
    let exportedSummaryReport = {}
    let exportedSummaryReportArray = []
    let summaryReportRow = {}

    //    let xusers = val.val();
    let unique = {}
    let busers = []
    for (let bb in xusers) {
      busers.push(xusers[bb]);
    }

    let users = sortBy(busers, "refCode")

    //GW needs: invoices from PayPal and Stripe, sync so it waits for invoices each time

    for (let bb in users) {
      let fulluser = users[bb]
      let currentAffiliateUID = ""

      currentAffiliateUID = fulluser.refCode
      console.log('current affiliate', currentAffiliateUID)

      //only process users with proper affiliate code - user reached ONE time
      if (typeof fulluser.refCode !== typeof undefined && 
        fulluser.refCode != null && fulluser.refCode.length == 28 && xusers[currentAffiliateUID]) {
        //console.log(fulluser.refCode, "  <<<<")



        //Set up affiliate row for exportedSummaryReport
        //modify summaryReportRow then save it
        if (!exportedSummaryReport[currentAffiliateUID]) {
          //Console.log("1Not yet, create a row: ", xusers[currentAffiliateUID].firstName)

          summaryReportRow = {
              affiliateFullName: xusers[currentAffiliateUID].firstName + " " + xusers[currentAffiliateUID].lastName,
              affiliateEmail: xusers[currentAffiliateUID].email,
              month1UsersPaidCount: 0,
              month2UsersPaidCount: 0,
              month3UsersPaidCount: 0,
              month4UsersPaidCount: 0,
              month5UsersPaidCount: 0,
              month6UsersPaidCount: 0,
              month7UsersPaidCount: 0,
              month1UsersPaidAmount: 0,
              month2UsersPaidAmount: 0,
              month3UsersPaidAmount: 0,
              month4UsersPaidAmount: 0,
              month5UsersPaidAmount: 0,
              month6UsersPaidAmount: 0,
              month7UsersPaidAmount: 0,
          }
          exportedSummaryReport[currentAffiliateUID] = summaryReportRow
        } else {
          summaryReportRow = exportedSummaryReport[currentAffiliateUID]
        }


        invoiceAmount = 0
        //get invoice amount and date
        //                if (fulluser.isPaypal != null && fulluser.isPaypal == true) {
        //console.log("2",fulluser.amountPaid,"   amt paid")

        let invoiceCountDetailedReport = 0
        let affiliateName = xusers[currentAffiliateUID].firstName + " " + xusers[currentAffiliateUID].lastName
        let userName = fulluser.firstName + " " + fulluser.lastName
        let userEmail = fulluser.email
        let userSignup = (fulluser.signUpTime ? moment(fulluser.signUpTime).format("M/D/YY") : " ")
        let userCancelDate = (fulluser.cancelTime ? moment(fulluser.cancelTime).format("M/D/YY") : " ")
        let userLastSeen = (fulluser.lastSeen ? moment(fulluser.lastSeen).format("M/D/YY") : " ")


        //go through all subIDs
        for (let cc in xInvoices) {

          //main invoice object
          if (cc == fulluser.subID) {
              //console.log('3found subid: ', cc)

              //go through each invoice in the subID object
              for (let dd in xInvoices[cc]) {
                  //console.log(xInvoices[cc][dd])
                  //console.log("Amount/Date:  ",xInvoices[cc][dd].amount_paid,"  ",xInvoices[cc][dd].created)
                  if (xInvoices[cc][dd].amount_paid != undefined && xInvoices[cc][dd].amount_paid != 0
                      && xInvoices[cc][dd].created != undefined && xInvoices[cc][dd].created != 0) {
                      invoiceDate = new Date(xInvoices[cc][dd].created * 1000)
                      invoiceAmount = xInvoices[cc][dd].amount_paid / 100

                      invoiceCountDetailedReport = invoiceCountDetailedReport + 1
                      detailedReportRow = {
                          affiliateName: affiliateName,
                          userName: userName,
                          userEmail: userEmail,
                          userSignup: userSignup,
                          userCancelDate: userCancelDate,
                          userLastSeen: userLastSeen,
                          userDatePaid: moment(invoiceDate).format("M/D/YY"),
                          userAmountPaid: invoiceAmount
                      }
                      exportedDetailedReport.push(detailedReportRow);

                      if (invoiceDate.getMonth() == month1) {
                          summaryReportRow.month1UsersPaidCount = summaryReportRow.month1UsersPaidCount + 1
                          summaryReportRow.month1UsersPaidAmount = summaryReportRow.month1UsersPaidAmount + invoiceAmount
                          //Console.log("     0 ", summaryReportRow.month1UsersPaidAmount)
                      } else if (invoiceDate.getMonth() == month2) {
                          summaryReportRow.month2UsersPaidCount = summaryReportRow.month2UsersPaidCount + 1
                          summaryReportRow.month2UsersPaidAmount = summaryReportRow.month2UsersPaidAmount + invoiceAmount
                          //Console.log("     1 ", summaryReportRow.month2UsersPaidAmount)
                      } else if (invoiceDate.getMonth() == month3) {
                          summaryReportRow.month3UsersPaidCount = summaryReportRow.month3UsersPaidCount + 1
                          summaryReportRow.month3UsersPaidAmount = summaryReportRow.month3UsersPaidAmount + invoiceAmount
                          //Console.log("     2 ", summaryReportRow.month3UsersPaidAmount)
                      } else if (invoiceDate.getMonth() == month4) {
                          summaryReportRow.month4UsersPaidCount = summaryReportRow.month4UsersPaidCount + 1
                          summaryReportRow.month4UsersPaidAmount = summaryReportRow.month4UsersPaidAmount + invoiceAmount
                          //Console.log("     3 ", summaryReportRow.month4UsersPaidAmount)
                      } else if (invoiceDate.getMonth() == month5) {
                          summaryReportRow.month5UsersPaidCount = summaryReportRow.month5UsersPaidCount + 1
                          summaryReportRow.month5UsersPaidAmount = summaryReportRow.month5UsersPaidAmount + invoiceAmount
                          //Console.log("     4 ", summaryReportRow.month5UsersPaidAmount)
                      } else if (invoiceDate.getMonth() == month6) {
                          summaryReportRow.month6UsersPaidCount = summaryReportRow.month6UsersPaidCount + 1
                          summaryReportRow.month6UsersPaidAmount = summaryReportRow.month6UsersPaidAmount + invoiceAmount
                          //Console.log("     5 ", summaryReportRow.month6UsersPaidAmount)
                      } else if (invoiceDate.getMonth() == month7) {
                          summaryReportRow.month7UsersPaidCount = summaryReportRow.month7UsersPaidCount + 1
                          summaryReportRow.month7UsersPaidAmount = summaryReportRow.month7UsersPaidAmount + invoiceAmount
                          //Console.log("     6 ", summaryReportRow.month7UsersPaidAmount)
                      }
                  }
              }

              //write a blank line
              if (invoiceCountDetailedReport == 0) {
                  //use detailedReportRow:  Affiliate Name, User Name, User Email, signup date, cancelled date, last seen, date paid, amount paid
                  detailedReportRow = {
                      affiliateName: affiliateName,
                      userName: userName,
                      userEmail: userEmail,
                      userSignup: userSignup,
                      userCancelDate: userCancelDate,
                      userLastSeen: userLastSeen,
                      userDatePaid: " ",
                      userAmountPaid: " "
                  }
                  exportedDetailedReport.push(detailedReportRow);
              }
          }
        }
        //done with summary report data - only save if there's an amount paid
        if (fulluser.amountPaid != null && fulluser.amountPaid != 0) {
          exportedSummaryReport[currentAffiliateUID] = summaryReportRow
        }

      }
    }

    console.log('final export')
    console.log(exportedDetailedReport)
    let output=""

    let writeSummaryReport = true
    if (writeSummaryReport) {
      //Write title row
      output=output+"Name , Email, Count in " + returnsMonthStr(month1), " , Paid "+returnsMonthStr(month1)
      +",Count in " + returnsMonthStr(month2), " , Paid "+returnsMonthStr(month2)
      +",Count in " + returnsMonthStr(month3), " , Paid "+returnsMonthStr(month3)
      +",Count in " + returnsMonthStr(month4), " , Paid "+returnsMonthStr(month4)
      +",Count in " + returnsMonthStr(month5), " , Paid "+returnsMonthStr(month5)
      +",Count in " + returnsMonthStr(month6), " , Paid "+returnsMonthStr(month6)
      +",Count in " + returnsMonthStr(month7), " , Paid "+returnsMonthStr(month7)



      for (let bb in exportedSummaryReport) {
        exportedSummaryReportArray.push({
          Name: exportedSummaryReport[bb].affiliateFullName,
          Email: exportedSummaryReport[bb].affiliateEmail,
          ["Count in " + returnsMonthStr(month1)]: exportedSummaryReport[bb].month1UsersPaidCount,
          ["Paid "+returnsMonthStr(month1)] : exportedSummaryReport[bb].month1UsersPaidAmount,
          ["Count in " + returnsMonthStr(month2)]: exportedSummaryReport[bb].month2UsersPaidCount,
          ["Paid "+returnsMonthStr(month2)] : exportedSummaryReport[bb].month2UsersPaidAmount,
          ["Count in " + returnsMonthStr(month3)]: exportedSummaryReport[bb].month3UsersPaidCount,
          ["Paid "+returnsMonthStr(month3)] : exportedSummaryReport[bb].month3UsersPaidAmount,
          ["Count in " + returnsMonthStr(month4)]: exportedSummaryReport[bb].month4UsersPaidCount,
          ["Paid "+returnsMonthStr(month4)] : exportedSummaryReport[bb].month4UsersPaidAmount,
          ["Count in " + returnsMonthStr(month5)]: exportedSummaryReport[bb].month5UsersPaidCount,
          ["Paid "+returnsMonthStr(month5)] : exportedSummaryReport[bb].month5UsersPaidAmount,
          ["Count in " + returnsMonthStr(month6)]: exportedSummaryReport[bb].month6UsersPaidCount,
          ["Paid "+returnsMonthStr(month6)] : exportedSummaryReport[bb].month6UsersPaidAmount,
          ["Count in " + returnsMonthStr(month7)]: exportedSummaryReport[bb].month7UsersPaidCount,
          ["Paid "+returnsMonthStr(month7)] : exportedSummaryReport[bb].month7UsersPaidAmount
        })
        // output=output+exportedSummaryReport[bb].affiliateFullName, ",", exportedSummaryReport[bb].affiliateEmail,
        // ",", exportedSummaryReport[bb].month1UsersPaidCount, ",", exportedSummaryReport[bb].month1UsersPaidAmount,
        // ",", exportedSummaryReport[bb].month2UsersPaidCount, ",", exportedSummaryReport[bb].month2UsersPaidAmount,
        // ",", exportedSummaryReport[bb].month3UsersPaidCount, ",", exportedSummaryReport[bb].month3UsersPaidAmount,
        // ",", exportedSummaryReport[bb].month4UsersPaidCount, ",", exportedSummaryReport[bb].month4UsersPaidAmount,
        // ",", exportedSummaryReport[bb].month5UsersPaidCount, ",", exportedSummaryReport[bb].month5UsersPaidAmount,
        // ",", exportedSummaryReport[bb].month6UsersPaidCount, ",", exportedSummaryReport[bb].month6UsersPaidAmount,
        // ",", exportedSummaryReport[bb].month7UsersPaidCount, ",", exportedSummaryReport[bb].month7UsersPaidAmount
      }
    }

    console.log(exportedSummaryReportArray)
    console.log(exportedSummaryReport)


    // console.log('Generating affiliate Report.....', )

    // let fileName = 'temp.txt';
    // let destination = "affiliateReports/" + new Date().getTime() + ".csv";
    // const tempFilePath = path.join(os.tmpdir(), fileName);

    // console.log( `Writing out to ${tempFilePath}` );
    // await fs.writeFileSync(tempFilePath, output);
    // let storage = React.firebase.firebase.storage()
    // await storage
    // .bucket()
    // .upload(tempFilePath, {destination})

    // fs.unlinkSync(tempFilePath)
    // let xtime =new Date().getTime();
    // console.log('Did write affiliate Report')
    // admin.database().ref('affiliateReports/'+xtime).set(destination)
  }



  const nextComplianceStep = async(event) => {
    const currentStep = currentComplianceStep
    const nextStep = currentStep + 1

    const checkEntries = new Promise((resolve, reject) => {
      if (currentStep == 3) {
        if (formRef.current) {
          formRef.current.handleSubmit()
          const validFormik = formRef.current.isValid && Object.keys(formRef.current.touched).length > 0
          if(!validFormik) {
            const complianceContainer = document.querySelector('.modal-content_scroll')
            complianceContainer.scrollTop = complianceContainer.scrollHeight
          }

          resolve(validFormik)
        } else {
          resolve(false)
        }
      } else {
        resolve(true)
      }
    })
    const validEntries = await checkEntries
    if (!validEntries) return

    setCurrentComplianceStep(nextStep)
  }

  const fnishCompliance = async() => {
    const getPostCountry = new Promise((resolve, reject) => {
      if (useCountryApi !== false) {
        if (selectedCountry != '-1') {
          const countryIndex = useCountryApi.findIndex(dataCountry => {
            return dataCountry.country_name == selectedCountry
          })

          if (countryIndex == -1) {
            resolve({
              label: 'United States',
              value: 'US'
            })
          } else {
            resolve({
              label: selectedCountry,
              value: useCountryApi[countryIndex].country_short_name
            })
          }
        } else {
          resolve({
            label: 'United States',
            value: 'US'
          })
        }
      } else {
        if (selectedCountry != '') {
           resolve({
            label: selectedCountry,
            value: selectedCountry
          })         
        } else {
          resolve({
            label: 'United States',
            value: 'US'
          })
        }
      }
    })
    const getPostState = new Promise((resolve, reject) => {
      if (useStateApi !== false) {
        if (selectedState != '-1') {
          if (selectedCountry == 'United States') {
            const stateIndex = StatesOptions.findIndex(dataState => {
              return dataState.label.toLowerCase() == selectedState.toLowerCase()
            })

            if (stateIndex != -1) {
              resolve({
                state: {
                  label: StatesOptions[stateIndex].label,
                  value: StatesOptions[stateIndex].value
                },
                city: selectedCity,
                zip: zipCode
              })
            } else {
              resolve({
                state: {
                  label: selectedState,
                  value: selectedState
                },
                city: selectedCity,
                zip: zipCode
              })
            }
          } else {
            resolve({
              state: selectedState,
              city: selectedCity,
              zip: zipCode
            })
          }
        } else {
          resolve({
            state: {
              label: 'Delaware',
              value: 'DE'
            },
            city: 'Dover',
            zip: '19901'
          })
        }
      } else {
        if (selectedState != '') {
          resolve({
            state: {
              label: selectedState,
              value: selectedState
            },
            city: selectedCity,
            zip: zipCode
          })    
        } else {
          resolve({
            state: {
              label: 'Delaware',
              value: 'DE'
            },
            city: 'Dover',
            zip: '19901'
          })    
        }
      }
    })

    const getThatCountry = await getPostCountry
    const getThatState = await getPostState

    EditProfile({
      occupations: subOccupation,
      employerOrg: subOrganization,
      organization: subOrganization,
      jobTitle: jobTitle,
      jobFunction: jobFunctions,
      employerCountry: getThatCountry,
      employerState: getThatState.state,
      employerCity: getThatState.city,
      employerZip: getThatState.zip,
      employerAddress: mailingAddress,
      country: getThatCountry,
      state: getThatState.state,
      city: getThatState.city,
      state: getThatState.zip,
      address: mailingAddress,
      Q1: Q1 ? 'Yes' : 'No',
      Q2: Q2 ? 'Yes' : 'No',
      Q3: Q3 ? 'Yes' : 'No',
      Q4: Q4 ? 'Yes' : 'No',
      Q5: Q5 ? 'Yes' : 'No',
      Q6: Q6 ? 'Yes' : 'No',
      Q7: Q7 ? 'Yes' : 'No',
      Q8: Q8 ? 'Yes' : 'No',
      Q9: Q9 ? 'Yes' : 'No',
      Q10: Q10 ? 'Yes' : 'No',
      Q11: Q11 ? 'Yes' : 'No',
      compSigned: true,
      compSig: new Date().getTime(),
      compSigTime: new Date().getTime()
    })
  }

  const previousComplianceStep = () => {
    const currentStep = currentComplianceStep
    const previousStep = currentStep - 1

    setCurrentComplianceStep(previousStep)
  }

  const gotCountry = async(event) => {
    setUseStateApi(false)
    setUseCityApi(false)
    const geoStates = await getGeoState(event.target.value)
    if (geoStates !== false && geoStates.length > 0) {
      setUseStateApi(geoStates)
    }
  }

  const gotState = async(event) => {
    setUseCityApi(false)
    const geoCities = await getGeoCity(event.target.value)
    if (geoCities !== false && geoCities.length > 0) {
      setUseCityApi(geoCities)
    }
  }

  const validationSchema = function (values) {
    return Yup.object().shape({
      subOccupation: Yup.string()
        .min(4, `Occupation has to be at least 4 characters`)
        .required('Subscriber Occupation is required'),
      subOrganization: Yup.string()
        .min(4, `Organization has to be at least 4 character`)
        .required('Organization is required'),
      jobTitle: Yup.string()
        .min(4, `Job Title has to be at least 4 character`)
        .required('Job Title is required'),
      jobFunctions: Yup.string()
        .min(4, `Job Function has to be at least 4 character`)
        .required('Job Function is required!'),
      selectedCountry: Yup.string()
        .test(
          'is-selected-country',
          'Country is required',
          (value, context) => value !== '' && value !== '-1',
        )
        .required('Country is required'),
      selectedState: Yup.string()
        .test(
          'is-selected-state',
          'State is required',
          (value, context) => value !== '' && value !== '-1',
        )
        .required('State is required'),
      selectedCity: Yup.string()
        .test(
          'is-selected-city',
          'City is required',
          (value, context) => value !== '' && value !== '-1',
        )
        .required('City is required'),
      zipCode: Yup.string()
        .required('ZIP Code is required!'),
      mailingAddress: Yup.string()
        .required('Mailing Address is required!'),
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
    subOccupation: subOccupation,
    subOrganization: subOrganization,
    jobTitle: jobTitle,
    jobFunctions: jobFunctions,
    selectedCountry: selectedCountry,
    selectedState: selectedState,
    selectedCity: selectedCity,
    zipCode: zipCode,
    mailingAddress: mailingAddress
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
  
  return (
    <>
      { fullScreenMode && 
        <div>
          <CCard className='m-0'>
            <CCardHeader innerRef={headerRef} className='card-header-actions mr-0 d-flex align-items-center justify-content-between c-header'>
              <div className='d-flex'>
                <span className='h5 ml-2 mb-0'>{fullScreenBrand.chartSymbol}</span>
                <span className='ml-1 mb-0 text-muted mt-auto'>{fullScreenBrand.chartBrand}</span>
              </div>
              <div className='card-header-actions d-flex'>
                <CTooltip content='Time Frame'>
                  <CBadge 
                    shape="pill"
                    style={{
                      backgroundColor: fullScreenBrand.chartSettings.priceBarsColor,
                      cursor: 'pointer'
                    }}
                    className="ml-1 mr-1 d-flex align-items-center justify-content-center"
                    onClick={() => {
                      SetChartSettings({
                        periodicity: fullScreenBrand.chartSettings.periodicity == '1m' ? '15m' : '1m'
                      }, fullScreenBrand.chartSymbol, false, true)
                    }}>
                    {fullScreenBrand.chartSettings.periodicity}
                  </CBadge>
                </CTooltip>
                <CBadge 
                  shape="pill" 
                  style={{
                    backgroundColor: fullScreenBrand.chartSettings.flowIndex === 'normal' ? fullScreenBrand.chartSettings.flowIndexColor : (
                        fullScreenBrand.chartSettings.flowIndex === 'dark-pool' ? fullScreenBrand.chartSettings.flowDarkIndexColor : fullScreenBrand.chartSettings.flowBothIndexColor
                    )
                  }}
                  className="ml-1 mr-1 d-flex align-items-center justify-content-center">
                  {fullScreenBrand.chartSettings.flowIndex}
                </CBadge>

                { fullScreenBrand.chartSettings.replayMarket &&
                  <>
                    { !(fullScreenBrand.chartSettings.replayMarket == 'pause') && 
                      <CTooltip content='Pause Market'>
                        <CLink className='card-header-action pl-1 pr-0'
                          onClick={() => {
                            SetChartSettings({
                              replayMarket: 'pause'
                            }, fullScreenBrand.chartSymbol, false, false)
                          }}>
                            <CIcon name='cis-media-pause-circle' height={20} />
                        </CLink>
                      </CTooltip>}
                    { fullScreenBrand.chartSettings.replayMarket == 'pause' &&
                      <CTooltip content='Play Market'>
                        <CLink className='card-header-action pl-1 pr-0'
                          onClick={() => {
                            SetChartSettings({
                              replayMarket: 'play'
                            }, fullScreenBrand.chartSymbol, false, false)
                          }}>
                            <CIcon name='cis-media-play-circle' height={20} />
                        </CLink>
                      </CTooltip>}
                    <CTooltip content='Stop Market'>
                      <CLink className='card-header-action p-07'
                        onClick={() => {
                          SetChartSettings({
                            replayMarket: false
                          }, fullScreenBrand.chartSymbol, false, false)
                        }}>
                          <CIcon name='cis-media-stop-circle' height={20} />
                      </CLink>
                    </CTooltip>
                    <CTooltip content='Speed'>
                      <div className='card-header-action p-07'>
                        <CSelect 
                          custom size="xs" name="selectSm" id="SelectLm" 
                          value={fullScreenBrand.chartSettings.replayMarketSettings.speed}
                          onChange={(e) => {
                            SetChartSettings({
                              replayMarket: 'replay',
                              replayMarketSettings: {
                                speed: e.target.value
                              }
                            }, fullScreenBrand.chartSymbol, false, false)
                          }}>
                          <option value="500">Slow</option>
                          <option value="250">Normal</option>
                          <option value="100">Fast</option>
                        </CSelect>
                      </div>
                    </CTooltip>            
                  </>          
                }
                { !fullScreenBrand.chartSettings.replayMarket &&
                  <>
                    <CTooltip content='ScreenShot'>
                      <CLink className='card-header-action pl-1 pr-1'
                        onClick={() => {
                          SetChartSettings({
                            takeScreenShot: true
                          }, fullScreenBrand.chartSymbol, false, false)
                          updateProperty({showScreenShotModal: !showScreenShotModal})
                        }}>
                          <CIcon name='cis-images' height={20} />
                      </CLink>
                    </CTooltip>
                    <CTooltip content='Show BlockTrades'>
                      <CLink className='card-header-action pl-1 pr-1'
                        onClick={() => {
                          SetChartSettings({
                            blocksLine: !fullScreenBrand.chartSettings.blocksLine
                          }, fullScreenBrand.chartSymbol, false, true)
                        }}>
                          { !fullScreenBrand.chartSettings.blocksLine &&
                            <CIcon name='cil-image-broken' height={20} />
                          }
                          { fullScreenBrand.chartSettings.blocksLine &&
                            <CIcon name='cis-image-broken' height={20} />
                          }
                      </CLink>
                    </CTooltip>
                        <CTooltip content='Show Divergence'>
                          <CLink className='card-header-action pl-1 pr-1'
                            onClick={() => {
                              SetChartSettings({
                                showDivergence: !fullScreenBrand.chartSettings.showDivergence
                              }, fullScreenBrand.chartSymbol, false, true)
                            }}>
                              { !fullScreenBrand.chartSettings.showDivergence &&
                                <CIcon name='cil-call-split' height={20} />
                              }
                              { fullScreenBrand.chartSettings.showDivergence &&
                                <CIcon name='cis-call-split' height={20} />
                              }
                          </CLink>
                        </CTooltip>
                    <CTooltip content='Replay Market'>
                      <CLink className='card-header-action pl-1 pr-1'
                        onClick={() => {
                          SetChartSettings({
                            replayMarket: true
                          }, fullScreenBrand.chartSymbol, false, false)
                        }}>
                          <CIcon name='cis-media-play-circle' height={20} />
                      </CLink>
                    </CTooltip>
                    <CTooltip content='Chart Settings'>
                      <CLink className='card-header-action pl-1 pr-1'
                        onClick={() => {
                          SetChartSettings({
                            chartSymbol : fullScreenBrand.chartSymbol
                          }, fullScreenBrand.chartSymbol, false, false)
                          updateProperty({settingsModelShow: !settingsModelShow})
                        }}>
                          <CIcon name='cis-settings' height={20} />
                      </CLink>

                    </CTooltip>
                    <CTooltip content='Restore Screen'>
                      <CLink className='card-header-action pl-1 pr-1'
                        onClick={() => {
                          SetChartSettings({
                            fullScreenMode : false
                          }, fullScreenBrand.chartSymbol, true, false)
                          updateProperty({
                            fullScreenMode:!fullScreenMode
                          })
                        }}>
                          <CIcon name='cis-window-restore' height={20} />
                      </CLink>
                    </CTooltip>
                  </>
                }
              </div>
            </CCardHeader>
            <CCardBody style={{backgroundColor: fullScreenBrand.chartSettings.backgroundColor}}>
              <div className='chart-watermark'>
                <CIcon content={React.icons.flowtradeDarkLogo} height="190" alt="Flowtrade"/>
              </div>
              <ChartRender 
                mainHeight={(mainHeight - headerHeight - 40)}
                currentSymbol={fullScreenBrand.chartSymbol}
              />
            </CCardBody>
          </CCard> 
        </div> 
      }
      { !fullScreenMode &&
        <>
          {charts.length < 4 && <CButton 
          onClick={() => updateProperty({selectedChart:null, brandsModelShow: true})}
          className='add-new-market_button first-step' shape='pill' color='primary'
          >
            <CIcon size={'xl'} name="cis-plus" className='mr-2' />
            Add New Symbol
          </CButton>}

          {/* <CButton 
          onClick={() =>generateReport()}
          className='add-new-market_button first-step' shape='pill' color='primary'
          >
            <CIcon size={'xl'} name="cis-plus" className='mr-2' />
            generateReport
          </CButton> */}

          <ChartList />

          <CModal
            show={brandsModelShow}
            onClose={() => updateProperty({brandsModelShow: false})}
            onOpened={() => {
              ps = new PerfectScrollbar('.symbols-modal-body')
            }}
            closeOnBackdrop={false}
          >
            <CModalHeader className='font-weight-bold' closeButton>Add New Symbol</CModalHeader>
            <CModalBody style={{paddingRight: 10}} className='pl-0 pb-0 pt-0 symbols-modal-body h-50'>
              <BrandList />
            </CModalBody>
          </CModal>
        </>
      }

      <CRow>
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

      <CModal
        show={settingsModelShow}
        onClose={() => {
          updateProperty({currentChartSettings: {}, settingsModelShow: !settingsModelShow})
        }}
        //onOpened={() => alert('opened')}
        closeOnBackdrop={false}
        size='lg'
      >
        <CModalHeader className='h5 mb-0' closeButton>Chart Settings</CModalHeader>
        <CModalBody className='p-0'>
          <SettingsList />
        </CModalBody>
      </CModal>
      <CModal
        show={showScreenShotModal}
        onClose={() => {
          updateProperty({screenShotSrc: null, showScreenShotModal: !showScreenShotModal})
        }}
        //onOpened={() => alert('opened')}
        closeOnBackdrop={false}
        size='lg'
        className='tiiist'
      >
        <CModalHeader className='h5 mb-0' closeButton>ScreenShot Share</CModalHeader>
        <CModalBody className=''>
          { screenShotSrc == null &&
            <div style={{height: mainHeight, position: 'relative'}}><CSpinner className='absolute-spinner'/></div>
          }
          { screenShotSrc !== null &&
            <img width={'100%'} style={{borderRadius: 10}} src={screenShotSrc} />
          }
        </CModalBody>
      </CModal>
      <CModal
        show={showCompliance}
        onClose={() => setShowCompliance(false)}
        closeOnBackdrop={false}
        size='lg'
        className='compliance_modal'
      >
        <CModalHeader className='h5 justify-content-center' closeButton={false}>Agreement For Market Data Display Services</CModalHeader>
        <CModalBody className=''>
          <CRow className='mb-5'>
            <CCol>
              <div className='d-flex flex-row justify-content-around mb-2'>
                { [1,2,3,4,5].map((objectStep, index) => {
                  let objectClasses = 'd-flex compliance-step_container'
                  if (objectStep == 1) objectClasses += ' compliance-step_container-first'
                  if (objectStep == 5) objectClasses += ' compliance-step_container-last'

                  let childObjectClasses = 'step-number_container'
                  if (objectStep <= currentComplianceStep) childObjectClasses += ' active'

                  return (
                      <div key={index} className={objectClasses}>
                        <span className={childObjectClasses}>{objectStep}</span>
                      </div>
                    )
                  })
                }
              </div>
              <div className='d-flex flex-row justify-content-around'>
                <div className='d-flex compliance-step_text-container'>
                  <span className='step-text_container'>Usage</span>
                </div>
                <div className='d-flex compliance-step_text-container'>
                  <span className='step-text_container'>Section I</span>
                </div>
                <div className='d-flex compliance-step_text-container'>
                  <span className='step-text_container'>Section II</span>
                </div>
                <div className='d-flex compliance-step_text-container'>
                  <span className='step-text_container'>Questionnaire</span>
                </div>
                <div className='d-flex compliance-step_text-container'>
                  <span className='step-text_container'>Certification</span>
                </div>
              </div>
            </CCol>
          </CRow>
          <CRow innerRef={complianceRef} className='modal-content_scroll pl-5 pr-5'>
            { currentComplianceStep == 1 &&
              <CCol>
                <span className='h5'>Usage-Based Services/Nonprofessional Subscriber Status</span>
                <p className='mt-3'>FlowTrade("Vendor") agrees to make "Market Data" available to you pursuant to the terms and conditions set forth in this agreement. By executing this Agreement in the space indicated below, you ("Subscriber") agree to comply with those terms and conditions. Section 1 sets forth terms and conditions of general applicability. Section 2 applies insofar as Subscriber receives and uses Market Data made available pursuant to this Agreement as a Nonprofessional Subscriber</p>
              </CCol> }
            { currentComplianceStep == 2 &&
              <CCol>
                <span className='h5'>Section 1: Terms and Conditions of General Applicability</span>
                <p className='mt-3'><strong>1.MARKET DATA DEFINITION</strong> – For all purposes of this Agreement, "Market Data" means (a) last sale information and quotation information relating to securities that are admitted to dealings on the New York Stock Exchange ("NYSE"), (b) such bond and other equity last sale and quotation information, and such index and other market information, as United States-registered national securities exchanges and national securities associations (each, an "Authorizing SRO") may make available and as the NYSE may from time to time designate as "Market Data"; and (c) all information that derives from any such information.</p>
                <p className='mt-3'><strong>2. PROPRIETARY NATURE OF DATA</strong> – Subscriber understands and acknowledges that each Authorizing SRO and Other Data Disseminator has a proprietary interest in the Market Data that originates on or derives from it or its market(s).</p>
                <p className='mt-3'><strong>3. ENFORCEMENT</strong> – Subscriber understands and acknowledges that (a) the Authorizing SROs are third-party beneficiaries under this Agreement and (b) the Authorizing SROs or their authorized representative(s) may enforce this Agreement, by legal proceedings or otherwise, against Subscriber or any person that obtains Market Data that is made available pursuant to this Agreement other than as this Agreement contemplates. Subscriber shall pay the reasonable attorney's fees that any Authorizing SRO incurs in enforcing this Agreement against Subscriber.</p>
                <p className='mt-3'><strong>4. DATA NOT GUARANTEED</strong> – Subscriber understands that no Authorizing SRO, no other entity whose information is made available over the Authorizing SROs' facilities (an "Other Data Disseminator") and no information processor that assists any Authorizing SRO or Other Data Disseminator in making Market Data available (collectively, the "Disseminating FlowTrade Last Update: March 4, 2013 Parties") guarantees the timeliness, sequence, accuracy or completeness of Market Data or of other market information or messages disseminated by any Disseminating Party. Neither Subscriber nor any other person shall hold any Disseminating Party liable in any way for (a) any inaccuracy, error or delay in, or omission of, (i) any such data, information or message or (ii) the transmission or delivery of any such data, information or message, or (b) any loss or damage arising from or occasioned by (i) any such inaccuracy, error, delay or omission, (ii) nonperformance or (iii) interruption in any such data, information or message, due either to any negligent act or omission by any Disseminating Party, to any "force majeure" (e.g., flood, extraordinary weather conditions, earthquake or other act of God, fire, war, insurrection, riot, labor dispute, accident, action of government, communications or power failure, equipment or software malfunction) or to any other cause beyond the reasonable control of any Disseminating Party.</p>
                <p className='mt-3'><strong>5. PERMITTED USE</strong> – Subscriber shall not furnish Market Data to any other person or entity. If Subscriber receives Market Data other than as a Nonprofessional Subscriber, it shall use Market Data only for its individual use in its business.</p>
                <p className='mt-3'><strong>6. DISSEMINATION DISCONTINUANCE OR MODIFICATION</strong> – Subscriber understands and acknowledges that, at any time, the Authorizing SROs may discontinue disseminating any category of Market Data, may change or eliminate any transmission method and may change transmission speeds or other signal characteristics. The Authorizing SROs shall not be liable for any resulting liability, loss or damages that may arise therefrom.</p>
                <p className='mt-3'><strong>7. DURATION; SURVIVAL</strong> – This Agreement remains in effect for so long as Subscriber has the ability to receive Market Data as contemplated by this Agreement. In addition, Vendor may terminate this Agreement at any time, whether at the direction of the Authorizing SROs or otherwise. Paragraphs 2, 3 and 4, and the first two sentences of Paragraph 8, survive any termination of this Agreement.</p>
                <span className='h5 mt-3'>I Accept And agree to Section 1 No.8</span>
                <p className='mt-3'><strong>8.</strong> The laws of the State of New York shall govern this Agreement and it shall be interpreted in accordance with those laws. This Agreement is subject to the Securities Exchange Act of 1934, the rules promulgated under that act, and the joint-industry plans entered into pursuant to that act. This writing contains the entire agreement between the parties in respect of its subject matter. Subscriber may not assign all or any part of this Agreement to any other person. The person executing this Agreement below represents and warrants that he or she has legal capacity to contract and, if that person is executing this Agreement on behalf of a proprietorship or a business, partnership or other organization, represents and warrants that he or she has actual authority to bind the organization.</p>
              </CCol> }
            { currentComplianceStep == 3 &&
              <>
                <CCol className='col-12'>
                  <span className='h5'>Section 2: Nonprofessional Subscriber Definition</span>
                  <p className='mt-3'><strong>9. NONPROFESSIONAL SUBSCRIBER DEFINITION</strong> -"Nonprofessional Subscriber" means any natural person who receives market data solely for his/her personal, nonbusiness use and who is not a “Securities Professional.” A “Securities Professional” includes an individual who, if working in the United States, is: (a) registered or qualified with the Securities and Exchange Commission (the "SEC"), the Commodities Futures Trading Commission, any state securities agency, any securities exchange or association, or any commodities or futures contract market or association. (b) engaged as an "investment advisor" as that term is defined in Section 202 (a) (11) of the Investment Advisor's Act of 1940 (whether or not registered or qualified under that Act), or (c) employed by a bank or other organization exempt from registration under Federal and/or state securities laws to perform functions that would require him or her to be so registered or qualified if he or she were to perform such functions for an organization not so exempt. A person who works outside of the United States will be considered a “Securities Professional” if he or she performs the same functions as someone who would be considered a “Securities Professional” in the United States. Subscriber may not receive Market Data as a “Nonprofessional Subscriber” unless the vendor providing that data to Subscriber first determines that the individual falls within Paragraph 9’s definition of “Nonprofessional Subscriber.”</p>
                  <p className='mt-3'><strong>10. PERMITTED RECEIPT</strong> - Subscriber may not receive Market Data from Vendor, and Vendor may not provide Market Data to Subscriber, on a “Nonprofessional Subscriber” basis unless Vendor first properly determines that Subscriber qualifies as a “Nonprofessional Subscriber” as defined in Paragraph 9 and Subscriber in fact qualifies as a “Nonprofessional Subscriber.”</p>
                  <p className='mt-3'><strong>11. PERMITTED USE</strong> – If Subscriber is a Nonprofessional Subscriber, he or she shall receive Market Data solely for his or her personal, non-business use.</p>
                  <p className='mt-3'><strong>12. PERSONAL AND EMPLOYMENT DATA</strong> – As a prerequisite to qualifying as a "Nonprofessional Subscriber", Subscriber shall provide the following information:</p>
                </CCol>
                <hr />
                <Formik
                  innerRef={formRef}
                  initialValues={initialValues}
                  validate={validate(validationSchema)}
                  // onSubmit={nextComplianceStep}
                >
                  {
                    ({
                      values,
                      errors,
                      touched,
                      handleChange,
                      handleBlur,
                      setFieldValue
                    }) => (
                      <CForm noValidate name='simpleForm' className='compliance_form row'>
                        <CCol className='col-6'>
                            <CFormGroup>
                              {/* <CLabel htmlFor='subOccupation'>Subscribers Occupations</CLabel> */}
                              <CInput type='text'
                                      name='subOccupation'
                                      id='subOccupation'
                                      placeholder='Subscribers Occupations'
                                      valid={touched.subOccupation && !errors.subOccupation}
                                      invalid={touched.subOccupation && !!errors.subOccupation}
                                      required
                                      onChange={(event) => {
                                        setSubOccupation(event.target.value)
                                        handleChange(event)
                                      }}
                                      onBlur={handleBlur}
                                      value={subOccupation} />
                              {/* <CInvalidFeedback>{errors.subOccupation}</CInvalidFeedback> */}
                            </CFormGroup>
                        </CCol>
                        <CCol className='col-6'>
                            <CFormGroup>
                              {/* <CLabel htmlFor="subOrganization">Organization</CLabel> */}
                              <CInput type='text'
                                      name='subOrganization'
                                      id='subOrganization'
                                      placeholder='Organization'
                                      valid={touched.subOrganization && !errors.subOrganization}
                                      invalid={touched.subOrganization && !!errors.subOrganization}
                                      required
                                      onChange={(event) => {
                                        setSubOrganization(event.target.value)
                                        handleChange(event)
                                      }}
                                      onBlur={handleBlur}
                                      value={subOrganization} />
                              {/* <CInvalidFeedback>{errors.subOrganization}</CInvalidFeedback> */}
                            </CFormGroup>
                        </CCol> 
                        <CCol className='col-6'>
                            <CFormGroup>
                              {/* <CLabel htmlFor="jobTitle">Job Title</CLabel> */}
                              <CInput type='text'
                                      name='jobTitle'
                                      id='jobTitle'
                                      placeholder='Job Title'
                                      valid={touched.jobTitle && !errors.jobTitle}
                                      invalid={touched.jobTitle && !!errors.jobTitle}
                                      required
                                      onChange={(event) => {
                                        setJobTitle(event.target.value)
                                        handleChange(event)
                                      }}
                                      onBlur={handleBlur}
                                      value={jobTitle} />
                              {/* <CInvalidFeedback>{errors.jobTitle}</CInvalidFeedback> */}
                            </CFormGroup>
                        </CCol>
                        <CCol className='col-6'>
                            <CFormGroup>
                              {/* <CLabel htmlFor="jobFunctions">Job Functions</CLabel> */}
                              <CInput type='text'
                                      name='jobFunctions'
                                      id='jobFunctions'
                                      placeholder='Job Functions'
                                      valid={touched.jobFunctions && !errors.jobFunctions}
                                      invalid={touched.jobFunctions && !!errors.jobFunctions}
                                      required
                                      onChange={(event) => {
                                        setJobFunctions(event.target.value)
                                        handleChange(event)
                                      }}
                                      onBlur={handleBlur}
                                      value={jobFunctions} />
                              {/* <CInvalidFeedback>{errors.jobFunctions}</CInvalidFeedback> */}
                            </CFormGroup>
                        </CCol> 
                        <CCol className='col-6'>
                            <CFormGroup>
                              {/* <CLabel htmlFor="selectedCountry">Country</CLabel> */}
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
                                    return <option key={index} value={countryObject.country_name}>{countryObject.country_name}</option>
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
                              {/* <CInvalidFeedback>{errors.selectedCountry}</CInvalidFeedback> */}
                            </CFormGroup>
                        </CCol>
                        <CCol className='col-6'>
                            <CFormGroup>
                              {/* <CLabel htmlFor="selectedState">State</CLabel> */}
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
                              {/* <CInvalidFeedback>{errors.selectedState}</CInvalidFeedback> */}
                            </CFormGroup>
                        </CCol>
                        <CCol className='col-6'>
                            <CFormGroup>
                              {/* <CLabel htmlFor="selectedCity">City</CLabel> */}
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
                              {/* <CInvalidFeedback>{errors.selectedCity}</CInvalidFeedback> */}
                            </CFormGroup>
                        </CCol>
                        <CCol className='col-6'>
                            <CFormGroup>
                              {/* <CLabel htmlFor="zipCode">ZIP Code</CLabel> */}
                              <CInput type='text'
                                      name='zipCode'
                                      id='zipCode'
                                      placeholder='ZIP Code'
                                      valid={touched.zipCode && !errors.zipCode}
                                      invalid={touched.zipCode && !!errors.zipCode}
                                      required
                                      onChange={(event) => {
                                        setZipCode(event.target.value)
                                        handleChange(event)
                                      }}
                                      onBlur={handleBlur}
                                      value={zipCode} />
                              {/* <CInvalidFeedback>{errors.zipCode}</CInvalidFeedback> */}
                            </CFormGroup>
                        </CCol>
                        <CCol className='col-12'>
                            <CFormGroup>
                              {/* <CLabel htmlFor="mailingAddress">Mailing Address</CLabel> */}
                              <CInput type='text'
                                      name='mailingAddress'
                                      id='mailingAddress'
                                      placeholder='Mailing Address'
                                      valid={touched.mailingAddress && !errors.mailingAddress}
                                      invalid={touched.mailingAddress && !!errors.mailingAddress}
                                      required
                                      onChange={(event) => {
                                        setMailingAddress(event.target.value)
                                        handleChange(event)
                                      }}
                                      onBlur={handleBlur}
                                      value={mailingAddress} />
                              {/* <CInvalidFeedback>{errors.mailingAddress}</CInvalidFeedback> */}
                            </CFormGroup>
                        </CCol>
                      </CForm>
                    )}
                </Formik>
              </> }
            { currentComplianceStep == 4 &&
              <CCol>
                <span className='h5'>Questionnaire</span>
                <div className='mt-3 d-flex justify-content-between align-items-center'>
                  <p style={{display: 'flex', flex: 1, marginRight: '5%'}}>Do you use Market Data solely for your personal, non-business use?</p>
                  <CSwitch 
                    className={'mx-1'} 
                    shape={'pill'} 
                    color={'primary'} 
                    labelOn={'\u2713'} 
                    labelOff={'\u2715'} 
                    checked={Q1}
                    onChange={() => setQ1(!Q1)} 
                  />
                </div>
                <hr />
                <div className='mt-3 d-flex justify-content-between align-items-center'>
                  <p style={{display: 'flex', flex: 1, marginRight: '5%'}}>Do you receive Market Data for your business or any other entity?</p>
                  <CSwitch 
                    className={'mx-1'} 
                    shape={'pill'} 
                    color={'primary'} 
                    labelOn={'\u2713'} 
                    labelOff={'\u2715'} 
                    checked={Q2}
                    onChange={() => setQ2(!Q2)} 
                  />
                </div>
                <hr />
                <div className='mt-3 d-flex justify-content-between align-items-center'>
                  <p style={{display: 'flex', flex: 1, marginRight: '5%'}}>Are you currently registered or qualified with the SEC or the CFTC?</p>
                  <CSwitch 
                    className={'mx-1'} 
                    shape={'pill'} 
                    color={'primary'} 
                    labelOn={'\u2713'} 
                    labelOff={'\u2715'} 
                    checked={Q3}
                    onChange={() => setQ3(!Q3)} 
                  />
                </div>
                <hr />
                <div className='mt-3 d-flex justify-content-between align-items-center'>
                  <p style={{display: 'flex', flex: 1, marginRight: '5%'}}>Are you currently registered or qualified with any securities agency, any securities exchange, association or regulatory body, or any commodities or futures contract market, association or regulatory body, in the United States or elsewhere?</p>
                  <CSwitch 
                    className={'mx-1'} 
                    shape={'pill'} 
                    color={'primary'} 
                    labelOn={'\u2713'} 
                    labelOff={'\u2715'} 
                    checked={Q4}
                    onChange={() => setQ4(!Q4)} 
                  />
                </div>
                <hr />
                <div className='mt-3 d-flex justify-content-between align-items-center'>
                  <p style={{display: 'flex', flex: 1, marginRight: '5%'}}>Whether you are located within or outside of the United States, do you perform any functions that are similar to those that require an individual to register or qualify with the SEC, the CFTC, any other securities agency or regulatory body, any securities exchange or association, or any commodities or futures contract market, association or regulatory body?</p>
                  <CSwitch 
                    className={'mx-1'} 
                    shape={'pill'} 
                    color={'primary'} 
                    labelOn={'\u2713'} 
                    labelOff={'\u2715'} 
                    checked={Q5}
                    onChange={() => setQ5(!Q5)} 
                  />
                </div>
                <hr />
                <div className='mt-3 d-flex justify-content-between align-items-center'>
                  <p style={{display: 'flex', flex: 1, marginRight: '5%'}}>Are you engaged to provide investment advice to any individual or entity?</p>
                  <CSwitch 
                    className={'mx-1'} 
                    shape={'pill'} 
                    color={'primary'} 
                    labelOn={'\u2713'} 
                    labelOff={'\u2715'} 
                    checked={Q6}
                    onChange={() => setQ6(!Q6)} 
                  />
                </div>
                <hr />
                <div className='mt-3 d-flex justify-content-between align-items-center'>
                  <p style={{display: 'flex', flex: 1, marginRight: '5%'}}>Are you engaged as an asset manager?</p>
                  <CSwitch 
                    className={'mx-1'} 
                    shape={'pill'} 
                    color={'primary'} 
                    labelOn={'\u2713'} 
                    labelOff={'\u2715'} 
                    checked={Q7}
                    onChange={() => setQ7(!Q7)} 
                  />
                </div>
                <hr />
                <div className='mt-3 d-flex justify-content-between align-items-center'>
                  <p style={{display: 'flex', flex: 1, marginRight: '5%'}}>Do you use the capital of any other individual or entity in the conduct of your trading?</p>
                  <CSwitch 
                    className={'mx-1'} 
                    shape={'pill'} 
                    color={'primary'} 
                    labelOn={'\u2713'} 
                    labelOff={'\u2715'} 
                    checked={Q8}
                    onChange={() => setQ8(!Q8)} 
                  />
                </div>
                <hr />
                <div className='mt-3 d-flex justify-content-between align-items-center'>
                  <p style={{display: 'flex', flex: 1, marginRight: '5%'}}>Do you conduct trading for the benefit of a corporation, partnership, or other entity?</p>
                  <CSwitch 
                    className={'mx-1'} 
                    shape={'pill'} 
                    color={'primary'} 
                    labelOn={'\u2713'} 
                    labelOff={'\u2715'} 
                    checked={Q9}
                    onChange={() => setQ9(!Q9)} 
                  />
                </div>
                <hr />
                <div className='mt-3 d-flex justify-content-between align-items-center'>
                  <p style={{display: 'flex', flex: 1, marginRight: '5%'}}>Have you entered into any agreement to share the profit of your trading activities or receive compensation for your trading activities?</p>
                  <CSwitch 
                    className={'mx-1'} 
                    shape={'pill'} 
                    color={'primary'} 
                    labelOn={'\u2713'} 
                    labelOff={'\u2715'} 
                    checked={Q10}
                    onChange={() => setQ10(!Q10)} 
                  />
                </div>
                <hr />
                <div className='mt-3 d-flex justify-content-between align-items-center'>
                  <p style={{display: 'flex', flex: 1, marginRight: '5%'}}>Are you receiving office space, and equipment or other benefits in exchange for your trading or work as a financial consultant to any person, firm or business entity?</p>
                  <CSwitch 
                    className={'mx-1'} 
                    shape={'pill'} 
                    color={'primary'} 
                    labelOn={'\u2713'} 
                    labelOff={'\u2715'} 
                    checked={Q11}
                    onChange={() => setQ11(!Q11)} 
                  />
                </div>
              </CCol> }
            { currentComplianceStep == 5 &&
              <CCol>
                <span className='h5'>Certification</span>
                <p className='mt-3'>By executing this Agreement, Subscriber hereby certifies that he or she falls within Paragraph 9's definition of "Nonprofessional Subscriber" and that the personal and employment information that he or she has included in Paragraph 12 is truthful and accurate. *** ACCEPTED AND AGREED: I, the "Subscriber" to which the preceding terms and conditions refer, acknowledge that I have read the preceding terms and conditions, that I understand them and that I hereby agree to comply with those terms and conditions. IN WITNESS WHEREOF, the parties have caused this Agreement to be executed as of <strong className='text-danger'>{moment(new Date().getTime()).format('LLLL')}</strong></p>
              </CCol> }
          </CRow>
        </CModalBody>
        <CModalFooter className='justify-content-between'>
          <CButton className='btn-pill font-weight-bold' color="danger">Just Cancel My Account</CButton>
          { currentComplianceStep == 1 &&
            <CButton onClick={nextComplianceStep} className='btn-pill font-weight-bold' color="primary">I Understand</CButton>}
          { currentComplianceStep == 2 &&
            <div className='d-flex'>
              <CButton onClick={previousComplianceStep} className='btn-pill font-weight-bold mr-2' color="primary">Back</CButton>
              <CButton onClick={nextComplianceStep} className='btn-pill font-weight-bold' color="primary">I Agree</CButton>
            </div>}
          { currentComplianceStep == 3 &&
            <div className='d-flex'>
              <CButton onClick={previousComplianceStep} className='btn-pill font-weight-bold mr-2' color="primary">Back</CButton>
              <CButton onClick={nextComplianceStep} className='btn-pill font-weight-bold' color="primary">Continue</CButton>
            </div>}
          { currentComplianceStep == 4 &&
            <div className='d-flex'>
              <CButton onClick={previousComplianceStep} className='btn-pill font-weight-bold mr-2' color="primary">Back</CButton>
              <CButton onClick={nextComplianceStep} className='btn-pill font-weight-bold' color="primary">Continue</CButton>
            </div>}
          { currentComplianceStep == 5 &&
            <div className='d-flex'>
              <CButton onClick={previousComplianceStep} className='btn-pill font-weight-bold mr-2' color="primary">Back</CButton>
              <CButton onClick={fnishCompliance} className='btn-pill font-weight-bold' color="primary">{'Accept & Finish'}</CButton>
            </div>}
        </CModalFooter>
      </CModal>
    </>
  )
}

const mapStateToProps = (state) => {
  return {
    charts: state.charts.charts,
    updateTheCharts: state.charts.updateTheCharts,
    brands: state.charts.brands,
    mainHeight: state.charts.mainHeight,
    headerHeight: state.charts.headerHeight,
    fullScreenMode: state.charts.fullScreenMode,
    fullScreenBrand: state.charts.fullScreenBrand,
    brandsModelShow: state.charts.brandsModelShow,
    settingsModelShow: state.charts.settingsModelShow,
    currentChartSettings: state.charts.currentChartSettings,
    screenShotSrc: state.charts.screenShotSrc,
    showScreenShotModal: state.charts.showScreenShotModal,
    selectedChart: state.charts.selectedChart,
    showTourSteps: state.charts.showTourSteps,
    showTour: state.firebase.profile.showTour,
    compSigned: state.firebase.profile.compSigned,
    geoPullApi: state.misc.geoPullApi,
    updateProfileError: state.user.updateProfileError
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    updateProperty: (property) => dispatch(updateProperty(property)),
    EditProfile: (propertyUpdate) => dispatch(EditProfile(propertyUpdate)),
    SetChartSettings: (
      newChartSettings, chartSymbol, resetChartData, synchronizeChart
    ) => dispatch(SetChartSettings(newChartSettings, chartSymbol, resetChartData, synchronizeChart)),
    getGeoToken: () => dispatch(getGeoToken()),
    getGeoCountry: () => dispatch(getGeoCountry()),
    getGeoState: (country) => dispatch(getGeoState(country)),
    getGeoCity: (state) => dispatch(getGeoCity(state))
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Dashboard)