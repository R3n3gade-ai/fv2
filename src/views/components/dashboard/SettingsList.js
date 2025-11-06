import React, { useState } from "react";
import { connect } from 'react-redux'
import {
    CRow,
    CCol,
    CListGroup,
    CListGroupItem,
    CTabContent,
    CTabPane,

    CCard,
    CCardBody,
    CCardHeader,
    CLink,
    CCollapse
} from '@coreui/react'
import CIcon from '@coreui/icons-react'

import SubSettingsList from './SubSettingsList';

const SettingsList = props => {
    const {
        currentChartSettings
    } = props;

    const [activeTab, setActiveTab] = useState(0)
    const [accordion, setAccordion] = useState(0)

    return (
        <CRow>
            <CCol className='pr-0' xs="5">
                <CListGroup id="list-tab" role="tablist">
                    <CListGroupItem className='h5 mb-0'
                    onClick={() => setActiveTab(0)} action active={activeTab === 0} >General</CListGroupItem>
                    <CListGroupItem className='h5 mb-0'
                    onClick={() => setActiveTab(1)} action active={activeTab === 1} >Style</CListGroupItem>
                    <CListGroupItem className='h5 mb-0'
                    onClick={() => setActiveTab(2)} action active={activeTab === 2} >Tools</CListGroupItem>
                </CListGroup>
            </CCol>
            <CCol className='pl-0' xs="7">
                <CTabContent>
                    <CTabPane active={activeTab === 0} >
                        <SubSettingsList 
                            settingType='simple'
                            settingTitle='General Settings'
                            settingAttribute={[
                                {
                                    name: 'Flow Index',
                                    id: 'flowIndex',
                                    value: currentChartSettings.flowIndex,
                                    showValue: ['normal', 'dark-pool', 'both'].map(flowType => {
                                        if (currentChartSettings.flowIndex == flowType) {
                                          switch(currentChartSettings.flowIndex) {
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
                                    }),
                                    options: [
                                        {
                                            name: 'Flow Index',
                                            id: 'normal'
                                        },
                                        {
                                            name: 'DarkPool Index',
                                            id: 'dark-pool'
                                        },
                                        {
                                            name: 'Combo',
                                            id: 'both'
                                        }
                                    ],
                                    onClick: false
                                },
                                {
                                    name: 'Time Frame',
                                    id: 'periodicity',
                                    value: currentChartSettings.periodicity,
                                    showValue: ['1m', '15m'].map(timeFrameType => {
                                        if (currentChartSettings.periodicity == timeFrameType) {
                                          switch(currentChartSettings.periodicity) {
                                            case '1m':
                                              return '1 Minute'
                                              break
                                            case '15m':
                                              return '15 Minutes'
                                              break
                                          }
                                        }
                                    }),
                                    options: [
                                        {
                                            name: '1 Minute',
                                            id: '1m'
                                        },
                                        {
                                            name: '15 Minutes',
                                            id: '15m'
                                        }
                                    ],
                                    onClick: false
                                },
                                {
                                    name: 'Chart Type',
                                    id: 'chartType',
                                    value: currentChartSettings.chartType,
                                    showValue: ['ohlc', 'candles'].map(chartTpyeX => {
                                        if (currentChartSettings.chartType == chartTpyeX) {
                                          switch(currentChartSettings.chartType) {
                                            case 'ohlc':
                                              return 'OHLC'
                                              break
                                            case 'candles':
                                              return 'Candles'
                                              break
                                          }
                                        }
                                    }),
                                    options: [
                                        {
                                            name: 'OHLC',
                                            id: 'ohlc'
                                        },
                                        {
                                            name: 'Candles',
                                            id: 'candles'
                                        }
                                    ],
                                    onClick: false
                                },
                                {
                                    name: 'Show Average',
                                    id: 'showAverage',
                                    value: currentChartSettings.showAverage,
                                    switch: true,
                                    onClick: false
                                },
                                {
                                    name: 'Show Grid',
                                    id: 'showGrid',
                                    value: currentChartSettings.showGrid,
                                    switch: true,
                                    onClick: false
                                },
                                {
                                    name: 'Show BlockTrades',
                                    id: 'blocksLine',
                                    value: currentChartSettings.blocksLine,
                                    switch: true,
                                    onClick: false
                                }
                            ]}
                            settingApplyToAll={true}
                        />
                    </CTabPane>
                    <CTabPane active={activeTab === 1}>
                        <CCard className="mb-0">
                            <CCardHeader style={{backgroundColor: accordion === 0 ? '#1992e3' : 'transparent'}}>
                                <CLink 
                                    className="d-flex align-items-center text-left text-white text-decoration-none m-0 p-0" 
                                    onClick={() => setAccordion(accordion === 0 ? null : 0)}
                                >
                                    <h5 className="m-0 p-0 mr-auto">Color Styles</h5>
                                    <CIcon name={accordion === 0 ? 'cis-arrow-thick-top' : 'cis-arrow-thick-bottom'} />
                                </CLink>
                            </CCardHeader>
                            <CCollapse show={accordion === 0}>
                                <CCardBody className='p-0'>
                                    <SubSettingsList 
                                        settingType='simple'
                                        settingAttribute={[
                                            {
                                                name: 'Background Color',
                                                id: 'backgroundColor',
                                                value: currentChartSettings.backgroundColor,
                                                colors: true,
                                                onClick: false
                                            },
                                            {
                                                name: 'Price Bars Color',
                                                id: 'priceBarsColor',
                                                value: currentChartSettings.priceBarsColor,
                                                colors: true,
                                                onClick: false
                                            },
                                            {
                                                name: 'Normal Flow Index',
                                                id: 'flowIndexColor',
                                                value: currentChartSettings.flowIndexColor,
                                                colors: true,
                                                onClick: false
                                            },
                                            {
                                                name: 'Average Flow Index',
                                                id: 'flowIndexAvgColor',
                                                value: currentChartSettings.flowIndexAvgColor,
                                                colors: true,
                                                onClick: false
                                            },
                                            {
                                                name: 'Dark Flow Index',
                                                id: 'flowDarkIndexColor',
                                                value: currentChartSettings.flowDarkIndexColor,
                                                colors: true,
                                                onClick: false
                                            },
                                            {
                                                name: 'Combo Flow Index',
                                                id: 'flowBothIndexColor',
                                                value: currentChartSettings.flowBothIndexColor,
                                                colors: true,
                                                onClick: false
                                            },
                                            {
                                                name: 'Dark Pool BlockTrade',
                                                id: 'blockTradesDarkPoolColor',
                                                value: currentChartSettings.blockTradesDarkPoolColor,
                                                colors: true,
                                                onClick: false
                                            },
                                            {
                                                name: 'Regular Pool BlockTrade',
                                                id: 'blockTradesRegularPoolColor',
                                                value: currentChartSettings.blockTradesRegularPoolColor,
                                                colors: true,
                                                onClick: false
                                            }
                                        ]}
                                        settingApplyToAll={true}
                                    /> 
                                </CCardBody>
                            </CCollapse>
                        </CCard>
                        <CCard className="mb-0">
                            <CCardHeader style={{backgroundColor: accordion === 1 ? '#1992e3' : 'transparent'}}>
                                <CLink 
                                    className="d-flex align-items-center text-left text-white text-decoration-none m-0 p-0" 
                                    onClick={() => setAccordion(accordion === 1 ? null : 1)}
                                >
                                    <h5 className="m-0 p-0 mr-auto">Line Styles</h5>
                                    <CIcon name={accordion === 1 ? 'cis-arrow-thick-top' : 'cis-arrow-thick-bottom'} />
                                </CLink>
                            </CCardHeader>
                            <CCollapse show={accordion === 1}>
                                <CCardBody className='p-0'>
                                    <SubSettingsList 
                                        settingType='simple'
                                        settingAttribute={[
                                            {
                                                name: 'Flow Index Thickness',
                                                id: 'flowIndexWidth',
                                                value: currentChartSettings.flowIndexWidth,
                                                input: true,
                                                maxValue: 10,
                                                minValue: 1,
                                                onClick: false
                                            }
                                        ]}
                                        settingApplyToAll={true}
                                    /> 
                                </CCardBody>
                            </CCollapse>
                        </CCard>
                    </CTabPane>
                    <CTabPane active={activeTab === 2}>
                        <SubSettingsList 
                            settingType='simple'
                            settingTitle='Chart Tools'
                            settingAttribute={[
                                {
                                    name: 'Fibonacci Retracements',
                                    id: {
                                        drawingMode: true,
                                        fibonacciRetracements: true,
                                        fibonacciTrendLineColor: currentChartSettings.fibonacciRetracementsColor
                                    },
                                    icon: 'fibonacci',
                                    shortCode: 'ALT+F',
                                    colorId: 'fibonacciRetracementsColor',
                                    colors: true,
                                    value: currentChartSettings.fibonacciRetracementsColor,
                                },
                                {
                                    name: 'Finite Line',
                                    id: {
                                        drawingMode: true,
                                        trendLine: true,
                                        trendLineType: 'LINE',
                                        trendLineColor: currentChartSettings.trendLineLineColor
                                    },
                                    icon: 'sLine',
                                    shortCode: 'ALT+L',
                                    colorId: 'trendLineLineColor',
                                    colors: true,
                                    value: currentChartSettings.trendLineLineColor,
                                },
                                {
                                    name: 'Semi-Infinite Line',
                                    id: {
                                        drawingMode: true,
                                        trendLine: true,
                                        trendLineType: 'RAY',
                                        trendLineColor: currentChartSettings.trendLineRayColor
                                    },
                                    icon: 'siLine',
                                    shortCode: 'ALT+R',
                                    colorId: 'trendLineRayColor',
                                    colors: true,
                                    value: currentChartSettings.trendLineRayColor,
                                },
                                {
                                    name: 'Infinite Line',
                                    id: {
                                        drawingMode: true,
                                        trendLine: true,
                                        trendLineType: 'XLINE',
                                        trendLineColor: currentChartSettings.trendLineXlineColor
                                    },
                                    icon: 'iLine',
                                    shortCode: 'ALT+X',
                                    colorId: 'trendLineXlineColor',
                                    colors: true,
                                    value: currentChartSettings.trendLineXlineColor,
                                }
                            ]}
                        />     
                    </CTabPane>
                </CTabContent>
            </CCol>
        </CRow>
    )
}

const mapStateToProps = (state) => {
  return {
    currentChartSettings: state.charts.currentChartSettings
  }
}

export default connect(
    mapStateToProps
)(SettingsList);