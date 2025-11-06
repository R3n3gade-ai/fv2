import React, { 
  useCallback, 
  useState, 
  useEffect, 
  useRef 
} from 'react'
import { connect } from 'react-redux'
import { updateProperty } from '../../store/actions/StylesActions'
import { SetChartSettings, ResetChartSettings, EditWatchList } from '../../store/actions/ChartActions'
import { 
  getGeoToken, 
  getGeoCountry, 
  getGeoState, 
  getGeoCity 
} from '../../store/actions/MiscActions'
import { EditProfile, ShareDiscord } from '../../store/actions/UserActions'
import { signOut } from '../../store/actions/AuthActions'
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
  CToaster,

  CImg,
  CPopover
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
    fullScreenMode,
    //fullScreenBrand,
    brandsModelShow,
    settingsModelShow,
    currentChartSettings,
    screenShotSrc,
    showScreenShotModal,
    selectedChart,
    showTourSteps,
    showTour,
    watchList,
    watchListChanged,
    disableEvent,
    updateProfileError,
    updateInProgress,
    discordInfo,
    updateProperty,
    EditProfile,
    ShareDiscord,
    SetChartSettings,
    EditWatchList,
    signOut,
    ResetChartSettings
  } = props

  const [toasts, setToasts] = useState([])
  const [position, setPosition] = useState('top-center')
  const [autohide, setAutohide] = useState(true)
  const [autohideValue, setAutohideValue] = useState(5000)
  const [closeButton, setCloseButton] = useState(true)
  const [fade, setFade] = useState(true)
  const [toastType, setToastType] = useState('bg-danger')

  const [showConfirmationModal, setShowConfirmationModal] = useState(false)

  const complianceRef = useRef(null)
  const formRef = useRef(null)

  useEffect(async() => {
    if (updateProfileError !== null) {
      setToastType('bg-danger')
      addToast('Updating Failed', updateProfileError)
    }

    let showTourEffect = (typeof showTour == typeof undefined) ? true : showTour

    if (showTourEffect) {
      updateProperty({showTourSteps: true})
    }

    if(ps) ps.update()
  }, [brands, showTour, updateProfileError, watchListChanged])

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

  const toasters = (() => {
    return toasts.reduce((toasters, toast) => {
      toasters[toast.position] = toasters[toast.position] || []
      toasters[toast.position].push(toast)
      return toasters
    }, {})
  })()

  // TEMPORARY CODE //
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
    let returnVal = '';
    switch (val){
      case 0: 
        returnVal = "Jan";
        break;
      case 1: 
        returnVal = "Feb";
        break;
      case 2: 
        returnVal = "Mar";
        break;
      case 3: 
        returnVal = "Apr";
        break;
      case 4: 
        returnVal = "May";
        break;
      case 5: 
        returnVal = "Jun";
        break;
      case 6: 
        returnVal = "Jul";
        break;
      case 7: 
        returnVal = "Aug";
        break;
      case 8: 
        returnVal = "Sep";
        break;
      case 9: 
        returnVal = "Oct";
        break;
      case 10: 
        returnVal = "Nov";
        break;
      case 11: 
        returnVal = "Dec";
        break;
    }

    console.log(returnVal, val)
    return returnVal
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
    let month8 = 0;

    if (month1 == 0) {
      month2 = 11
    } else {
      month2 = month1 - 1
    }
    if (month2 == 0) {
      month3 = 11
    } else {
      month3 = month2 - 1
    }
    if (month3 == 0) {
      month4 = 11
    } else {
      month4 = month3 - 1
    }
    if (month4 == 0) {
      month5 = 11
    } else {
      month5 = month4 - 1
    }
    if (month5 == 0) {
      month6 = 11
    } else {
      month6 = month5 - 1
    }
    if (month6 == 0) {
      month7 = 11
    } else {
      month7 = month6 - 1
    }
    if (month7 == 0) {
      month8 = 11
    } else {
      month8 = month7 - 1
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
              month8UsersPaidCount: 0,
              month1UsersPaidAmount: 0,
              month2UsersPaidAmount: 0,
              month3UsersPaidAmount: 0,
              month4UsersPaidAmount: 0,
              month5UsersPaidAmount: 0,
              month6UsersPaidAmount: 0,
              month7UsersPaidAmount: 0,
              month8UsersPaidAmount: 0,
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
                      } else if (invoiceDate.getMonth() == month8) {
                        summaryReportRow.month8UsersPaidCount = summaryReportRow.month8UsersPaidCount + 1
                        summaryReportRow.month8UsersPaidAmount = summaryReportRow.month8UsersPaidAmount + invoiceAmount
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
      +",Count in " + returnsMonthStr(month8), " , Paid "+returnsMonthStr(month8)



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
          ["Paid "+returnsMonthStr(month7)] : exportedSummaryReport[bb].month7UsersPaidAmount,
          ["Count in " + returnsMonthStr(month8)]: exportedSummaryReport[bb].month8UsersPaidCount,
          ["Paid "+returnsMonthStr(month8)] : exportedSummaryReport[bb].month8UsersPaidAmount
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

  // TEMPORARY CODE END //
  
  return (
    <>
      {(charts.length < 4 && !fullScreenMode) && <CButton 
      onClick={() => updateProperty({selectedChart:null, brandsModelShow: true})}
      className='add-new-market_button first-step' shape='pill' color='primary'
      >
        <CIcon size={'xl'} name="cis-plus" className='mr-2' />
        Add New Symbol
      </CButton>}

      <ChartList />

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

      {brandsModelShow && <CModal
        show={brandsModelShow}
        onClose={() => {
          updateProperty({disableEvent: false, brandsModelShow: false})
        }}
        onClosed={() => updateProperty({disableEvent: false})}
        onOpened={() => {
          updateProperty({disableEvent: true})
          ps = new PerfectScrollbar('.symbols-modal-body')
        }}
        closeOnBackdrop={false}
      >
        <CModalHeader className='font-weight-bold' closeButton>Add New Symbol</CModalHeader>
        <CModalBody style={{paddingRight: 10}} className='pl-0 pb-0 pt-0 symbols-modal-body h-50'>
          <BrandList />
        </CModalBody>
      </CModal>}

      {settingsModelShow && <CModal
        show={settingsModelShow}
        onOpened={() => updateProperty({disableEvent: true})}
        onClose={() => {
          updateProperty({disableEvent: false, currentChartSettings: {}, settingsModelShow: !settingsModelShow})
        }}
        onClosed={() => updateProperty({disableEvent: false})}
        closeOnBackdrop={false}
        size='lg'
      >
        <CModalHeader className='h5 mb-0' closeButton>
          <div className='d-flex align-items-center'>
            Chart Settings
            <CButton size={'sm'} className='font-weight-bold ml-3' shape='pill' color='primary'
            onClick={ResetChartSettings}>
            Factory Reset
            </CButton>
          </div>
        </CModalHeader>
        <CModalBody className='p-0'>
          <SettingsList />
        </CModalBody>
      </CModal>}

      {showScreenShotModal && <CModal
        show={showScreenShotModal}
        onOpened={() => updateProperty({disableEvent: true})}
        onClose={() => {
          updateProperty({disableEvent: false, screenShotSrc: null, showScreenShotModal: !showScreenShotModal})
        }}
        onClosed={() => updateProperty({disableEvent: false})}
        closeOnBackdrop={false}
        size='lg'
      >
        <CModalHeader className='h5 mb-0' closeButton>ScreenShot Share</CModalHeader>
        <CModalBody className=''>
          { screenShotSrc == null &&
            <div style={{height: mainHeight, position: 'relative'}}><CSpinner className='absolute-spinner'/></div>
          }
          { screenShotSrc !== null &&
            <img width={'100%'} style={{borderRadius: 10}} src={screenShotSrc} />
          }
          {discordInfo &&
          <CButton 
            onClick={() => {
              ShareDiscord(screenShotSrc)
              updateProperty({showScreenShotModal: false})
            }}
            className='mt-3 font-weight-bold text-white' shape='pill' style={{backgroundColor: '#5865F2'}}>
                <div className='d-flex align-items-center'>
                    <div className='d-flex align-items-center'>
                        <CIcon size={'lg'} name="cib-discord" className='mr-1' /> Share on Discord
                    </div>
                </div>
          </CButton>}
        </CModalBody>
      </CModal>}

      <CModal
        show={showConfirmationModal}
        onOpened={() => updateProperty({disableEvent: true})}
        onClose={() => {
          updateProperty({disableEvent: false})
          setShowConfirmationModal(false)
        }}
        onClosed={() => updateProperty({disableEvent: false})}
        closeOnBackdrop={false}
        className='compact-modal'
        centered
      >
        <CModalHeader className='h5 mb-0' closeButton>Cancel confirmation</CModalHeader>
        <CModalBody className=''>
          <div>
            Are you sure you want to cancel your subscription ?
          </div>
        </CModalBody>
        <CModalFooter className='justify-content-start'>
          <CButton onClick={() => {
            EditProfile({
              cancelv2: true
            }, signOut())
            setShowConfirmationModal(false)
          }} className='btn-pill font-weight-bold' color='danger' 
            disabled={updateInProgress}>{updateInProgress ? 'Cancelling ...' : 'Yes, cancel my account'}</CButton>{' '}
          <CButton
            className='btn-pill font-weight-bold'
            color='secondary'
            onClick={() => setShowConfirmationModal(false)}
          >No</CButton>
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
    fullScreenMode: state.charts.fullScreenMode,
    brandsModelShow: state.charts.brandsModelShow,
    settingsModelShow: state.charts.settingsModelShow,
    currentChartSettings: state.charts.currentChartSettings,
    screenShotSrc: state.charts.screenShotSrc,
    showScreenShotModal: state.charts.showScreenShotModal,
    selectedChart: state.charts.selectedChart,
    showTourSteps: state.charts.showTourSteps,
    showTour: state.firebase.profile.showTour,
    watchList: state.charts.watchList,
    watchListChanged: state.charts.watchListChanged,
    disableEvent: state.charts.disableEvent,
    updateProfileError: state.user.updateProfileError,
    updateInProgress: state.user.updateInProgress,
    discordInfo: state.user.discordInfo
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    updateProperty: (property) => dispatch(updateProperty(property)),
    EditProfile: (propertyUpdate, requireAction) => dispatch(EditProfile(propertyUpdate, requireAction)),
    ShareDiscord: (pictureShare) => dispatch(ShareDiscord(pictureShare)),
    signOut: () => dispatch(signOut()),
    SetChartSettings: (
      newChartSettings, chartUid, resetChartData, synchronizeChart
    ) => dispatch(SetChartSettings(newChartSettings, chartUid, resetChartData, synchronizeChart)),
    ResetChartSettings: () => dispatch(ResetChartSettings()),
    EditWatchList: (brandSymbol) => dispatch(EditWatchList(brandSymbol))
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Dashboard)