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

const ChartRender = props => {
	const {
		currentSymbol,
		currentUid,
		currentEvent,
		mainHeight,
		charts,
		fullScreenMode,
		newChartLoaded,
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
	const mountedRef = useRef(true)

	useEffect(async() => {
		if (!mountedRef.current) return null

		if (newChartLoaded) {
			updateProperty({newChartLoaded: false})
			setChartLoaded(false)
		}

		await setChartRenderComponent(currentSymbol, currentUid, currentEvent)

		setChartLoaded(true)
	}, [props, charts])

	useEffect(() => {
		return () => { 
			mountedRef.current = false
		}
	}, [])

	const setChartRenderComponent = async(theSymbol, theUid, theEvent) => {
		const currentChartData = charts.filter(chartSet => {
			return chartSet.chartUid === theUid
		})

		if (chartRenderRef.current == null) {
			chartRenderRef.current = currentChartData[0]
			return
		}

		if (typeof currentChartData[0] == typeof undefined) return

		const chartDataSnap = chartRenderRef.current
		let resetCharts = false
		if (chartDataSnap.chartSettings.periodicity !== currentChartData[0].chartSettings.periodicity) {
			localStorage.removeItem(theUid)
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

		if (theEvent != null && theEvent.chart == theUid) {
			chartRenderRef.current = {
				...chartRenderRef.current,
				...{
					chartEvent: theEvent
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
				// data={chartRenderRef.current.chartData} 
				height={mainHeight}
				chartProps={chartRenderRef.current}
				symbol={chartRenderRef.current.chartSymbol}
				settings={chartRenderRef.current.chartSettings}
				chartKey={chartRenderRef.current.chartSymbol}
				chartUid={chartRenderRef.current.chartUid}
				chartEvent={chartRenderRef.current.chartEvent}
			/>
		</ErrorBoundary>
	)
}

const mapStateToProps = (state, ownProps) => {
  return {
    charts: state.charts.charts,
	fullScreenMode: state.charts.fullScreenMode,
	updateTheCharts: state.charts.updateTheCharts,
	chartState: state.charts.chartState,
	newChartLoaded: state.charts.newChartLoaded,
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
)(ChartRender)