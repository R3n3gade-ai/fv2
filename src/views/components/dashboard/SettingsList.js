import React, { useState } from "react";
import { connect } from 'react-redux'
import {
  CRow,
  CCol,
  CListGroup,
  CListGroupItem,
  CTabContent,
  CTabPane
} from '@coreui/react'

import SubSettingsList from './SubSettingsList';

const SettingsList = props => {
    const {
        currentChartSettings
    } = props;

    const [activeTab, setActiveTab] = useState(0)

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
                                    options: [
                                        {
                                            name: 'Normal',
                                            id: 'normal'
                                        },
                                        {
                                            name: 'Dark Pool',
                                            id: 'dark-pool'
                                        },
                                        {
                                            name: 'Both',
                                            id: 'both'
                                        }
                                    ]
                                },
                                {
                                    name: 'Time Frame',
                                    id: 'periodicity',
                                    value: currentChartSettings.periodicity,
                                    options: [
                                        {
                                            name: '1 Minute',
                                            id: '1m'
                                        },
                                        {
                                            name: '15 Minutes',
                                            id: '15m'
                                        }
                                    ]
                                },
                                {
                                    name: 'Chart Type',
                                    id: 'chartType',
                                    value: currentChartSettings.chartType,
                                    options: [
                                        {
                                            name: 'OHLC',
                                            id: 'ohlc'
                                        },
                                        {
                                            name: 'Candles',
                                            id: 'candles'
                                        }
                                    ]
                                },
                                {
                                    name: 'Show Average',
                                    id: 'showAverage',
                                    value: currentChartSettings.showAverage,
                                    switch: true
                                },
                                {
                                    name: 'Show Grid',
                                    id: 'showGrid',
                                    value: currentChartSettings.showGrid,
                                    switch: true
                                },
                                {
                                    name: 'Show BlockTrades',
                                    id: 'blocksLine',
                                    value: currentChartSettings.blocksLine,
                                    switch: true
                                }
                            ]}
                            settingApplyToAll={true}
                        />
                    </CTabPane>
                    <CTabPane active={activeTab === 1}>
                        <SubSettingsList 
                            settingType='simple'
                            settingTitle='Chart Styles'
                            settingAttribute={[
                                {
                                    name: 'Background Color',
                                    id: 'backgroundColor',
                                    value: currentChartSettings.backgroundColor,
                                    colors: true
                                },
                                {
                                    name: 'Price Bars Color',
                                    id: 'priceBarsColor',
                                    value: currentChartSettings.priceBarsColor,
                                    colors: true
                                },
                                {
                                    name: 'Normal Flow Index',
                                    id: 'flowIndexColor',
                                    value: currentChartSettings.flowIndexColor,
                                    colors: true
                                },
                                {
                                    name: 'Average Flow Index',
                                    id: 'flowIndexAvgColor',
                                    value: currentChartSettings.flowIndexAvgColor,
                                    colors: true
                                },
                                {
                                    name: 'Dark Flow Index',
                                    id: 'flowDarkIndexColor',
                                    value: currentChartSettings.flowDarkIndexColor,
                                    colors: true
                                },
                                {
                                    name: 'Combo Flow Index',
                                    id: 'flowBothIndexColor',
                                    value: currentChartSettings.flowBothIndexColor,
                                    colors: true
                                },
                                {
                                    name: 'Dark Pool BlockTrade',
                                    id: 'blockTradesDarkPoolColor',
                                    value: currentChartSettings.blockTradesDarkPoolColor,
                                    colors: true
                                },
                                {
                                    name: 'Regular Pool BlockTrade',
                                    id: 'blockTradesRegularPoolColor',
                                    value: currentChartSettings.blockTradesRegularPoolColor,
                                    colors: true
                                }
                            ]}
                            settingApplyToAll={true}
                        /> 
                    </CTabPane>
                    <CTabPane active={activeTab === 2}>
                        <SubSettingsList 
                            settingType='simple'
                            settingTitle='Chart Tools'
                            settingAttribute={[
                                {
                                    name: 'Fibonacci Retracements',
                                    id: {
                                        fibonacciRetracements: true
                                    },
                                    icon: 'fibonacci',
                                    shortCode: 'ALT + F'
                                },
                                {
                                    name: 'Finite Line',
                                    id: {
                                        trendLine: true,
                                        trendLineType: 'LINE'
                                    },
                                    icon: 'sLine',
                                    shortCode: 'ALT + L'
                                },
                                {
                                    name: 'Semi-Infinite Line',
                                    id: {
                                        trendLine: true,
                                        trendLineType: 'RAY'
                                    },
                                    icon: 'siLine',
                                    shortCode: 'ALT + R'
                                },
                                {
                                    name: 'Infinite Line',
                                    id: {
                                        trendLine: true,
                                        trendLineType: 'XLINE'
                                    },
                                    icon: 'iLine',
                                    shortCode: 'ALT + X'
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