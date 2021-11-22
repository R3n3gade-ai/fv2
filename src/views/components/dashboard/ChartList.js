import React, { useCallback, useEffect, useReducer } from "react"
import { connect } from 'react-redux'
import { updateProperty } from '../../../store/actions/StylesActions'
import { SetChartSettings, EditMarket } from '../../../store/actions/ChartActions'
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

  CSelect
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import ChartRender from '../../charts/ChartRender.js'
import {
	deleteInteractiveNodes
} from "../../charts/Utils/InteractiveUtils"
import { useDetectClickOutside } from 'react-detect-click-outside'

const ChartList = props => {
    const {
      charts,
      fullScreenMode,
      mainHeight,
      headerHeight,
      settingsModelShow,
      showScreenShotModal,
      currentChartSettings,
      updateTheCharts,
      updateProperty,
      SetChartSettings,
      EditMarket,
      selectedChart,
      brandsModelShow
    } = props;

    const headerRef = useCallback(node => {
      if (node !== null) {
        updateProperty({headerHeight: node.getBoundingClientRect().height})
      }
    }, [])
    const selectedChartRef = useDetectClickOutside({ 
      onTriggered: (e) => {
        if (
          e.target.classList.contains('c-main') || e.target.classList.contains('parent_charts-list') ||
          parseInt(e.which) == 27
        ) {
          updateProperty({selectedChart: null})
        }
      },
      triggerKeys: ['Escape']
    })

    if (charts.length == 0) {
      return (<CRow></CRow>)
    }

    return (
      <CRow className='parent_charts-list'>
        <>
          {charts.map((chart, i) => {
            return (
              <CCol innerRef={selectedChart == chart.chartSymbol ? selectedChartRef : null} onClick={() => {
                updateProperty({selectedChart: chart.chartSymbol})
              }} key={chart.chartSymbol} style={{height: mainHeight/2}} 
                className={'p-0 chartlist-container'} xs='12' sm='6' md='6'>
                {selectedChart == chart.chartSymbol && <div className='chartlist-container_shadow'></div>}
                <CCard className={'m-0' + ( selectedChart == chart.chartSymbol && ' z-index-2')}>
                  <CCardHeader innerRef={headerRef} className='card-header-actions mr-0 d-flex align-items-center justify-content-between c-header'>
                    <div className='d-flex'>
                      <span onClick={() => updateProperty({brandsModelShow: true})}
                        className='h5 ml-2 mb-0 chart-symbol_container'>{chart.chartSymbol}</span>
                      <span className='ml-1 mb-0 text-muted mt-auto'>{chart.chartBrand}</span>
                    </div>
                    <div className='card-header-actions d-flex'>
                      <CTooltip content='Time Frame'>
                        <CBadge 
                          shape="pill"
                          style={{
                            backgroundColor: chart.chartSettings.priceBarsColor,
                            cursor: 'pointer'
                          }}
                          className="ml-1 mr-1 d-flex align-items-center justify-content-center"
                          onClick={() => {
                            SetChartSettings({
                              periodicity: chart.chartSettings.periodicity == '1m' ? '15m' : '1m'
                            }, chart.chartSymbol, false, true)
                          }}>
                          {chart.chartSettings.periodicity}
                        </CBadge>
                      </CTooltip>
                      <CBadge 
                        shape="pill" 
                        style={{
                          backgroundColor: chart.chartSettings.flowIndex === 'normal' ? chart.chartSettings.flowIndexColor : (
                              chart.chartSettings.flowIndex === 'dark-pool' ? chart.chartSettings.flowDarkIndexColor : chart.chartSettings.flowBothIndexColor
                          )
                        }}
                        className="ml-1 mr-1 d-flex align-items-center justify-content-center">
                        {chart.chartSettings.flowIndex}
                      </CBadge>

                      { chart.chartSettings.replayMarket &&
                        <>
                          { !(chart.chartSettings.replayMarket == 'pause') && 
                            <CTooltip content='Pause Market'>
                              <CLink className='card-header-action pl-1 pr-0'
                                onClick={() => {
                                  SetChartSettings({
                                    replayMarket: 'pause'
                                  }, chart.chartSymbol, false, false)
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
                                }, chart.chartSymbol, false, false)
                              }}>
                                <CIcon name='cis-media-play-circle' height={20} />
                            </CLink>
                          </CTooltip>}
                          <CTooltip content='Stop Market'>
                            <CLink className='card-header-action p-07'
                              onClick={() => {
                                SetChartSettings({
                                  replayMarket: false
                                }, chart.chartSymbol, false, false)
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
                                  }, chart.chartSymbol, false, false)
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
                          <CTooltip content='ScreenShot'>
                            <CLink className='card-header-action pl-1 pr-1'
                              onClick={() => {
                                SetChartSettings({
                                  takeScreenShot: true
                                }, chart.chartSymbol, false, false)
                                updateProperty({showScreenShotModal: !showScreenShotModal})
                              }}>
                                <CIcon name='cis-images' height={20} />
                            </CLink>
                          </CTooltip>
                          <CTooltip content='Show BlockTrades'>
                            <CLink className='card-header-action pl-1 pr-1'
                              onClick={() => {
                                SetChartSettings({
                                  blocksLine: !chart.chartSettings.blocksLine
                                }, chart.chartSymbol, false, true)
                              }}>
                                { !chart.chartSettings.blocksLine &&
                                  <CIcon name='cil-image-broken' height={20} />
                                }
                                { chart.chartSettings.blocksLine &&
                                  <CIcon name='cis-image-broken' height={20} />
                                }
                            </CLink>
                          </CTooltip>
                          <CTooltip content='Show Divergence'>
                            <CLink className='card-header-action pl-1 pr-1'
                              onClick={() => {
                                SetChartSettings({
                                  showDivergence: !chart.chartSettings.showDivergence
                                }, chart.chartSymbol, false, true)
                              }}>
                                { !chart.chartSettings.showDivergence &&
                                  <CIcon name='cil-call-split' height={20} />
                                }
                                { chart.chartSettings.showDivergence &&
                                  <CIcon name='cis-call-split' height={20} />
                                }
                            </CLink>
                          </CTooltip>
                          <CTooltip content='Replay Market'>
                            <CLink className='card-header-action pl-1 pr-1'
                              onClick={() => {
                                SetChartSettings({
                                  replayMarket: true
                                }, chart.chartSymbol, false, false)
                              }}>
                                <CIcon name='cis-media-play-circle' height={20} />
                            </CLink>
                          </CTooltip>
                          <CTooltip content='Chart Settings'>
                            <CLink className='card-header-action pl-1 pr-1'
                              onClick={() => {
                                SetChartSettings({
                                  chartSymbol : chart.chartSymbol
                                }, chart.chartSymbol, false);
                                updateProperty({settingsModelShow: !settingsModelShow})
                              }}>
                                <CIcon name='cis-settings' height={20} />
                            </CLink>
                          </CTooltip>
                          <CTooltip content='Full Screen'>
                            <CLink className='card-header-action pl-1 pr-1'
                              onClick={() => {
                                let fullScreenBrandRef = chart
                                SetChartSettings({
                                  fullScreenMode : true
                                }, chart.chartSymbol, true, false)
                                updateProperty({
                                  fullScreenBrand: fullScreenBrandRef, 
                                  fullScreenMode:!fullScreenMode
                                })
                              }}>
                                <CIcon name='cis-window-maximize' height={20} />
                            </CLink>
                          </CTooltip>
                          <CTooltip content='Remove Chart'>
                            <CLink className='card-header-action pl-1 pr-1'
                              onClick={() => {
                                EditMarket(chart.chartSymbol, true)
                              }}>
                                <CIcon name='cis-x-circle' height={20} />
                            </CLink>
                          </CTooltip>
                        </>
                      }
                    </div>
                  </CCardHeader>
                  <CCardBody className='pb-0 pt-0' style={{backgroundColor: chart.chartSettings.backgroundColor}}>
                    <div className='chart-watermark'>
                      <CIcon content={React.icons.flowtradeDarkLogo} height="95" alt="Flowtrade"/>
                    </div>
                    <ChartRender 
                      mainHeight={((mainHeight/2) - headerHeight)} 
                      currentSymbol={chart.chartSymbol}
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
    fullScreenMode: state.charts.fullScreenMode,
    mainHeight: state.charts.mainHeight,
    headerHeight: state.charts.headerHeight,
    settingsModelShow: state.charts.settingsModelShow,
    showScreenShotModal: state.charts.showScreenShotModal,
    currentChartSettings: state.charts.currentChartSettings,
    updateTheCharts: state.charts.updateTheCharts,
    selectedChart: state.charts.selectedChart,
    brandsModelShow: state.charts.brandsModelShow
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    updateProperty: (property) => dispatch(updateProperty(property)),
    SetChartSettings: (
      newChartSettings, chartSymbol, resetChartData, synchronizeChart
    ) => dispatch(SetChartSettings(newChartSettings, chartSymbol, resetChartData, synchronizeChart)),
    EditMarket: (brandSymbol, removeBrand) => dispatch(EditMarket(brandSymbol, removeBrand))
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ChartList)