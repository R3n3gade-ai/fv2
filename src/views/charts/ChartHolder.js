
import React, { forwardRef, useRef, useState, useEffect, useReducer } from "react";
import ReactDOM from "react-dom";
import { connect } from 'react-redux'
import { updateProperty } from '../../store/actions/StylesActions'
import { SetChartSettings } from '../../store/actions/ChartActions'

import {
  CSpinner
} from '@coreui/react'
import CIcon from '@coreui/icons-react'

import { scaleTime } from "d3-scale";

import { format } from "d3-format";
import { timeFormat } from "d3-time-format";

import moment from "moment";
import tzmoment from 'moment-timezone';
import shortid from "shortid";

import { ChartCanvas, Chart } from "@t0x1c3500/react-stockcharts";
import {
	OHLCSeries,
    LineSeries,
    AreaSeries
} from "@t0x1c3500/react-stockcharts/lib/series";
import {
	OHLCTooltip
} from "@t0x1c3500/react-stockcharts/lib/tooltip";
import { XAxis, YAxis } from "@t0x1c3500/react-stockcharts/lib/axes";
import { fitWidth, SaveChartAsImage } from "@t0x1c3500/react-stockcharts/lib/helper";
import { last,toObject,hexToRGBA,createVerticalLinearGradient,changeTimezone } from "@t0x1c3500/react-stockcharts/lib/utils";
import { discontinuousTimeScaleProvider } from "@t0x1c3500/react-stockcharts/lib/scale";
import {
	CrossHairCursor,
    CurrentCoordinate,
    EdgeIndicator,
	MouseCoordinateX,
	MouseCoordinateY,
} from "@t0x1c3500/react-stockcharts/lib/coordinates";
import { flowTrade, flowTradeAvg } from "@t0x1c3500/react-stockcharts/lib/indicator";
import { 
    InteractiveYCoordinate,
    TrendLine,
    FibonacciRetracement,
    DrawingObjectSelector,
    Zones
} from "@t0x1c3500/react-stockcharts/lib/interactive";
import {
	saveInteractiveNodes,
	getInteractiveNodes,
} from "./Utils/InteractiveUtils";
import {
	Label,
	Annotate,
	LabelAnnotation,
} from "@t0x1c3500/react-stockcharts/lib/annotation";
import HoverTextNearMouse from "@t0x1c3500/react-stockcharts/lib/interactive/components/HoverTextNearMouse";

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
const parseNanexData = (nanexDate, nanexData) => {
	const utcTimeTick = moment.utc(+nanexDate).format();
	const chartTimeTick = new Date(new Date(utcTimeTick).toUTCString().substr(0, 25));

	if (+nanexData.O > 0 && (
		parseInt(chartTimeTick.getHours()) >= 9 && parseInt(chartTimeTick.getHours()) <= 16
	)) {
		if (
			[15, 30, 45].includes(chartTimeTick.getMinutes()) &&
			(parseInt(chartTimeTick.getHours()) == 16)
		) {
			return false;
		}

		if (+nanexData.L == 0) {
			nanexData.L = +nanexData.C;
		}
		if (+nanexData.H == 0) {
			nanexData.H = +nanexData.O;
		}

		return {
			date: chartTimeTick,
			open: +nanexData.O,
			high: +nanexData.H,
			low: +nanexData.L,
			close: +nanexData.C,
			volume: +nanexData.V,
			upTick: +nanexData.U,
			downTick: +nanexData.D,
			darkUpTick : +nanexData.DU,
			darkDownTick: +nanexData.DD
		};
	} else {
		return false;
	}
}

let intervalId;
let ChartHolder = forwardRef((props, ref) => {
    const {
        type: type, 
        width: width, 
        height: height, 
        symbol: symbol,
        ratio: ratio,
        settings: settings,
        chartKey: chartKey,

        charts,
        chartState,
        darkMode,
        whiteColor,
        primaryDarkColor,
        primaryLightColor,
        primaryLightBackground,
        xEventsState,
        fullScreenMode,
        screenShotSrc,
        showScreenShotModal,
        updateTheCharts,
        updateProperty,
        SetChartSettings
    } = props

    const chartCanvasRef = useRef(null)
    const xExtentsStartRef = useRef(2)
    const xExtentsEndRef = useRef(-150)
    const startReplayRef = useRef(false)
    const xExtentsStartLimitRef = useRef(0)
    const xExtentsEndLimitRef = useRef(0)
    const replayMarketRef = useRef(false)
    const replayMarketSpeedRef = useRef(0)
    const pausedMarketRef = useRef(false)

    const chartTrackedRef = useRef(false)
    const chartTrackedLastRef = useRef(false)
    const chartBlocksTrackedRef = useRef(false)
    const chartBlocksValuesRef = useRef([])
    const chartDivergencesTrackedRef = useRef(false)
    const chartDivergencesValuesRef = useRef([])

    const takeScreenShotRef = useRef(false)

    const [xExtentsReplay, setXExtentsReplay] = useState(null)
    const [ignored, forceUpdate] = useReducer(x => x + 1, 0)

	const [chartLoaded, setChartLoaded] = useState(false)
	const [unavailableChart, setUnavailableChart] = useState(false)
    const chartData = useRef([])

    useEffect(() => {
        chartData.current.length == 0 && getData() || setChartLoaded(true)

        window.addEventListener("keyup", onKeyPress)

        replayMarketRef.current = settings.replayMarket
        replayMarketSpeedRef.current = parseInt(settings.replayMarketSettings.speed)
        triggerReplayMarket()

        takeScreenShotRef.current = settings.takeScreenShot;
        triggerScreenShot()

        if (chartCanvasRef.current !== null) {
            chartCanvasRef.current.subscribe("xScaleSubscriber", { listener: onXScaleChange })
        }

        // if (!chartTrackedRef.current) {
        //     chartTrackedRef.current = true
        //     chartTrackedLastRef.current = initialData[ initialData.length - 1 ].close
        //     trackLivePrice()
        // }

        if (!chartBlocksTrackedRef.current) {
            chartBlocksTrackedRef.current = true
            getBlocks()
        }

        if (!chartDivergencesTrackedRef.current) {
            chartDivergencesTrackedRef.current = true
            getDivergence()
        }

        return () => {
            window.removeEventListener("keyup", onKeyPress)
        }
    }, [props])


    const trackLivePriceTest = () => {
		React.firebase.firebase.database(React.firebase['elTester'])
			.ref(`liveTick/e${chartKey}`)
			.on('value', (val) => {
                chartTrackedLastRef.current = val.val().C
                forceUpdate()

		})
    }

	const trackLivePrice = () => {
        let chartSymbolDatabase = getDatabase(chartKey)
		React.firebase.firebase.database(React.firebase['l' + chartSymbolDatabase])
			.ref(`liveTick/e${chartKey}`)
			.on('value', (val) => {
                const previousChartValues = chartData.current[ chartData.current.length - 1 ]
                if (typeof previousChartValues !== typeof undefined) {
                    chartData.current[ chartData.current.length - 1 ] = {
                        ...previousChartValues,
                        ...{
                            close: val.val().C,
                            high: val.val().C > previousChartValues.high ? val.val().C : previousChartValues.high,
                            low: val.val().C < previousChartValues.low ? val.val().C : previousChartValues.low
                        }
                    }

                    forceUpdate()
                }
		})
	}

    const onXScaleChange = (type, moreProps, state) => {
        if (typeof moreProps !== typeof undefined) {
            if (typeof moreProps.xScale !== typeof undefined) {
                localStorage.setItem(chartKey, JSON.stringify(moreProps.xScale.domain()))
            }
        }
    }

    const triggerScreenShot = () => {
        if (takeScreenShotRef.current) {
            takeScreenShotRef.current = false;
            editSettings({
                takeScreenShot: false
            })

            updateProperty({showScreenShotModal: !showScreenShotModal})
            
            const container = ReactDOM.findDOMNode(chartCanvasRef.current);
            SaveChartAsImage.save(document, container, '#24252f', function(src) {
                updateProperty({screenShotSrc: src})
            });
        }
    }

    const triggerReplayMarket = () => {
        if (replayMarketRef.current && !startReplayRef.current) {
            startReplayRef.current = true;
            intervalId = window.setInterval(function() {
                replayMarket();
            }, replayMarketSpeedRef.current);
        } else if ( !replayMarketRef.current && pausedMarketRef.current ) {
            editSettings({
                replayMarket: false,
                replayMarketSettings: {
                    speed: 250
                }
            })
            xExtentsStartRef.current = 2;
            xExtentsEndRef.current = -150;

            setXExtentsReplay(
                [xExtentsStartLimitRef.current, xExtentsEndLimitRef.current]
            )
            
            pausedMarketRef.current = false;
        }
    }

    const replayMarket = () => {
        setXExtentsReplay(
            [xExtentsStartRef.current, xExtentsEndRef.current]
        )

        xExtentsStartRef.current = xExtentsStartRef.current + 1;
        xExtentsEndRef.current = xExtentsEndRef.current + 1;

        if (
            (xExtentsStartRef.current == xExtentsStartLimitRef.current) ||
            (xExtentsEndRef.current == xExtentsEndLimitRef.current) ||
            (!replayMarketRef.current || replayMarketRef.current == 'pause' || replayMarketRef.current == 'replay')
        ) {
            clearInterval(intervalId);
            startReplayRef.current = false;

            if (
                (xExtentsStartRef.current == xExtentsStartLimitRef.current) ||
                (xExtentsEndRef.current == xExtentsEndLimitRef.current)
            ) {
                replayMarketRef.current = false;
            }

            if (!replayMarketRef.current) {
                editSettings({
                    replayMarket: false,
                    replayMarketSettings: {
                        speed: 250
                    }
                })
                xExtentsStartRef.current = 2;
                xExtentsEndRef.current = -150;

                setXExtentsReplay(
                    [xExtentsStartLimitRef.current, xExtentsEndLimitRef.current]
                )

                pausedMarketRef.current = false;
            } else if (replayMarketRef.current == 'replay') {
                editSettings({
                    replayMarket: 'play'
                })
            } else if (replayMarketRef.current == 'pause') {
                pausedMarketRef.current = true;
            }
        } 
    }

    const handleSelection = (interactives) => {
        interactives.map(interactive => {
            if (interactive.chartId == chartKey) {
                if (interactive.type == 'Trendline') {
                    editSettings({
                        trends: interactive.objects
                    })

                    SetChartSettings({
                        trends: interactive.objects
                    }, chartKey, false, true, true)
                } else if (interactive.type == 'FibonacciRetracement') {
                    editSettings({
                        retracements: interactive.objects
                    })

                    SetChartSettings({
                        retracements: interactive.objects
                    }, chartKey, false, true, true)
                }
            }
        });
	}

	const onKeyPress = (event) => {
		const keyCode = event.which;

		switch (keyCode) {
            case 46: { // DEL
                let keyTrends = [],
                    keyRetracements = []
                
                const keyTrendsParent = getSettings('trends')
                if (typeof keyTrendsParent !== typeof undefined) {
                    keyTrends = keyTrendsParent
                        .filter(each => !each.selected)
                }
                const keyRetracementsParent = getSettings('retracements')
                if (typeof keyRetracementsParent !== typeof undefined) {
                    keyRetracements = keyRetracementsParent
                        .filter(each => !each.selected)
                }

                chartCanvasRef.current.cancelDrag()
                editSettings({
                    trends: keyTrends,
                    retracements: keyRetracements
                })

                SetChartSettings({
                    trends: keyTrends,
                    retracements: keyRetracements
                }, chartKey, false, true, true)
                break;
            }
            case 27: { // ESC
                chartCanvasRef.current.cancelDrag()
                editSettings({
                    trendLine: false,
                    fibonacciRetracements: false
                })
                break;
            }
            case 68:   // D - Draw trendline
            case 69: { // E - Enable trendline
                editSettings({
                    trendLine: true,
                    fibonacciRetracements: true
                })
                break;
            }
            default: {
                chartCanvasRef.current.cancelDrag()
                break;
            }
		}
	}

    const flowindex = flowTrade()
        .id(0)
        .options({ flowType: settings.flowIndex })
        .merge((d, c) => { d.flowindex = c; })
        .accessor(d => d.flowindex)
        .stroke(
            settings.flowIndex === 'normal' ? settings.flowIndexColor : (
                settings.flowIndex === 'dark-pool' ? settings.flowDarkIndexColor : settings.flowBothIndexColor
            ))

    const flowindexavg = flowTradeAvg()
        .options({ windowSize: 10 })
        .merge((d, c) => { d.flowindexavg = c; })
        .accessor(d => d.flowindexavg)
        .stroke(settings.flowIndexAvgColor)

    var margin = { left: 0, right: 50, top: 20, bottom: 30 };
    var gridHeight = height - margin.top - margin.bottom
    var gridWidth = width - margin.left - margin.right

    var yGrid = settings.showGrid ? { 
        innerTickSize: -1 * gridWidth,
        tickStrokeDasharray: 'Solid',
        tickStrokeOpacity: 0.1,
        tickStrokeWidth: 1
    } : {}
    var xGrid = settings.showGrid ? { 
        innerTickSize: -1 * gridHeight,
        tickStrokeDasharray: 'Solid',
        tickStrokeOpacity: 0.1,
        tickStrokeWidth: 1
    } : {}

    const calculatedData = flowindexavg(flowindex(chartData.current));
    const xScaleProvider = discontinuousTimeScaleProvider
        .inputDateAccessor(d => d.date);

    const {
        data,
        xScale,
        xAccessor,
        displayXAccessor,
    } = xScaleProvider(calculatedData)

    const start = xAccessor(last(data))
    const end = xAccessor(data[0])
    let xExtents = localStorage.getItem(chartKey) !== null ? JSON.parse(localStorage.getItem(chartKey)) : [start, end]
    if (xExtentsStartLimitRef.current == 0 && xExtentsEndLimitRef.current == 0) {
        
        if (localStorage.getItem(chartKey) !== null) {
            const localStorageExtents = JSON.parse(localStorage.getItem(chartKey))
            xExtentsStartLimitRef.current = localStorageExtents[0]
            xExtentsEndLimitRef.current = localStorageExtents[1]
        } else {
            xExtentsStartLimitRef.current = start
            xExtentsEndLimitRef.current = end
        }
    }

    if (xExtentsReplay !== null) {
        xExtents = xExtentsReplay
    }

    const onDrawCompleteChart = (trendsChart) => {
        editSettings({
            trendLine: false,
            trends: trendsChart
        })

        SetChartSettings({
            trends: trendsChart
        }, chartKey, false, true, true)
	}

    const onDrawCompleteRetracement = (retracementsChart) => {
        editSettings({
            fibonacciRetracements: false,
            retracements: retracementsChart
        })

        SetChartSettings({
            retracements: retracementsChart
        }, chartKey, false, true, true)
	}

    const editSettings = (changesObject) => {
        const chartSetting = charts.filter(chartSet => {
            return chartSet.chartSymbol === chartKey
        })

        chartSetting[0].chartSettings = {
            ...chartSetting[0].chartSettings,
            ...changesObject
        }

        updateProperty({currentChartSettings: chartSetting[0].chartSettings, updateTheCharts: !updateTheCharts })
    }

    const getSettings = (field) => {
        const chartSetting = charts.filter(chartSet => {
            return chartSet.chartSymbol === chartKey
        })

        return chartSetting[0].chartSettings[field];
    }

    const getBlocks = props => {
		return new Promise((resolve, reject) => {
			React.firebase.firebase.database(React.firebase.blocks)
				.ref(`/Symbol/e${chartKey}`)
				.limitToLast(50)
				.on('value', (val) => {
                    let chartBlocksDataRequest = []
					val.forEach(function(childSnapshot) {
						const blockData = childSnapshot.val()
						const utcTimeTick = moment.utc(+blockData.t).format('MM-DD HH:mm')

                        chartBlocksDataRequest.push({
                            ...InteractiveYCoordinate.defaultProps.defaultPriceCoordinate,
                            fontSize: 9,
                            bgFill: blockData.D ? 
                                settings.blockTradesDarkPoolColor : 
                                settings.blockTradesRegularPoolColor,
                            stroke: blockData.D ? 
                                settings.blockTradesDarkPoolColor : 
                                settings.blockTradesRegularPoolColor,
                            textFill: '#ffffff',
                            timeCondition: utcTimeTick,
                            text: Number(blockData.P).toFixed(2),
                            textBox: {
                                ...InteractiveYCoordinate.defaultProps.defaultPriceCoordinate.textBox,
                                Radius: 8,
                                show: true,
                                fontSize: 9,
                                height: 15,
                                left: 0,
                                padding: {
                                    left: 3,
                                    right: 3
                                },
                                closeIcon: {
                                    padding: {
                                        left: 0,
                                        right: 0
                                    },
                                    width: 0
                                }
                            },
                            edge: {
                                ...InteractiveYCoordinate.defaultProps.defaultPriceCoordinate.edge,
                                fill: blockData.D ? 
                                    settings.blockTradesDarkPoolColor : 
                                    settings.blockTradesRegularPoolColor,
                                strokeWidth: 0,
                                strokeOpacity: 0,
                                arrowWidth: 0,
                                rectWidth: 25,
                                rectHeight: 15,
                                rectRadius: 7
                            },
                            yValue: blockData.P,
                            id: shortid.generate(),
                            draggable: false,
                            hoverText: {
                                ...HoverTextNearMouse.defaultProps,
                                bgFill: blockData.D ? 
                                    settings.blockTradesDarkPoolColor : 
                                    settings.blockTradesRegularPoolColor,
                                fill: '#ffffff',
                                bgOpacity: 1,
                                enable: true,
                                bgHeight: 18,
                                bgWidth: 120,
                                text: utcTimeTick + ' | ' + blockData.P.toFixed(2),
                            }
                        })
					})

                    chartBlocksValuesRef.current = chartBlocksDataRequest
					forceUpdate()
			})
		})
	}

    const getDivergence = props => {
		return new Promise((resolve, reject) => {
			let requestDate = tzmoment(new Date()).format('YYYY_MM_DD')

			React.firebase.firebase.database(React.firebase.tracking)
				.ref(`${requestDate}/one/latest`)
				.on('value', async(val) => {
                    let chartDivergencesDataRequest = []
					val.forEach(function(childSnapshot) {
						if (['priceDown', 'priceUp'].find(element => element == childSnapshot.key)) {
							let divergenceColor = childSnapshot.key == 'priceDown' ? '#0ccf02' : '#d0021b'
							childSnapshot.forEach(function(childSnapshotChild) {
								let divergenceFrequency = +childSnapshotChild.key
								childSnapshotChild.forEach(function(childSnapshotTimeStamp) {
									const childSnapShotValue = childSnapshotTimeStamp.val()
									if (childSnapShotValue.s == `e${chartKey}`) {
                                        let divergenceAlreadyAdded = chartDivergencesDataRequest.some(divergenceData => {
                                            return divergenceData.endTimeStamp == childSnapShotValue.t && divergenceData.fill == divergenceColor
                                        })

                                        if (!divergenceAlreadyAdded) {
                                            chartDivergencesDataRequest.push({
                                                id: childSnapshotTimeStamp.key,
                                                startTimeStamp: String(+childSnapShotValue.t - (60000 * divergenceFrequency)),
                                                endTimeStamp: childSnapShotValue.t,
                                                // gradientFill: [
                                                // 	{ stop: 0, color: hexToRGBA(divergenceColor, 0.025) },
                                                // 	{ stop: 0.5, color: hexToRGBA(divergenceColor, 0.15) },
                                                // 	{ stop: 1, color: hexToRGBA(divergenceColor, 0.35) }
                                                // ],
                                                fill: divergenceColor,
                                                canvasGradient: createVerticalLinearGradient([
                                                    { stop: 0, color: hexToRGBA(divergenceColor, 0.025) },
                                                    { stop: 0.5, color: hexToRGBA(divergenceColor, 0.15) },
                                                    { stop: 1, color: hexToRGBA(divergenceColor, 0.5) }
                                                ]),
                                                opacity: 0.1,
                                                startLine: {
                                                    stroke: divergenceColor,
                                                    strokeWidth: 1,
                                                    strokeOpacity: 0.7,
                                                    strokeDasharray: "ShortDash",
                                                }
                                            })
                                        }
									}
								})
							})
						}
					})

                    const finalDivergenceList = new Promise(resolve => {
                        let finalDivergenceReturnData = []
                        chartDivergencesDataRequest.map((divergenceDataMap, v) => {
                            if (v == 0) {
                                finalDivergenceReturnData.push(divergenceDataMap)
                            } else {
                                let previousDivergenceData = chartDivergencesDataRequest[ v - 1]
                                if (
                                    +previousDivergenceData.endTimeStamp > +divergenceDataMap.startTimeStamp &&
                                    previousDivergenceData.fill == divergenceDataMap.fill
                                ) {
                                    finalDivergenceReturnData.push({
                                        ...divergenceDataMap,
                                        ...{
                                            startTimeStamp: previousDivergenceData.startTimeStamp
                                        }
                                    })
                                    finalDivergenceReturnData = finalDivergenceReturnData.filter((divElement) => {
                                        return divElement.id !== previousDivergenceData.id
                                    })
                                } else {
                                    finalDivergenceReturnData.push(divergenceDataMap)
                                }
                            }

                        })

                        resolve(finalDivergenceReturnData)
                    })

                    const finalChartDivergencesDataRequest = await finalDivergenceList
                    chartDivergencesValuesRef.current = finalChartDivergencesDataRequest
					forceUpdate()
			})
		})
	}

	const getData = () => {
		return new Promise((resolve, reject) => {
			let symbolDatabase = getDatabase(chartKey)

			setChartLoaded(false)
			chartData.current = []

			if (settings.periodicity == '15m') {
				React.firebase.firebase.database(React.firebase[symbolDatabase])
					.ref(`bar15/e${chartKey}`)
					.limitToLast(1440)
					.on('value', (val) => {
						let chartDataRequest = []
						val.forEach(function(dayTicks) {
							const currentTick = parseNanexData(
								dayTicks.key,
								dayTicks.val()
							)

							if (currentTick !== false) {
								chartDataRequest.push(currentTick)
							}
						})

						if (chartDataRequest.length == 0) {
							setUnavailableChart(true)
							setChartLoaded(true)
						} else {
							chartData.current = chartDataRequest
							setChartLoaded(true)
						}
				})
			} else if (settings.periodicity == '1m') {
				React.firebase.firebase.database(React.firebase[symbolDatabase])
					.ref(`nanex/e${chartKey}`)
					.limitToLast(2)
					.on('value', (val) => {
						let chartDataRequest = []
						val.forEach(function(childSnapshot) {
							// if (childSnapshot.key == '2021_09_17') {
								childSnapshot.forEach(function(dayTicks) {
									const currentTick = parseNanexData(
										dayTicks.key,
										dayTicks.val()
									)

									if (currentTick !== false) {
										chartDataRequest.push(currentTick)
									}
								})
							// }
						})

						if (chartDataRequest.length == 0) {
							setUnavailableChart(true)
							setChartLoaded(true)
						} else {
							chartData.current = chartDataRequest
							setChartLoaded(true)
						}
				})
			}

			trackLivePrice()
		})
	}

	if (unavailableChart) {
		return (
			<div style={{height: height, position: 'relative'}}>
				<div className='absolute-text d-flex flex-column align-items-center justify-content-center'>
					<CIcon name='cis-sad' height={35} />
					<span className='h3 mt-2'>Unavailable</span>
				</div>
			</div>
		)
	}

	if (!chartLoaded) {
		return <div style={{height: height, position: 'relative'}}><CSpinner className='absolute-spinner'/></div>
	}

    return (
        <ChartCanvas height={height}
                ref={chartCanvasRef}
                ratio={ratio}
                width={width}
                margin={margin}
                padding={15}
                type={type}
                seriesName="MSFT"
                data={data}
                xScale={xScale}
                xAccessor={xAccessor}
                displayXAccessor={displayXAccessor}
                xExtents={xExtents}>

            <Chart id={chartKey} 
                yExtents={d => [d.high, d.low]}
                padding={{ top: 10, bottom: 10 }}>

                <XAxis 
                    axisAt='bottom' 
                    orient='bottom'
                    stroke={'white'}
                    strokeWidth={0.15}
                    opacity={0.1}
                    tickStroke={darkMode ? whiteColor : primaryLightBackground}
                    ticks={4}
                    {...xGrid} />
                <YAxis 
                    axisAt='right' 
                    orient='right'
                    stroke={'white'}
                    strokeWidth={0.15}
                    opacity={0.1}
                    tickStroke={darkMode ? whiteColor : primaryLightBackground}
                    ticks={8}
                    {...yGrid} />

                <MouseCoordinateX
                    at="bottom"
                    orient="bottom"
                    fontSize={10}
                    rectWidth={25}
                    rectHeight={15}
                    rectRadius={7}
                    displayFormat={timeFormat("%H:%M")} 
                    fill={darkMode ? primaryDarkColor : primaryLightColor}/>
                <MouseCoordinateY
                    at="right"
                    orient="right"
                    displayFormat={format(".2f")} 
                    arrowWidth={0}
                    fontSize={10}
                    rectWidth={25}
                    rectHeight={15}
                    rectRadius={7}
                    fill={darkMode ? primaryDarkColor : primaryLightColor} />

                <OHLCSeries 
                    stroke={settings.priceBarsColor} />

                <EdgeIndicator 
                    itemType="last" 
                    orient="right" 
                    edgeAt="right"
                    arrowWidth={0}
                    fontSize={10}
                    rectWidth={25}
                    rectHeight={15}
                    rectRadius={10}
                    yAccessor={d => d.close} fill={d => d.close > d.open ? "#6BA583" : "#FF0000"} />
                
                <OHLCTooltip 
                    origin={[0, -10]}
                    labelFill={ darkMode ? primaryDarkColor : primaryLightColor }
                    textFill={ darkMode ? whiteColor : primaryLightBackground } />

                { settings.blocksLine &&
                    <InteractiveYCoordinate
                        enabled={false}
                        yCoordinateList={chartBlocksValuesRef.current}
                    />}

                <TrendLine
                    ref={saveInteractiveNodes('Trendline', chartKey)}
                    enabled={settings.trendLine}
                    type={settings.trendLineType}
                    snap={false}
                    snapTo={d => [d.high, d.low]}
                    onStart={() => console.log("START")}
                    onComplete={onDrawCompleteChart}
                    trends={settings.trends}
                    appearance={{
                        stroke: darkMode ? primaryDarkColor : primaryLightColor,
                        strokeOpacity: 1,
                        strokeWidth: 1,
                        strokeDasharray: "Solid",
                        edgeStrokeWidth: 1,
                        edgeFill: "#FFFFFF",
                        edgeStroke: "#000000",
                        r: 6
                    }}
                />

                <FibonacciRetracement
                    ref={saveInteractiveNodes('FibonacciRetracement', chartKey)}
                    enabled={settings.fibonacciRetracements}
                    retracements={settings.retracements}
                    onComplete={onDrawCompleteRetracement}
                    appearance={{
                        stroke: darkMode ? primaryDarkColor : primaryLightColor,
                        strokeWidth: 1,
                        strokeOpacity: 1,
                        fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
                        fontSize: 11,
                        fontFill: darkMode ? '#FFFFFF' : '#000000',
                        edgeStroke: '#000000',
                        edgeFill: '#FFFFFF',
                        nsEdgeFill: darkMode ? primaryDarkColor : primaryLightColor,
                        edgeStrokeWidth: 1,
                        r: 5
                    }}
                />

                { settings.blocksLine &&
                    <Annotate 
                        with={LabelAnnotation}
                        when={d => {
                            let timeDateCondition = 
                                ("0" + (d.date.getMonth()+1)).slice(-2) + '-' +
                                ("0" + d.date.getDate()).slice(-2) + ' ' + 
                                ("0" + d.date.getHours()).slice(-2) + ':' + ("0" + d.date.getMinutes()).slice(-2);
                            
                            const blocksCondition = chartBlocksValuesRef.current.filter(singleBlock => {
                                return singleBlock.timeCondition == timeDateCondition
                            });

                            return blocksCondition.length > 0;
                        }}
                        usingProps={{
                            fontFamily: "coreui-icons-solid",
                            fontSize: 8,
                            fill: "white",
                            opacity: 1,
                            className: "blocktrades-marker",
                            text: "\ueb69",
                            y: ({ yScale, datum }) => {
                                let timeDateCondition = 
                                    ("0" + (datum.date.getMonth()+1)).slice(-2) + '-' +
                                    ("0" + datum.date.getDate()).slice(-2) + ' ' + 
                                    ("0" + datum.date.getHours()).slice(-2) + ':' + ("0" + datum.date.getMinutes()).slice(-2);
                                
                                const blocksCondition = chartBlocksValuesRef.current.filter(singleBlock => {
                                    return singleBlock.timeCondition == timeDateCondition
                                });

                                return yScale(blocksCondition[0].yValue);
                            },
                            onClick: console.log.bind(console),
                            tooltip: d => timeFormat("%B")(d.date),
                            // onMouseOver: console.log.bind(console),
                        }} />}

                { settings.showDivergence &&
                    chartDivergencesValuesRef.current.map(singleDivergence => {
                        return <AreaSeries
                            key={singleDivergence.id}
                            yAccessor={d => {
                                if (
                                    d.date >= changeTimezone(new Date(+singleDivergence.startTimeStamp), "UTC") &&
                                    d.date <= changeTimezone(new Date(+singleDivergence.endTimeStamp), "UTC")
                                ) {
                                    return d.close;
                                }
                            }}
                            strokeWidth={0}
                            strokeOpacity={0}
                            // fill={singleDivergence.fill}
                            canvasGradient={singleDivergence.canvasGradient}
                        />
                    })    
                }
            </Chart>
            <Chart id={`${chartKey}2`}
                yExtents={flowindex.accessor()}
                padding={{ top: 10, bottom: 20 }}
            >
                <LineSeries yAccessor={flowindex.accessor()} stroke={flowindex.stroke()}/>
                { settings.showAverage &&
                    <LineSeries yAccessor={flowindexavg.accessor()} stroke={flowindexavg.stroke()}/>}

                <CurrentCoordinate yAccessor={flowindex.accessor()} fill={flowindex.stroke()} />
                { settings.showAverage &&
                    <CurrentCoordinate yAccessor={flowindexavg.accessor()} fill={flowindexavg.stroke()} />}
            </Chart>
            
            <CrossHairCursor 
                stroke={ darkMode ? whiteColor : primaryLightBackground }
                strokeDasharray={"Solid"}
                opacity={0.2}
            />
            <DrawingObjectSelector
                enabled={(!settings.trendLine && !settings.fibonacciRetracements)}
                getInteractiveNodes={getInteractiveNodes}
                drawingObjectMap={{
                    Trendline: 'trends',
                    FibonacciRetracement: 'retracements'
                }}
                onSelect={handleSelection}
            />
        </ChartCanvas>
    )
})

ChartHolder = fitWidth(ChartHolder)

const mapStateToProps = (state) => {
  return {
    charts: state.charts.charts,
    chartState: state.charts.chartState,
    darkMode: state.charts.darkMode,
    whiteColor: state.charts.whiteColor,
    primaryDarkColor: state.charts.primaryDarkColor,
    primaryLightColor: state.charts.primaryLightColor,
    primaryLightBackground: state.charts.primaryLightBackground,
    xEventsState: state.charts.xEventsState,
    screenShotSrc: state.charts.screenShotSrc,
    showScreenShotModal: state.charts.showScreenShotModal,
    updateTheCharts: state.charts.updateTheCharts
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    updateProperty: (property) => dispatch(updateProperty(property)),
    SetChartSettings: (
          newChartSettings, chartSymbol, resetChartData, synchronizeChart, synchronizeChartOnly
        ) => dispatch(SetChartSettings(newChartSettings, chartSymbol, resetChartData, synchronizeChart, synchronizeChartOnly))
  }
}

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(ChartHolder)