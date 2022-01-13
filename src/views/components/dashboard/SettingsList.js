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
                                    ],
                                    onClick: false
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
                                    ],
                                    onClick: false
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
                        <SubSettingsList 
                            settingType='simple'
                            settingTitle='Chart Styles'
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
                    </CTabPane>
                    <CTabPane active={activeTab === 2}>
                        <SubSettingsList 
                            settingType='simple'
                            settingTitle='Chart Tools'
                            settingAttribute={[
                                {
                                    name: 'Fibonacci Retracements',
                                    id: {
                                        fibonacciRetracements: true,
                                        fibonacciTrendLineColor: currentChartSettings.fibonacciRetracementsColor || '#2ec2ff'
                                    },
                                    icon: 'fibonacci',
                                    shortCode: 'ALT+F',
                                    colorId: 'fibonacciRetracementsColor',
                                    colors: true,
                                    value: currentChartSettings.fibonacciRetracementsColor || '#2ec2ff',
                                    onClick: true
                                },
                                {
                                    name: 'Finite Line',
                                    id: {
                                        trendLine: true,
                                        trendLineType: 'LINE',
                                        trendLineColor: currentChartSettings.trendLineLineColor || '#2ec2ff'
                                    },
                                    icon: 'sLine',
                                    shortCode: 'ALT+L',
                                    colorId: 'trendLineLineColor',
                                    colors: true,
                                    value: currentChartSettings.trendLineLineColor || '#2ec2ff',
                                    onClick: true
                                },
                                {
                                    name: 'Semi-Infinite Line',
                                    id: {
                                        trendLine: true,
                                        trendLineType: 'RAY',
                                        trendLineColor: currentChartSettings.trendLineRayColor || '#2ec2ff'
                                    },
                                    icon: 'siLine',
                                    shortCode: 'ALT+R',
                                    colorId: 'trendLineRayColor',
                                    colors: true,
                                    value: currentChartSettings.trendLineRayColor || '#2ec2ff',
                                    onClick: true
                                },
                                {
                                    name: 'Infinite Line',
                                    id: {
                                        trendLine: true,
                                        trendLineType: 'XLINE',
                                        trendLineColor: currentChartSettings.trendLineXlineColor || '#2ec2ff'
                                    },
                                    icon: 'iLine',
                                    shortCode: 'ALT+X',
                                    colorId: 'trendLineXlineColor',
                                    colors: true,
                                    value: currentChartSettings.trendLineXlineColor || '#2ec2ff',
                                    onClick: true
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