import React, { useCallback, useEffect, useState, useRef } from "react"
import { compose } from 'redux'
import { connect } from 'react-redux'
import { firebaseConnect } from 'react-redux-firebase'
import { updateProperty } from '../../../store/actions/StylesActions'
import { EditWatchList, SetChartSettings, EditMarket, SearchSymbol } from '../../../store/actions/ChartActions'
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
import ChartRender from '../../charts/ChartRender.js'
import {
	deleteInteractiveNodes
} from "../../charts/Utils/InteractiveUtils"
import { useDetectClickOutside } from 'react-detect-click-outside'

import uniqid from 'uniqid'
import AsyncSelect  from 'react-select/async'

const ChartList = props => {
    const {
      charts,
      brands,
      fullScreenMode,
      fullScreenBrand,
      mainHeight,
      headerHeight,
      settingsModelShow,
      showScreenShotModal,
      currentChartSettings,
      watchList,
      watchListChanged,
      disableEvent,
      updateTheCharts,
      updateProperty,
      SetChartSettings,
      EditMarket,
      SearchSymbol,
      EditWatchList,
      selectedChart,
      selectedChartEvent,
      brandsModelShow
    } = props;

    const [watchedState, setWatchedState] = useState([])
    const [currentEvent, setCurrentEvent] = useState(null)

    const [mapCharts, setMapCharts] = useState([])

    const selectedChartRef = useRef(null)
    const asyncSelectRef = useRef(null)

    const addEventListener = useRef(false)
    const disableEventListener = useRef(false)
    const currentSelectedChart = useRef(null)
    const searchedValues = useRef('')
    const enterChangeValue = useRef(true)

    const showAsyncSelect = useRef(false)
    const [viewAsyncSelect, setViewAsyncSelect] = useState(false)

    const headerRef = useCallback(node => {
      if (node !== null) {
        updateProperty({headerHeight: node.getBoundingClientRect().height})
      }
    }, [])

    useEffect(() => {
      let watchedMap = []
      charts.map((chart, i) => {
        let symbolWatched = watchList.some(watchListElement => {
          return watchListElement.symbol == chart.chartSymbol
        })

        watchedMap[chart.chartUid] = symbolWatched
      })

      setWatchedState(watchedMap)

      currentSelectedChart.current = selectedChart

      if (!fullScreenMode) {
        setMapCharts(charts)
      } else {
        setMapCharts([fullScreenBrand])
      }

      disableEventListener.current = disableEvent

      if (!addEventListener.current) {
        addEventListener.current = true
        window.addEventListener('keydown', onKeyPress)
      }
    }, [charts, watchListChanged, selectedChart, fullScreenMode, disableEvent])

    useEffect(() => {
        return () => {
            window.removeEventListener('keydown', onKeyPress)
        }
    }, [])

    const onKeyPress = (event) => {
      if (currentSelectedChart.current != null && !disableEventListener.current) {
        if (event.altKey) {
          event.preventDefault()
          
          if (event.keyCode >= 65 && event.keyCode <= 90) {
            updateProperty({selectedChartEvent: {
              chart: currentSelectedChart.current,
              code: event.keyCode,
              uid: uniqid()
            }})
          }
          return
        }

        if (event.keyCode == 13) {     
          if (showAsyncSelect.current) {
            const searchedValue = searchedValues.current.toUpperCase()
            setViewAsyncSelect(false)
            showAsyncSelect.current = false
            EditMarket(searchedValue, currentSelectedChart.current, false)
            searchedValues.current = ''
          }
        } else if (event.keyCode == 27 && showAsyncSelect.current) {
            setViewAsyncSelect(false)
            showAsyncSelect.current = false
            searchedValues.current = ''
        } else if (event.keyCode >= 65 && event.keyCode <= 90) {
          if (!showAsyncSelect.current) {
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

    const handleChartOptionClick = (nodeEvent) => {
      console.log(nodeEvent)
    }

    const customStyles = {
        container:  (provided, state) => ({
            ...provided,
            padding: '0',
            border: '0',
            fontSize: '0.76563rem',
            lineHeight: 1.5,
            width: '100%'
        }),
        control:  (provided, state) => ({
            ...provided,
            height: 'calc(1.5em + 0.5rem + 2px)',
            minHeight: 'calc(1.5em + 0.5rem + 2px)',
            fontSize: '0.76563rem',
            lineHeight: 1.5,
            borderRadius: '0.2rem',
            border: 'none',
            borderColor: '#d8dbe0',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            boxShadow: 'inset 0 1px 1px rgba(0, 0, 0, 0.075)',
            transition: 'background-color 0.15s ease-in-out, border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out',
            ':hover': {
            borderColor: state.isFocused ? '#66afe9' : '#d8dbe0',
            boxShadow: state.isFocused ? 
                'inset 0 1px 1px rgba(0, 0, 0, 0.075), 0 0 8px rgba(102, 175, 233, 0.6)' : 
                'inset 0 1px 1px rgba(0, 0, 0, 0.075)',
            }
        }),
        valueContainer: (provided, state) => ({
            ...provided,
            marginTop: '0',
            marginLeft: '6px',
            padding: '0',
            border: '0',
        }),
        dropdownIndicator: (provided, state) => ({
            ...provided,
            marginTop: '0',
            padding: '0',
            border: '0',
            width: '16px',
        }),
        clearIndicator: (provided, state) => ({
            ...provided,
            marginTop: '0',
            padding: '0',
            border: '0',
            width: '16px',
        }),
        indicatorsContainer: (provided, state) => ({
            ...provided,
            paddingRight: '4px',
            border: '0',
        }),
        multiValue: (provided, state) => {
            return ({
                ...provided,
                backgroundColor: '#4799eb'
            })
        },
        multiValueLabel: (provided, state) => {
            return ({
                ...provided,
                color: 'white',
                fontWeight: 'bold'
            })
        },
        multiValueRemove: (provided, state) => {
            return ({
                ...provided,
                ':hover': {
                    backgroundColor: 'white',
                    color: '#4799eb'
                }
            })
        },
        input: (provided, state) => {
            return ({
                ...provided,
                color: 'white'
            })
        },
        option: (provided, state) => {
            return ({
                ...provided,
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                textAlign: 'left',
                ':hover': {
                    backgroundColor: '#4799eb'
                },
            })
        },
        menuList: (provided, state) => {
            return ({
                ...provided,
                '::-webkit-scrollbar': {
                    width: '9px',
                },
                '::-webkit-scrollbar-track': {
                    background: 'transparent'
                },
                '::-webkit-scrollbar-thumb': {
                    background: '#555',
                    borderRadius: 10

                },
                '::-webkit-scrollbar-thumb:hover': {
                    background: '#555'
                }
            })
        }
    }
    const defaultSymbolOptions = Object.keys(brands).map((brand, i) => {
        return {
            'value': brand,
            'label': brand
        }
    })
    const promiseOptions = (inputValue) => {
        return new Promise(async(resolve) => {
            const brandsSearch = await SearchSymbol(inputValue)
            let newValues = (brandsSearch !== false) ? brandsSearch : brands

            if (typeof newValues != typeof undefined && newValues != null) {
              let resolveValues = Object.keys(newValues).map((brand, i) => {
                  return {
                      'value': brand,
                      'label': brand
                  }
              })
              resolve(resolveValues)
            } else {
              resolve([])
            }
        })
    }

    if (charts.length == 0) {
      return (<CRow></CRow>)
    }

    return (
      <CRow className='parent_charts-list'>
        <>
          {mapCharts.map((chart, i) => {
            return (
              <CCol innerRef={selectedChart == chart.chartUid ? selectedChartRef : null} onClick={() => {
                updateProperty({selectedChartEvent: null, selectedChart: chart.chartUid})
              }} key={chart.chartUid} style={{height: fullScreenMode ? mainHeight : mainHeight/2}} 
                className={'p-0 chartlist-container '} xs='12' sm={fullScreenMode ? '12' : '6'} md={fullScreenMode ? '12' : '6'}>
                {selectedChart == chart.chartUid && <div className='chartlist-container_shadow'></div>}
                <CCard className={'m-0' + ( selectedChart == chart.chartUid && ' z-index-2')}>
                  <CCardHeader innerRef={headerRef} className='card-header-actions mr-0 d-flex align-items-center justify-content-between c-header'>
                    <div style={{zIndex: 10}} className='d-flex w-50'>
                      {viewAsyncSelect == chart.chartUid && 
                        <AsyncSelect
                          placeholder='Filter Symbols'
                          styles={customStyles}
                          name="form-field-name2"
                          cacheOptions
                          ref={asyncSelectRef}
                          defaultOptions={defaultSymbolOptions}
                          loadOptions={promiseOptions}
                          onInputChange={(e) => {
                            if (e != '') {
                              searchedValues.current = e
                            }
                          }}
                          onChange={(e) => {
                            if (enterChangeValue.current) {
                              const searchedValue = e.value
                              setViewAsyncSelect(false)
                              showAsyncSelect.current = false
                              EditMarket(searchedValue, currentSelectedChart.current, false)
                            }

                            enterChangeValue.current = true
                          }}
                          onKeyDown={(e) => {
                            if (e.keyCode == 13) {
                              enterChangeValue.current = false
                            }
                          }}
                          isMulti={false}
                          defaultMenuIsOpen={true}
                          theme={(theme) => ({
                              ...theme,
                              colors: {
                              ...theme.colors,
                              primary: 'black',
                              primary25: 'black',
                              dangerLight: 'black',
                              neutral0: '#2a2b36'
                              },
                          })}
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
                            SetChartSettings({
                              periodicity: chart.chartSettings.periodicity == '1m' ? '15m' : '1m'
                            }, chart.chartUid, false, true)
                          }}>
                          {chart.chartSettings.periodicity}
                        </CBadge>
                      </CTooltip>
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
                          {chart.chartSettings.flowIndex}
                        </CBadge>
                      </CTooltip>

                      { chart.chartSettings.replayMarket &&
                        <>
                          { !(chart.chartSettings.replayMarket == 'pause') && 
                            <CTooltip content='Pause Market'>
                              <CLink className='card-header-action pl-1 pr-0'
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
                            <CLink className='card-header-action pl-1 pr-0'
                              onClick={() => {
                                SetChartSettings({
                                  replayMarket: 'play'
                                }, chart.chartUid, false, false)
                              }}>
                                <CIcon name='cis-media-play-circle' height={20} />
                            </CLink>
                          </CTooltip>}
                          <CTooltip content='Stop Market'>
                            <CLink className='card-header-action p-07'
                              onClick={() => {
                                SetChartSettings({
                                  replayMarket: false
                                }, chart.chartUid, false, false)
                              }}>
                                <CIcon name='cis-media-stop-circle' height={20} />
                            </CLink>
                          </CTooltip>
                          <CTooltip content='Speed'>
                            <div className='card-header-action p-07'>
                              <CSelect 
                                custom size="xs" name="selectSm" id="SelectLm" 
                                value={chart.chartSettings.replayMarketSettings.speed}
                                onChange={(e) => {
                                  SetChartSettings({
                                    replayMarket: 'replay',
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
                            <CLink className='d-flex card-header-action pl-1 pr-1'
                              onClick={() => {
                                EditWatchList(chart.chartSymbol)
                              }}>
                                {watchedState[chart.chartUid] && 
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
                                className='d-flex card-header-action pl-1 pr-1 chartType-container'
                                src={React.icons.Tools[chart.chartSettings.chartType]}
                              />
                            </CPopover>
                          </div>
                          <CTooltip content='ScreenShot'>
                            <CLink className='d-flex card-header-action pl-1 pr-1'
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
                            <CLink className='d-flex card-header-action pl-1 pr-1'
                              onClick={() => {
                                SetChartSettings({
                                  blocksLine: !chart.chartSettings.blocksLine
                                }, chart.chartUid, false, true)
                              }}>
                                <CIcon className='d-flex' name='cil-image-broken' height={20} />
                            </CLink>
                          </CTooltip>}
                          {chart.chartSettings.blocksLine &&
                          <div style={{
                            backgroundColor: 'rgba(0, 0, 21, 0.2)',
                            borderRadius: 5,
                            padding: '5px 2px 5px 2px',
                            display: 'flex',
                            alignItems:'center'
                          }}>
                          <CTooltip content='Hide BlockTrades'>
                            <CLink className='d-flex card-header-action pl-1 pr-1'
                              onClick={() => {
                                SetChartSettings({
                                  blocksLine: !chart.chartSettings.blocksLine
                                }, chart.chartUid, false, true)
                              }}>
                                <CIcon className='d-flex' name='cis-image-broken' height={20} />
                            </CLink>
                          </CTooltip>
                          <CInput size='xs' type='number' value={chart.chartSettings.blocktradesDates} onChange={(e) => {
                              let newBlocktradesDates = e.target.value
                              if (newBlocktradesDates <= 30 && newBlocktradesDates > 0) {
                                SetChartSettings({
                                  blocktradesDates: newBlocktradesDates
                                }, chart.chartUid, false, true)
                              }
                          }} />
                          </div>}
                          <CTooltip content='Show Divergence'>
                            <CLink className='d-flex card-header-action pl-1 pr-1'
                              onClick={() => {
                                SetChartSettings({
                                  showDivergence: !chart.chartSettings.showDivergence
                                }, chart.chartUid, false, true)
                              }}>
                                { !chart.chartSettings.showDivergence &&
                                  <CIcon className='d-flex' name='cil-call-split' height={20} />
                                }
                                { chart.chartSettings.showDivergence &&
                                  <CIcon className='d-flex' name='cis-call-split' height={20} />
                                }
                            </CLink>
                          </CTooltip>
                          <CTooltip content='Replay Market'>
                            <CLink className='d-flex card-header-action pl-1 pr-1'
                              onClick={() => {
                                SetChartSettings({
                                  replayMarket: true
                                }, chart.chartUid, false, false)
                              }}>
                                <CIcon className='d-flex' name='cis-media-play-circle' height={20} />
                            </CLink>
                          </CTooltip>
                          <CTooltip content='Chart Settings'>
                            <CLink className='d-flex card-header-action pl-1 pr-1'
                              onClick={() => {
                                SetChartSettings({
                                  chartSymbol : chart.chartSymbol
                                }, chart.chartUid, false);
                                updateProperty({settingsModelShow: !settingsModelShow})
                              }}>
                                <CIcon className='d-flex' name='cis-settings' height={20} />
                            </CLink>
                          </CTooltip>
                          {fullScreenMode && 
                            <CTooltip content='Restore Screen'>
                              <CLink className='d-flex card-header-action pl-1 pr-1'
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
                          {!fullScreenMode && <CTooltip content='Full Screen'>
                            <CLink className='d-flex card-header-action pl-1 pr-1'
                              onClick={() => {
                                let fullScreenBrandRef = chart
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
                          {!fullScreenMode && <CTooltip content='Remove Chart'>
                            <CLink className='d-flex card-header-action pl-1 pr-1'
                              onClick={() => {
                                EditMarket(chart.chartSymbol, chart.chartUid, true)
                                localStorage.removeItem(chart.chartUid)
                              }}>
                                <CIcon className='d-flex' name='cis-x-circle' height={20} />
                            </CLink>
                          </CTooltip>}
                        </>
                      }
                    </div>
                  </CCardHeader>
                  <CCardBody className='pb-0 pt-0' style={{backgroundColor: chart.chartSettings.backgroundColor}}>
                    <div className='chart-watermark'>
                      <CIcon content={React.icons.flowtradeDarkLogo} height="95" alt="Flowtrade"/>
                    </div>
                    <ChartRender 
                      mainHeight={fullScreenMode ? (mainHeight - headerHeight) : ((mainHeight/2) - headerHeight)} 
                      currentSymbol={chart.chartSymbol}
                      currentUid={chart.chartUid}
                      currentEvent={(selectedChart == chart.chartUid) ? selectedChartEvent : null}
                    />
                  </CCardBody>
                </CCard>
              </CCol>
            )
          })}
        </>
      </CRow>
    )
}

const mapStateToProps = (state) => {
  return {
    charts: state.charts.charts,
    brands: 'symbolMap1' in state.firebase.data ? state.firebase.data.symbolMap1.A : [],
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
    watchList: state.charts.watchList,
    watchListChanged: state.charts.watchListChanged,
    disableEvent: state.charts.disableEvent
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    updateProperty: (property) => dispatch(updateProperty(property)),
    SetChartSettings: (
      newChartSettings, chartUid, resetChartData, synchronizeChart
    ) => dispatch(SetChartSettings(newChartSettings, chartUid, resetChartData, synchronizeChart)),
    EditMarket: (brandSymbol, brandUid, removeBrand) => dispatch(EditMarket(brandSymbol, brandUid, removeBrand)),
    SearchSymbol: (searchInput) => dispatch(SearchSymbol(searchInput)),
    EditWatchList: (brandSymbol) => dispatch(EditWatchList(brandSymbol))
  }
}

export default compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  ),
  firebaseConnect((props) => ([
      `symbolMap1/A#limitToFirst=100`
  ]))
)(ChartList)