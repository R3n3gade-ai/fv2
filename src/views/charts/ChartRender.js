import React, { useEffect, useState, useRef, useReducer } from "react";
import { connect } from 'react-redux'
import { updateProperty } from '../../store/actions/StylesActions'

import {
  CSpinner
} from '@coreui/react'
import CIcon from '@coreui/icons-react'

import moment from "moment";
import tzmoment from 'moment-timezone';
import shortid from "shortid";
import {ErrorBoundary} from 'react-error-boundary'

import ChartHolder from './ChartHolder.js'

let changedIndex = 1
const getDatabase = (eSymbol) => {
	let eSymbolCodeCharachter = eSymbol.charAt(0)
	let eSymbolCode = (eSymbolCodeCharachter.toLowerCase()).charCodeAt( eSymbolCodeCharachter.length - 1 )

	if (eSymbolCode >= 97 && eSymbolCode <= 101) {
		return 'ae'
	}

	if (eSymbolCode >= 102 && eSymbolCode <= 108) {
		return 'fl'
	}

	if (eSymbolCode >= 109 && eSymbolCode <= 115) {
		return 'ms'
	}

	if (eSymbolCode >= 116 && eSymbolCode <= 122) {
		return 'tz'
	}
}

const ChartRender = props => {
	const {
		currentSymbol,
		mainHeight,
		charts,
		fullScreenMode,
		updateTheCharts,
		chartState,
		updateProperty
	} = props

	if (mainHeight == 0) {
		return (
			null
		)
	}

	const [chartLoaded, setChartLoaded] = useState(false)
	const [ignored, forceUpdate] = useReducer(x => x + 1, 0)

	const chartRenderRef = useRef(null)

	useEffect(async() => {
		await setChartRenderComponent(currentSymbol)

		setChartLoaded(true)
	}, [props, charts])

	const setChartRenderComponent = async(theSymbol) => {
		const currentChartData = charts.filter(chartSet => {
			return chartSet.chartSymbol === theSymbol
		})

		if (chartRenderRef.current == null) {
			chartRenderRef.current = currentChartData[0]
			return
		}

		const chartDataSnap = chartRenderRef.current
		let resetCharts = false
		if (chartDataSnap.chartSettings.periodicity !== currentChartData[0].chartSettings.periodicity) {
			localStorage.removeItem(theSymbol)
			resetCharts = true
		}
		chartRenderRef.current = {
			...currentChartData[0],
			...{
				chartData: resetCharts ? [] : chartDataSnap.chartData || [],
				chartSettings: {
					...currentChartData[0].chartSettings,
					...{
						blocks: resetCharts ? null : chartDataSnap.chartSettings.blocks || null,
						zonesDivergence: resetCharts ? null : chartDataSnap.chartSettings.zonesDivergence || null
					}
				}
			}
		}

		forceUpdate()
	}

	if (!chartLoaded) {
		return <div style={{height: mainHeight, position: 'relative'}}><CSpinner className='absolute-spinner'/></div>
	}

	return (
		<ErrorBoundary
			FallbackComponent={({error, resetErrorBoundary}) => {
				console.log(error, resetErrorBoundary)
				return (
					null
				)
			}}
			onReset={() => {
			// reset the state of your app so the error doesn't happen again
			}}
		>
			<ChartHolder
				type="hybrid" 
				// data={chartRenderRef.current.chartData} 
				height={mainHeight}
				chartProps={chartRenderRef.current}
				symbol={chartRenderRef.current.chartSymbol}
				settings={chartRenderRef.current.chartSettings}
				chartKey={chartRenderRef.current.chartSymbol}
			/>
		</ErrorBoundary>
	);
}

const mapStateToProps = (state, ownProps) => {
  return {
    charts: state.charts.charts,
	fullScreenMode: state.charts.fullScreenMode,
	updateTheCharts: state.charts.updateTheCharts,
	chartState: state.charts.chartState,
	currentSymbol: ownProps.currentSymbol,
	mainHeight: ownProps.mainHeight
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    updateProperty: (property) => dispatch(updateProperty(property))
  }
}

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(ChartRender);