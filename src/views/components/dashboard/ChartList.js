import React, { useCallback, useEffect, useState, useRef, useLayoutEffect } from "react"
import { compose } from 'redux'
import { connect } from 'react-redux'
import { firebaseConnect } from 'react-redux-firebase'

import { updateProperty } from '../../../store/actions/StylesActions'
import { EditWatchList, SetChartSettings, EditMarket, SearchSymbol } from '../../../store/actions/ChartActions'

import FtAsyncSelect from '../../components/common/FtAsyncSelect'

import PropTypes from "prop-types"
import {
  CRow,
  CCol,
  CCard,
  CCardHeader,
  CCardBody,
  CLink,
  CTooltip,

  CBadge,

  CSelect,
  CImg,

  CPopover,
  CButton,
  CInput
} from '@coreui/react'
import CIcon from '@coreui/icons-react'

import ChartRender from '../../charts/ChartRender'
import ChartHolder from '../../charts/ChartHolder'

import {
	deleteInteractiveNodes
} from "../../charts/Utils/InteractiveUtils"
import { useDetectClickOutside } from 'react-detect-click-outside'

import uniqid from 'uniqid'
import AsyncSelect  from 'react-select/async'

import { ErrorBoundary } from 'react-error-boundary'

import { isBrowser, isMobile } from 'react-device-detect'

const ChartList = props => {
    const {
      auth,
      charts,
      fullScreenMode,
      fullScreenBrand,
      mainHeight,
      headerHeight,
      settingsModelShow,
      showScreenShotModal,
      currentChartSettings,
      myWatchList,
      disableEvent,
      updateTheCharts,
      updateProperty,
      SetChartSettings,
      EditMarket,
      EditWatchList,
      selectedChart,
      selectedChartEvent,
      brandsModelShow
    } = props;

    const [currentEvent, setCurrentEvent] = useState(null)

    const [mapCharts, setMapCharts] = useState([])

    const selectedChartRef = useRef(null)
    const asyncSelectRef = useRef(null)

    const addEventListener = useRef(false)
    const disableEventListener = useRef(false)
    const currentSelectedChart = useRef(null)
    const searchedValues = useRef('')
    const enterChangeValue = useRef(true)
    const futuresSelect = useRef(false)

    const fullScreenModeRef = useRef(false)

    const showAsyncSelect = useRef(false)
    const [viewAsyncSelect, setViewAsyncSelect] = useState(false)

    const [showMobileMenu, setShowMobileMenu] = useState(false)

    const isCtrlKey = useRef(false)

    const headerRef = useCallback(node => {
      if (node !== null) {
        if (node.getBoundingClientRect().height > 0) {
          updateProperty({headerHeight: node.getBoundingClientRect().height})
        }
      }
    }, [])

    useEffect(() => {
      currentSelectedChart.current = selectedChart
      disableEventListener.current = disableEvent
      fullScreenModeRef.current = fullScreenMode

      if (!addEventListener.current) {
        addEventListener.current = true
        window.addEventListener('keydown', onKeyPress)
        window.addEventListener('wheel', onWheel, { passive: false })
      }
    }, [selectedChart, fullScreenMode, disableEvent])

    useEffect(() => {
        return () => {
            window.removeEventListener('keydown', onKeyPress)
            window.removeEventListener('wheel', onWheel, { passive: false })
            addEventListener.current = false
        }
    }, [])

    const onKeyPress = (event) => {
      if (currentSelectedChart.current != null && !disableEventListener.current) {
        if (event.altKey) {
          event.preventDefault()
          
          if (event.keyCode >= 65 && event.keyCode <= 90) {
            if (event.keyCode == 83) {
              if (!fullScreenModeRef.current) {
                updateProperty({
                  fullScreenBrand: currentSelectedChart.current, 
                  fullScreenMode:true
                })
              } else {
                updateProperty({
                  fullScreenMode:false
                })
              }
            } else {
              updateProperty({selectedChartEvent: {
                chart: currentSelectedChart.current,
                code: event.keyCode,
                uid: uniqid()
              }})
            }
          }
          return
        }

        if (event.keyCode == 13) {     
          if (showAsyncSelect.current) {
            let searchedValue = searchedValues.current.toUpperCase().replace('/', '')
            const securityType = futuresSelect.current ? 'futures' : 'stocks'

            setViewAsyncSelect(false)
            futuresSelect.current = false
            showAsyncSelect.current = false
            
            EditMarket(searchedValue, currentSelectedChart.current, false, {
              securityType: securityType
            })
            searchedValues.current = ''
          }
        } else if (event.keyCode == 27 && showAsyncSelect.current) {
            setViewAsyncSelect(false)
            futuresSelect.current = false
            showAsyncSelect.current = false
            searchedValues.current = ''
        } else if (
          (event.keyCode >= 65 && event.keyCode <= 90) ||
          (event.keyCode == 191 || event.keyCode == 111)
        ) {
          if (!showAsyncSelect.current) {
            if(event.keyCode == 191 || event.keyCode == 111) futuresSelect.current = true
            setViewAsyncSelect(currentSelectedChart.current)
            showAsyncSelect.current = currentSelectedChart.current
            asyncSelectRef.current.focus()
          }
        } else {
          if (event.which == 9) event.preventDefault()
          updateProperty({selectedChartEvent: {
            chart: currentSelectedChart.current,
            code: event.which,
            uid: uniqid()
          }})
        }
      }
    }

    const onWheel = (event) => {
      if (event.ctrlKey) {
        event.stopPropagation()
        event.preventDefault()
      }
    }

    if (charts.length == 0) {
      return (<CRow></CRow>)
    }

    return (
      <CRow className='parent_charts-list mr-0 ml-0'>
        <>
          {charts.map((chart, i) => {
            let securityTypeChartSymbol = ( chart.chartSettings.securityType == 'stocks' ) ? chart.chartSymbol : chart.chartSymbol + '*0'

            return (
              <CCol innerRef={selectedChart == chart.chartUid ? selectedChartRef : null} onClick={() => {
                updateProperty({selectedChartEvent: null, selectedChart: chart.chartUid})
              }} key={chart.chartUid} style={{height: fullScreenMode ? mainHeight : mainHeight/2}} 
                className={'chartlist-container ' + (
                  fullScreenMode ? (
                    fullScreenBrand != chart.chartUid ? 'd-none' : ''
                  ) : ''
                )} xs={'12'} sm={fullScreenMode ? '12' : '6'} md={fullScreenMode ? '12' : '6'}>
                {selectedChart == chart.chartUid && <div className='chartlist-container_shadow'></div>}
                <CCard className={'m-0' + ( selectedChart == chart.chartUid && ' z-index-2')}>
                  <CCardHeader innerRef={headerRef} className='card-header-actions mr-0 d-flex align-items-center justify-content-between c-header'>
                    <div style={{zIndex: 10}} className='d-flex w-50'>
                      {viewAsyncSelect == chart.chartUid && 
                        <FtAsyncSelect 
                          placeholderProps={'Symbols filter'}
                          isMultiProps={false}
                          refProps={asyncSelectRef}
                          futuresAsync={futuresSelect.current}
                          onChangeProps={(e) => {
                            if (enterChangeValue.current) {
                              const searchedValue = e.value
                              setViewAsyncSelect(false)
                              showAsyncSelect.current = false
                              
                              EditMarket(searchedValue, currentSelectedChart.current, false, {
                                securityType: futuresSelect.current ? 'futures' : 'stocks'
                              })
                            }

                            enterChangeValue.current = true
                          }}
                          onInputChangeProps={(e) => {
                            if (e != '') {
                              searchedValues.current = e
                            }
                          }}
                          onKeyDownProps={(e) => {
                            if (e.keyCode == 13) {
                              enterChangeValue.current = false
                            }
                          }}
                          defaultMenuIsOpen={true}
                        /> ||
                      <span onClick={() => updateProperty({brandsModelShow: true})}
                        className='h5 ml-2 mb-0 chart-symbol_container'>{chart.chartSymbol}</span>}
                    </div>
                    <div className='card-header-actions d-flex align-items-center'>
                      <CTooltip content='Time Frame'>
                        <CBadge 
                          shape="pill"
                          style={{
                            outline: '1.5px solid ' + chart.chartSettings.priceBarsColor,
                            cursor: 'pointer',
                            height: 20
                          }}
                          className="ml-1 mr-1 d-flex align-items-center justify-content-center"
                          onClick={() => {
                            localStorage.removeItem(chart.chartUid)
                            localStorage.removeItem('scale_' + chart.chartUid)
                            localStorage.removeItem('yScale_' + chart.chartUid)
                            SetChartSettings({
                              periodicity: chart.chartSettings.periodicity == '1m' ? '15m' : '1m'
                            }, chart.chartUid, false, true)
                          }}>
                          {chart.chartSettings.periodicity}
                        </CBadge>
                      </CTooltip>
                      {chart.chartSettings.securityType !== 'futures' && 
                        <CTooltip content='Flow Index'>
                          <CBadge 
                            shape="pill" 
                            style={{
                              outline: '1.5px solid ' + ( chart.chartSettings.flowIndex === 'normal' ? chart.chartSettings.flowIndexColor : (
                                  chart.chartSettings.flowIndex === 'dark-pool' ? chart.chartSettings.flowDarkIndexColor : chart.chartSettings.flowBothIndexColor
                              )),
                              cursor: 'pointer',
                              height: 20
                            }}
                            className="ml-1 mr-1 d-flex align-items-center justify-content-center"
                            onClick={() => {
                              let newFlowIndex
                              switch(chart.chartSettings.flowIndex) {
                                case 'normal':
                                  newFlowIndex = 'dark-pool'
                                  break
                                case 'dark-pool':
                                  newFlowIndex = 'both'
                                  break
                                case 'both':
                                  newFlowIndex = 'normal'
                                  break
                              }
  
                              SetChartSettings({
                                flowIndex: newFlowIndex
                              }, chart.chartUid, false, true)
                            }}>
                            {['normal', 'dark-pool', 'both'].map(flowType => {
                                if (chart.chartSettings.flowIndex == flowType) {
                                  switch(chart.chartSettings.flowIndex) {
                                    case 'normal':
                                      return 'Flow Index'
                                      break
                                    case 'dark-pool':
                                      return 'DarkPool Index'
                                      break
                                    case 'both':
                                      return 'Combo'
                                      break
                                  }
                                }
                            })}
                          </CBadge>
                        </CTooltip>
                      }

                      { isMobile && 
                        <CLink className='d-flex card-header-action pl-1 pr-1'
                          onClick={() => {
                            setShowMobileMenu( !showMobileMenu )
                          }}>
                            <CIcon name='cis-grip-dots-vertical' className={showMobileMenu ? `text-danger` : ``} height={20} />
                        </CLink>}
                      <div className={isMobile ? ( showMobileMenu ? `d-flex flex-column align-items-center custom-mobile_flex` : `d-none`) : `d-flex align-items-center`}>
                      { chart.chartSettings.replayMarket &&
                        <>
                          { !(chart.chartSettings.replayMarket == 'pause') && 
                            <CTooltip content='Pause Market'>
                              <CLink className={`card-header-action ` + isMobile ? `pt-1 pb-0` : `pl-1 pr-0`}
                                onClick={() => {
                                  SetChartSettings({
                                    replayMarket: 'pause'
                                  }, chart.chartUid, false, false)
                                }}>
                                  <CIcon name='cis-media-pause-circle' height={20} />
                              </CLink>
                          </CTooltip>}
                          { chart.chartSettings.replayMarket == 'pause' &&
                            <CTooltip content='Play Market'>
                            <CLink className={`card-header-action ` + isMobile ? `pt-1 pb-0` : `pl-1 pr-0`}
                              onClick={() => {
                                SetChartSettings({
                                  replayMarket: 'play'
                                }, chart.chartUid, false, false)
                              }}>
                                <CIcon name='cis-media-play-circle' height={20} />
                            </CLink>
                          </CTooltip>}
                          <CTooltip content='Stop Market'>
                            <CLink className={`card-header-action p-07`}
                              onClick={() => {
                                SetChartSettings({
                                  replayMarket: false
                                }, chart.chartUid, false, false)
                              }}>
                                <CIcon name='cis-media-stop-circle' height={20} />
                            </CLink>
                          </CTooltip>
                          <CTooltip content='Speed'>
                            <div className={`card-header-action p-07`}>
                              <CSelect 
                                custom size="xs" name="selectSm" id="SelectLm" 
                                value={chart.chartSettings.replayMarketSettings.speed}
                                onChange={(e) => {
                                  SetChartSettings({
                                    replayMarketSettings: {
                                      speed: e.target.value
                                    }
                                  }, chart.chartUid, false, false)
                                }}>
                                <option value="500">Slow</option>
                                <option value="250">Normal</option>
                                <option value="100">Fast</option>
                              </CSelect>
                            </div>
                          </CTooltip>            
                        </>          
                      }
                      { !chart.chartSettings.replayMarket &&
                        <>
                          <CTooltip content='Watch List'>
                            <CLink className={`d-flex card-header-action ` + ( isMobile ? `pt-1 pb-1` : `pl-1 pr-1` )}
                              onClick={() => {
                                EditWatchList(securityTypeChartSymbol, !(securityTypeChartSymbol in myWatchList))
                              }}>
                                {securityTypeChartSymbol in myWatchList && 
                                  <CIcon height={20} className='text-danger d-flex' name="cis-queue-remove" /> ||
                                  <CIcon className='d-flex' name='cil-queue-add' height={20} />  }
                            </CLink>
                          </CTooltip>
                          <div onClick={(e) => {
                            if (e.target.parentNode.classList.contains('chartTypes-option') ||
                              e.target.parentNode.classList.contains('chartTypes-list')
                            ) {
                              let changeChartType = e.target.parentNode.classList.contains('chartTypes-option') ?
                                e.target.parentNode.getAttribute('data-chartype') : e.target.getAttribute('data-chartype')

                              SetChartSettings({
                                chartType: changeChartType
                              }, chart.chartUid, false, true)
                            }
                          }}>
                            <CPopover
                              content={React.createElement(
                                  'ul', {
                                      className: 'chartTypes-list',
                                  },
                                      React.createElement('div', {className: 'chartTypes-option' + 
                                        (chart.chartSettings.chartType == 'ohlc' ? ' chartTypes-option-selected' : ''),
                                        'data-chartype': 'ohlc'}, 
                                        React.createElement('img', {src: React.icons.Tools.ohlc},null),
                                        React.createElement('span', {},'OHLC'),
                                      ),
                                      React.createElement('div', {className: 'chartTypes-option' + 
                                        (chart.chartSettings.chartType == 'candles' ? ' chartTypes-option-selected' : ''),
                                        'data-chartype': 'candles'}, 
                                        React.createElement('img', {src: React.icons.Tools.candles},null),
                                        React.createElement('span', {},'Candles'),
                                      ),
                              )}
                              placement={'bottom'}
                              interactive={true}
                              trigger='click'
                            >
                              <CImg
                                className={`d-flex card-header-action ` + ( isMobile ? `pt-1 pb-1` : `pl-1 pr-1` ) + ` chartType-container`}
                                src={React.icons.Tools[chart.chartSettings.chartType]}
                              />
                            </CPopover>
                          </div>
                          {!chart.chartSettings.drawingMode &&
                          <CTooltip content='Drawing Tools'>
                            <CLink className={`d-flex card-header-action ` + ( isMobile ? `pt-1 pb-1` : `pl-1 pr-1` )}
                              onClick={() => {
                                SetChartSettings({
                                  drawingMode: true
                                }, chart.chartUid, false, true)
                              }}>
                                <CIcon className='d-flex' name='cil-color-border' height={20} />
                            </CLink>
                          </CTooltip>}
                          {chart.chartSettings.drawingMode &&
                          <div className={isMobile ? `d-flex flex-column-reverse align-items-center` : `d-flex align-items-center`} style={{
                            backgroundColor: 'rgba(0, 0, 21, 0.75)',
                            borderRadius: 5,
                            padding: '5px 2px 5px 2px',
                            boxShadow: '0 2px 2px 0 rgba(var(--elevation-base-color), .14), 0 3px 1px -2px rgba(var(--elevation-base-color), .12), 0 1px 5px 0 rgba(var(--elevation-base-color), .20)'
                          }}>
                            <CTooltip content='Fibonacci Retracements ( ALT+F )'>
                              <CLink className={`d-flex card-header-action ` + ( isMobile ? `pt-1 pb-1` : `pl-0 pr-0` )}
                                onClick={() => {
                                  SetChartSettings({
                                    fibonacciRetracements: !chart.chartSettings.fibonacciRetracements,
                                    fibonacciTrendLineColor: chart.chartSettings.fibonacciRetracementsColor
                                  }, chart.chartUid, false, false)
                                }}>
                                  {chart.chartSettings.fibonacciRetracements &&
                                    <CImg
                                      className='d-flex card-header-action chartType-container'
                                      height={20}
                                      src={React.icons.Tools['fibonacciHeaderSelected']}
                                    /> ||
                                    <CImg
                                      className='d-flex card-header-action chartType-container'
                                      height={20}
                                      src={React.icons.Tools['fibonacciHeader']}
                                    />
                                  }
                              </CLink>
                            </CTooltip>
                            <CTooltip content='Finite Line ( ALT+L )'>
                              <CLink className={`d-flex card-header-action ` + ( isMobile ? `pt-1 pb-1` : `pl-0 pr-0` )}
                                onClick={() => {
                                  SetChartSettings({
                                    trendLine: !chart.chartSettings.trendLine,
                                    trendLineType: 'LINE',
                                    trendLineColor: chart.chartSettings.trendLineLineColor
                                  }, chart.chartUid, false, false)
                                }}>
                                  {(chart.chartSettings.trendLine && chart.chartSettings.trendLineType == 'LINE') &&
                                    <CImg
                                      className='d-flex card-header-action chartType-container'
                                      src={React.icons.Tools['sLineHeaderSelected']}
                                    /> ||
                                    <CImg
                                      className='d-flex card-header-action chartType-container'
                                      src={React.icons.Tools['sLineHeader']}
                                    />
                                  }
                              </CLink>
                            </CTooltip>
                            <CTooltip content='Semi-Infinite Line ( ALT+R )'>
                              <CLink className={`d-flex card-header-action ` + ( isMobile ? `pt-0 pb-0` : `pl-0 pr-0` )}
                                onClick={() => {
                                  SetChartSettings({
                                    trendLine: !chart.chartSettings.trendLine,
                                    trendLineType: 'RAY',
                                    trendLineColor: chart.chartSettings.trendLineRayColor
                                  }, chart.chartUid, false, false)
                                }}>
                                  {(chart.chartSettings.trendLine && chart.chartSettings.trendLineType == 'RAY') &&
                                    <CImg
                                      className='d-flex card-header-action chartType-container'
                                      height={20}
                                      src={React.icons.Tools['siLineHeaderSelected']}
                                    /> || 
                                    <CImg
                                      className='d-flex card-header-action chartType-container'
                                      height={20}
                                      src={React.icons.Tools['siLineHeader']}
                                    />
                                  }
                              </CLink>
                            </CTooltip>
                            <CTooltip content='Infinite Line ( ALT+X )'>
                              <CLink className={`d-flex card-header-action ` + ( isMobile ? `pt-1 pb-1` : `pl-0 pr-0` )}
                                onClick={() => {
                                  SetChartSettings({
                                    trendLine: !chart.chartSettings.trendLine,
                                    trendLineType: 'XLINE',
                                    trendLineColor: chart.chartSettings.trendLineXlineColor
                                  }, chart.chartUid, false, false)
                                }}>
                                  {(chart.chartSettings.trendLine && chart.chartSettings.trendLineType == 'XLINE') &&
                                    <CImg
                                      className='d-flex card-header-action chartType-container'
                                      height={20}
                                      src={React.icons.Tools['iLineHeaderSelected']}
                                    /> || 
                                    <CImg
                                      className='d-flex card-header-action chartType-container'
                                      height={20}
                                      src={React.icons.Tools['iLineHeader']}
                                    />
                                  }

                              </CLink>
                            </CTooltip>
                            <CTooltip content='Drawing Tools'>
                              <CLink className={`d-flex card-header-action ` + ( isMobile ? `pt-1 pb-1` : `pl-1 pr-1` )}
                                onClick={() => {
                                  SetChartSettings({
                                    drawingMode: false
                                  }, chart.chartUid, false, true)
                                }}>
                                  <CIcon className='d-flex text-danger' name='cis-color-border' height={20} />
                              </CLink>
                            </CTooltip>
                          </div>}
                          <CTooltip content='ScreenShot'>
                            <CLink className={`d-flex card-header-action ` + ( isMobile ? `pt-1 pb-1` : `pl-1 pr-1` )}
                              onClick={() => {
                                SetChartSettings({
                                  takeScreenShot: true
                                }, chart.chartUid, false, false)
                                updateProperty({showScreenShotModal: !showScreenShotModal})
                              }}>
                                <CIcon className='d-flex' name='cis-images' height={20} />
                            </CLink>
                          </CTooltip>
                          {!chart.chartSettings.blocksLine &&                           
                          <CTooltip content='Show BlockTrades'>
                            <CLink className={`d-flex card-header-action ` + ( isMobile ? `pt-1 pb-1` : `pl-1 pr-1` )}
                              onClick={() => {
                                SetChartSettings({
                                  blocksLine: !chart.chartSettings.blocksLine
                                }, chart.chartUid, false, true)
                              }}>
                                <CIcon className='d-flex' name='cil-image-broken' height={20} />
                            </CLink>
                          </CTooltip>}
                          {chart.chartSettings.blocksLine &&
                          <div className={isMobile ? `d-flex flex-column-reverse align-items-center` : `d-flex align-items-center`} style={{
                            backgroundColor: 'rgba(0, 0, 21, 0.75)',
                            borderRadius: 5,
                            padding: '5px 2px 5px 2px',
                            boxShadow: '0 2px 2px 0 rgba(var(--elevation-base-color), .14), 0 3px 1px -2px rgba(var(--elevation-base-color), .12), 0 1px 5px 0 rgba(var(--elevation-base-color), .20)'
                          }}>
                            <CInput 
                              style={{width: '60px'}} size='xs' type='number' 
                              value={chart.chartSettings.blocktradesDates} onChange={(e) => {
                                let newBlocktradesDates = e.target.value
                                if (newBlocktradesDates <= 30 && newBlocktradesDates > 0) {
                                  SetChartSettings({
                                    blocktradesDates: newBlocktradesDates
                                  }, chart.chartUid, false, true)
                                }
                            }} />
                            <CTooltip content='Hide BlockTrades'>
                              <CLink className={`d-flex card-header-action ` + ( isMobile ? `pt-1 pb-1` : `pl-1 pr-1` )}
                                onClick={() => {
                                  SetChartSettings({
                                    blocksLine: !chart.chartSettings.blocksLine
                                  }, chart.chartUid, false, true)
                                }}>
                                  <CIcon className='d-flex text-danger' name='cis-image-broken' height={20} />
                              </CLink>
                            </CTooltip>
                          </div>}
                          <CTooltip content='Show Divergence'>
                            <CLink className={`d-flex card-header-action ` + ( isMobile ? `pt-1 pb-1` : `pl-1 pr-1` )}
                              onClick={() => {
                                SetChartSettings({
                                  showDivergence: !chart.chartSettings.showDivergence
                                }, chart.chartUid, false, true)
                              }}>
                                { !chart.chartSettings.showDivergence &&
                                  <CIcon className='d-flex' name='cil-call-split' height={20} />
                                }
                                { chart.chartSettings.showDivergence &&
                                  <CIcon className='d-flex text-danger' name='cis-call-split' height={20} />
                                }
                            </CLink>
                          </CTooltip>
                          <CTooltip content='Replay Market'>
                            <CLink className={`d-flex card-header-action ` + ( isMobile ? `pt-1 pb-1` : `pl-1 pr-1` )}
                              onClick={() => {
                                SetChartSettings({
                                  replayMarket: true
                                }, chart.chartUid, false, false)
                              }}>
                                <CIcon className='d-flex' name='cis-media-play-circle' height={20} />
                            </CLink>
                          </CTooltip>
                          <CTooltip content='Chart Settings'>
                            <CLink className={`d-flex card-header-action ` + ( isMobile ? `pt-1 pb-1` : `pl-1 pr-1` )}
                              onClick={() => {
                                SetChartSettings({
                                  chartSymbol : chart.chartSymbol
                                }, chart.chartUid, false);
                                updateProperty({settingsModelShow: !settingsModelShow})
                              }}>
                                <CIcon className='d-flex' name='cis-settings' height={20} />
                            </CLink>
                          </CTooltip>
                          {( fullScreenMode && !isMobile ) && 
                            <CTooltip content='Restore Screen ( ALT + S )'>
                              <CLink className={`d-flex card-header-action ` + ( isMobile ? `pt-1 pb-1` : `pl-1 pr-1` )}
                                onClick={() => {
                                  SetChartSettings({
                                    fullScreenMode : false
                                  }, chart.chartUid, true, false)
                                  updateProperty({
                                    fullScreenMode:!fullScreenMode
                                  })
                                }}>
                                  <CIcon className='d-flex' name='cis-window-restore' height={20} />
                              </CLink>
                            </CTooltip>}
                          {!fullScreenMode && 
                          <CTooltip content='Full Screen ( ALT + S )'>
                            <CLink className={`d-flex card-header-action ` + ( isMobile ? `pt-1 pb-1` : `pl-1 pr-1` )}
                              onClick={() => {
                                let fullScreenBrandRef = chart.chartUid
                                SetChartSettings({
                                  fullScreenMode : true
                                }, chart.chartUid, true, false)
                                updateProperty({
                                  fullScreenBrand: fullScreenBrandRef, 
                                  fullScreenMode:!fullScreenMode
                                })
                              }}>
                                <CIcon className='d-flex' name='cis-window-maximize' height={20} />
                            </CLink>
                          </CTooltip>}
                          {!fullScreenMode && 
                          <CTooltip content='Remove Chart'>
                            <CLink className={`d-flex card-header-action ` + ( isMobile ? `pt-1 pb-1` : `pl-1 pr-1` )}
                              onClick={() => {
                                EditMarket(chart.chartSymbol, chart.chartUid, true)
                                localStorage.removeItem(chart.chartUid)
                                localStorage.removeItem('scale_' + chart.chartUid)
                                localStorage.removeItem('yScale_' + chart.chartUid)
                              }}>
                                <CIcon className='d-flex' name='cis-x-circle' height={20} />
                            </CLink>
                          </CTooltip>}
                        </>
                      }
                      </div>
                    </div>
                  </CCardHeader>
                  <CCardBody className='p-0 d-flex justify-content-center' style={{backgroundColor: chart.chartSettings.backgroundColor}}>
                    <div className='chart-watermark'>
                      <CIcon content={React.icons.flowtradeDarkLogo} height="95" alt="Flowtrade"/>
                    </div>
                    <ErrorBoundary
                      FallbackComponent={({error, resetErrorBoundary}) => {
                        return (
                          null
                        )
                      }}
                      onReset={() => {
                      // reset the state of your app so the error doesn't happen again
                      }}
                    >
                      <ChartHolder
                        type='hybrid' 
                        height={fullScreenMode ? (mainHeight - headerHeight) : ((mainHeight/2) - headerHeight)}
                        symbol={chart.chartSymbol}
                        settings={chart.chartSettings}
                        chartKey={chart.chartSymbol}
                        chartUid={chart.chartUid}
                        chartEvent={(selectedChart == chart.chartUid) ? selectedChartEvent : null}
                      />
                    </ErrorBoundary>
                  </CCardBody>
                </CCard>
              </CCol>
            )
          })}
        </>
      </CRow>
    )
}

const mapStateToProps = (state, ownProps) => {
  return {
    auth: state.firebase.auth,

    charts: state.charts.charts,
    fullScreenMode: state.charts.fullScreenMode,
    fullScreenBrand: state.charts.fullScreenBrand,
    mainHeight: state.charts.mainHeight,
    headerHeight: state.charts.headerHeight,
    settingsModelShow: state.charts.settingsModelShow,
    showScreenShotModal: state.charts.showScreenShotModal,
    currentChartSettings: state.charts.currentChartSettings,
    updateTheCharts: state.charts.updateTheCharts,
    selectedChart: state.charts.selectedChart,
    selectedChartEvent: state.charts.selectedChartEvent,
    brandsModelShow: state.charts.brandsModelShow,
    disableEvent: state.charts.disableEvent,
    myWatchList: 'mySymbols' in state.firebase.data ? (
      state.firebase.data.mySymbols[state.firebase.auth.uid] !== null ? state.firebase.data.mySymbols[state.firebase.auth.uid] : {}
    ) : {}
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    updateProperty: (property) => dispatch(updateProperty(property)),
    SetChartSettings: (
      newChartSettings, chartUid, resetChartData, synchronizeChart
    ) => dispatch(SetChartSettings(newChartSettings, chartUid, resetChartData, synchronizeChart)),
    EditMarket: (brandSymbol, brandUid, removeBrand, additionalSettings) => dispatch(EditMarket(brandSymbol, brandUid, removeBrand, additionalSettings)),
    EditWatchList: (brandSymbol, brandAdd) => dispatch(EditWatchList(brandSymbol, brandAdd))
  }
}

export default compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  ),
  firebaseConnect((props) => {
    return ([
      { path: `mySymbols/${props.auth.uid}`, queryParams: [
          'orderByKey'
      ] }
    ])
  })
)(ChartList)