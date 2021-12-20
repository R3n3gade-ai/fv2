import React, { useEffect, useState } from 'react'
import  { Redirect } from 'react-router-dom'
import { compose } from 'redux'
import { connect } from 'react-redux'
import { firebaseConnect } from 'react-redux-firebase'
import { updateProperty } from '../store/actions/StylesActions'
import { EditProfile } from '../store/actions/UserActions'
import classNames from 'classnames'
import {
  TheContent,
  TheSidebar,
  TheAside,
  TheScanAside,
  TheWatchListAside,
  TheFooter,
  TheHeader,
  TheLoader
} from './index'

import Joyride, { ACTIONS, CallBackProps, EVENTS, STATUS, Step } from 'react-joyride'

let loadCharts = [],
    loadSymbols = [],
    loadFullScreenBrand = {}

const TheLayout = props => {
  const {
    auth,
    loadedProfile,
    darkMode,
    charts,
    existingCharts,
    chartSettings,
    updateTheCharts,
    dbCharts,
    defaultChart,
    showTourSteps,
    fullScreenBrand,
    fullScreenMode,
    newChartLoaded,
    updateProperty,
    EditProfile
  } = props;

  if (!auth.uid) {
    return <Redirect to='/login' />
  }

  const [tourSteps, setTourSteps] = useState([
    {
      target: '.first-step',
      content: (
        <div>
          You can add new symbols by using this button
          <br />
          You can choose up to 4 ticks to display in the dashboard
        </div>
      ),
      disableBeacon: true,
      disableOverlayClose: true,
      hideCloseButton: true,
      // hideFooter: true,
      placement: 'top',
      // spotlightClicks: true,
      title: 'Add New Symbol',
    },
    {
      target: '.second-step',
      content: 'Display our Divergence algorithm which detects automatically divergence and plot it in realtime in your favorites charts',
      disableBeacon: true,
      disableOverlayClose: true,
      hideCloseButton: true,
      // hideFooter: true,
      placement: 'bottom',
      // spotlightClicks: true,
      title: 'Divergence',
    },
    {
      target: '.third-step',
      content: 'Scans are published regulary for helping you get most of our analysis',
      disableBeacon: true,
      disableOverlayClose: true,
      hideCloseButton: true,
      // hideFooter: true,
      placement: 'bottom',
      // spotlightClicks: true,
      title: 'Scans',
    },
    {
      target: '.fourth-step',
      content: 'Manage your watchlist from here, add your favorite ticks and make your trading experience better',
      disableBeacon: true,
      disableOverlayClose: true,
      hideCloseButton: true,
      // hideFooter: true,
      placement: 'bottom',
      // spotlightClicks: true,
      title: 'Watchlist',
    },
    {
      target: '.fifth-step',
      content: 'Blocks section will display trading blocks, regular and dark in realtime',
      disableBeacon: true,
      disableOverlayClose: true,
      hideCloseButton: true,
      // hideFooter: true,
      placement: 'right',
      // spotlightClicks: true,
      title: 'Blocks',
    }
  ])
  const [stepIndex, setStepIndex] = useState(0)
  const [firstLoad, setFirstLoad] = useState(true)

  const classes = classNames(
    'c-app c-default-layout',
    darkMode && 'c-dark-theme'
  )

  useEffect(() => {
    if (typeof dbCharts !== typeof undefined && typeof defaultChart !== typeof undefined) {
      if (dbCharts[auth.uid] !== null) {
        Object.keys(dbCharts[auth.uid]).map(theDbIndex => {
          let singleDbChart = dbCharts[auth.uid][theDbIndex],
              singleDefaultStyle = defaultChart[auth.uid] !== null ? defaultChart[auth.uid] : {},
              dbIndex = parseInt(theDbIndex)

          addMarket(singleDbChart.name, singleDbChart.uid, singleDbChart.chartSettings, dbIndex, singleDefaultStyle)
        })

        updateProperty({
          charts: loadCharts, 
          fullScreenBrand: loadFullScreenBrand,
          newChartLoaded: Object.keys(loadFullScreenBrand).length > 0 ? true : false,
          existingCharts: loadSymbols,
          updateTheCharts: !updateTheCharts
        })
        
        loadCharts = []
        loadSymbols = []
        loadFullScreenBrand = {}
      } else {
        updateProperty({charts: [], updateTheCharts: !updateTheCharts})
      }
    }
  }, [dbCharts, defaultChart, showTourSteps])

  const addMarket = (brandSymbol, brandUid, syncChartSettings, mapIndex, singleDefaultStyle) => {
    // if (currentBrand.length > 0 && !existingChart) {
      let instantChartSetting = {
          chartUid: brandUid,
          chartIcon: brandSymbol.toLowerCase(),
          chartSymbol: brandSymbol,
          chartBrand: '',
          chartSettings: {
            ...{
              chartType: 'ohlc',
              blocktradesDates: 30
            },
            ...chartSettings,
            ...syncChartSettings,
            ...{
              chartDbIndex: mapIndex
            },
            ...singleDefaultStyle
          },
          chartData: []
      }

      if (fullScreenMode && fullScreenBrand.chartSettings.chartDbIndex == mapIndex) {
        loadFullScreenBrand = instantChartSetting
      }

      loadCharts = [
        ...loadCharts,
        ...[instantChartSetting]
      ]

      if (!loadSymbols.includes(brandUid)) loadSymbols.push(brandUid)
    // }
  }

  const handleJoyrideCallback = (data) => {
    const { action, index, type, status } = data;

    if (([STATUS.FINISHED, STATUS.SKIPPED]).includes(status)) {
      EditProfile({
        showTour: false
      })

      updateProperty({showTourSteps: false})
      setStepIndex(0)
    } else if (([EVENTS.STEP_AFTER, EVENTS.TARGET_NOT_FOUND]).includes(type)) {
      const stepIndex = index + (action === ACTIONS.PREV ? -1 : 1)
      updateProperty({showTourSteps: true})
      setStepIndex(stepIndex)
    }
  }

  if (!loadedProfile) {
    return (
      <div className={classes}>
        <TheLoader/>
      </div>
    )
  } else {
    return (
      <div className={classes}>
        <TheSidebar/>
        <TheAside />
        <TheScanAside />
        <TheWatchListAside />
        <div className="c-wrapper">
          <TheHeader/>
          <div className="c-body">
            <TheContent/>
          </div>
          <Joyride
            continuous={true}
            steps={tourSteps}
            run={showTourSteps}
            stepIndex={stepIndex}
            scrollToFirstStep={true}
            showProgress={true}
            showSkipButton={true}
            styles={{
              options: {
                arrowColor: 'rgb(42, 43, 54)',
                backgroundColor: 'rgb(42, 43, 54)',
                overlayColor: 'rgba(0, 0, 0, 0.55)',
                primaryColor: '#1992e3',
                textColor: 'rgba(255, 255, 255, 0.75)',
                zIndex: 10000,
              }
            }}
            callback={handleJoyrideCallback}
          />
          {/* <TheFooter/> */}
        </div>
      </div>
    )
  }
}

const mapStateToProps = (state) => {
  return {
    auth: state.firebase.auth,
    loadedProfile: state.firebase.auth.isLoaded && !state.firebase.profile.isEmpty,
    darkMode: state.charts.darkMode,
    charts: state.charts.charts,
    existingCharts: state.charts.existingCharts,
    chartSettings: state.charts.chartSettings,
    updateTheCharts: state.charts.updateTheCharts,
    dbCharts: state.firebase.data.favoritesv2,
    defaultChart: state.firebase.data.defaultv2,
    showTourSteps: state.charts.showTourSteps,
    fullScreenMode: state.charts.fullScreenMode,
    fullScreenBrand: state.charts.fullScreenBrand,
    newChartLoaded: state.charts.newChartLoaded
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    updateProperty: (property) => dispatch(updateProperty(property)),
    EditProfile: (propertyUpdate) => dispatch(EditProfile(propertyUpdate))
  }
}

export default compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  ),
  firebaseConnect((props) => ([
    `favoritesv2/${props.auth.uid}`,
    `defaultv2/${props.auth.uid}`
  ]))
)(TheLayout)
