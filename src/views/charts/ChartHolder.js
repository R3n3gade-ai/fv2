
import React, { forwardRef, useRef, useState, useEffect, useReducer } from 'react'
import ReactDOM from 'react-dom'
import { compose } from 'redux'
import { connect } from 'react-redux'
import { updateProperty } from '../../store/actions/StylesActions'
import { SetChartSettings } from '../../store/actions/ChartActions'

import {
  CSpinner
} from '@coreui/react'
import CIcon from '@coreui/icons-react'

import { scaleTime } from 'd3-scale';

import { format } from 'd3-format';
import { timeFormat } from 'd3-time-format';

import moment from 'moment';
import tzmoment from 'moment-timezone';
import shortid from 'shortid';

import { ChartCanvas, Chart, ZoomButtons } from '/node_modules/@tradingproject19/react-stockcharts';
import {
	OHLCSeries,
    LineSeries,
    AreaSeries,
    CandlestickSeries,
    HeatMapSeries,
    BarSeries
} from '/node_modules/@tradingproject19/react-stockcharts/src/lib/series';
import {
	OHLCTooltip
} from '/node_modules/@tradingproject19/react-stockcharts/src/lib/tooltip';
import { XAxis, YAxis } from '/node_modules/@tradingproject19/react-stockcharts/src/lib/axes';
import { fitWidth, SaveChartAsImage } from '/node_modules/@tradingproject19/react-stockcharts/src/lib/helper';
import { last,toObject,hexToRGBA,createVerticalLinearGradient,changeTimezone } from '/node_modules/@tradingproject19/react-stockcharts/src/lib/utils';
import { discontinuousTimeScaleProvider } from '/node_modules/@tradingproject19/react-stockcharts/src/lib/scale';
import {
	CrossHairCursor,
    CurrentCoordinate,
    EdgeIndicator,
	MouseCoordinateX,
	MouseCoordinateY,
} from '/node_modules/@tradingproject19/react-stockcharts/src/lib/coordinates';
import { flowTrade, flowTradeAvg } from '/node_modules/@tradingproject19/react-stockcharts/src/lib/indicator';
import { 
    InteractiveYCoordinate,
    TrendLine,
    FibonacciRetracement,
    DrawingObjectSelector,
    Zones
} from '/node_modules/@tradingproject19/react-stockcharts/src/lib/interactive';
import {
	saveInteractiveNodes,
	getInteractiveNodes,
} from './Utils/InteractiveUtils';
import {
	Label,
	Annotate,
	LabelAnnotation,
} from '/node_modules/@tradingproject19/react-stockcharts/src/lib/annotation';
import HoverTextNearMouse from '/node_modules/@tradingproject19/react-stockcharts/src/lib/interactive/components/HoverTextNearMouse';

import Slider from 'react-rangeslider'
import 'react-rangeslider/lib/index.css'

import {
	getLatestWorkingDay
} from './Utils/dateUtils';
import chroma from 'chroma-js';
import {
	curveCardinal,
    curveBasis
} from 'd3-shape';

const parseNanexDataBis = (nanexDate, nanexData, nanexOffset, isStock) => {
    const chartTimeTick = new Date(
        (new Date(+nanexDate)).toLocaleString('en-US', {
            timeZone: 'America/New_York'
        })
    )
    if (chartTimeTick.getHours() >= 16 && isStock) {
        return false
    }

    if (+nanexData.L == 500000) {
        return false
    }

    if (+nanexData.O == 0 && +nanexData.C == 0) {
        return false
    }

    if (+nanexData.O == 0) {
        nanexData.O = +nanexData.C
    }

    if (+nanexData.C == 0) {
        nanexData.C = +nanexData.O
    }

    const startOfDay = ( nanexOffset == 1 ) ? 
        chartTimeTick.getHours() == 9 && chartTimeTick.getMinutes() == 30 :
        chartTimeTick.getHours() == 9 && chartTimeTick.getMinutes() == 45

    return {
        date: chartTimeTick,
        timestamp: chartTimeTick.getTime(),
        epoch: +nanexDate,
        open: +nanexData.O,
        high: +nanexData.H,
        low: +nanexData.L,
        close: +nanexData.C,
        volume: +nanexData.V,
        upTick: +nanexData.U,
        downTick: +nanexData.D,
        darkUpTick : +nanexData.DU,
        darkDownTick: +nanexData.DD,
        startOfDay: startOfDay,
        bids: nanexData.bids,
        asks: nanexData.asks
    }
}
const getDatabase = (symbol) => {
	let symbolCode = (symbol.toLowerCase()).charCodeAt( 0 )

    if (symbolCode >= 97 && symbolCode < 102) {
		return 'ae'
	}

	if (symbolCode >= 102 && symbolCode <= 108) {
		return 'fl'
	}

	if (symbolCode >= 109 && symbolCode <= 115) {
		return 'ms'
	}

	if (symbolCode >= 116 && symbolCode <= 122) {
		return 'tz'
	}
}
const hexToRgb = (hex) => {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
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
        chartUid : chartUid,
        chartEvent: chartEvent,

        charts,
        chartState,
        darkMode,
        whiteColor,
        primaryDarkColor,
        primaryLightColor,
        primaryLightBackground,
        xEventsState,
        screenShotSrc,
        showScreenShotModal,
        updateTheCharts,
        selectedChart,
        selectedChartEvent,
        fullScreenMode,
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
    const replayMarketSpeedChanged = useRef(false)
    const replayMarketSpeedRef = useRef(0)
    const pausedMarketRef = useRef(false)

    const chartBlocksValuesRef = useRef([])
    const chartDivergencesValuesRef = useRef([])
    const chartOrderbookValuesRef = useRef({})

    const takeScreenShotRef = useRef(false)

    const showGridRef = useRef(false)

    const [xExtentsReplay, setXExtentsReplay] = useState(null)
    const [ignored, forceUpdate] = useReducer(x => x + 1, 0)

	const [chartLoaded, setChartLoaded] = useState(false)
	const [unavailableChart, setUnavailableChart] = useState(false)

    const eventUid = useRef(null)

    const [rgbaColor, setRgbaColor] = useState(null)

    const [suffixState, setSuffixState] = useState(1)

    const chartData = useRef([])
    const blocksDatesData = useRef(null)
    const firstChartDataPush = useRef(false)

    let chartSettingsRef = useRef({}),
        divergenceFirebaseRef = useRef(null),
        //Poly Refs
        liveFirebaseRef = useRef(null),
        data1mPolyRef = useRef(null),
        //data1mPolyBookRef = useRef(null),
        data15mPolyRef = useRef(null),
        //data15mPolyBookRef = useRef(null),
        dataBlocksPolyRef = useRef(null),

        data1mFuturesRef = useRef(null),
        data15mFuturesRef = useRef(null),
        dataBlocksFuturesRef = useRef(null),
        livefuturesRef = useRef(null)
        //data1mFuturesBookRef = useRef(null),
        //data15mFuturesBookRef = useRef(null)

    useEffect(() => {
        if (liveFirebaseRef.current == null) {
            let databaseSymbol = getDatabase(chartKey),
                requestDateOrigin = new Date(),
                requestedMoment = tzmoment(requestDateOrigin).tz('America/New_York'),
                requestDateEdited = ([0,6].includes(requestedMoment.day())) ? 
                    requestedMoment.subtract(
                    requestedMoment.day() == 0 ? 2 : 1, 
                    'days'
                    )
                    : (
                        requestedMoment.hour() < 9 ? requestedMoment.subtract(1, 'days') : requestedMoment
                    ),
                requestDate = requestDateEdited.format('YYYY-MM-DD')

                //Poly References
            liveFirebaseRef.current = React.firebase.firebase.database(React.firebase['live' + databaseSymbol]).ref(`${chartKey}`)
            data1mPolyRef.current = React.firebase.firebase.database(React.firebase['poly' + databaseSymbol]).ref(`1m/${chartKey}`).orderByKey().limitToLast(2)
            //data1mPolyBookRef.current = React.firebase.firebase.database(React.firebase['book' + databaseSymbol]).ref(`1m/${chartKey}`).orderByKey()
            data15mPolyRef.current = React.firebase.firebase.database(React.firebase['poly' + databaseSymbol]).ref(`15m/${chartKey}`).orderByKey().limitToLast(30)
            //data15mPolyBookRef.current = React.firebase.firebase.database(React.firebase['book' + databaseSymbol]).ref(`15m/${chartKey}`).orderByKey().limitToLast(30)
            dataBlocksPolyRef.current = React.firebase.firebase.database(React.firebase.blocks).ref(`symbols/${chartKey}`).orderByKey()
            divergenceFirebaseRef.current = React.firebase.firebase.database(React.firebase.tracking).ref(`${requestDate}/one/latest`)

            livefuturesRef.current = React.firebase.firebase.database(React.firebase['livefutures']).ref(`symbols/${chartKey}`)
            data1mFuturesRef.current = React.firebase.firebase.database(React.firebase['futures']).ref(`1m/${chartKey}`).orderByKey().limitToLast(2)
            //data1mFuturesBookRef.current = React.firebase.firebase.database(React.firebase['bookfutures']).ref(`1m/${chartKey}`).orderByKey()
            data15mFuturesRef.current = React.firebase.firebase.database(React.firebase['futures']).ref(`15m/${chartKey}`).orderByKey().limitToLast(30)
            //data15mFuturesBookRef.current = React.firebase.firebase.database(React.firebase['bookfutures']).ref(`15m/${chartKey}`).orderByKey().limitToLast(30)
            dataBlocksFuturesRef.current = React.firebase.firebase.database(React.firebase.blocksfutures).ref(`symbols/${chartKey}`).orderByKey()
        }
    }, [])

    useEffect(() => {
        if (chartEvent != null && chartEvent.chart == chartUid && chartEvent.uid != eventUid.current) {
            eventUid.current = chartEvent.uid
            onKeyPress(chartEvent.code)
        }
    }, [chartEvent])

    useEffect(() => {
        replayMarketRef.current = settings.replayMarket
        if (replayMarketSpeedRef.current > 0 && 
            parseInt(replayMarketSpeedRef.current) != parseInt(settings.replayMarketSettings.speed)
        ) {
            replayMarketSpeedChanged.current = true
        }
        replayMarketSpeedRef.current = parseInt(settings.replayMarketSettings.speed)
        triggerReplayMarket()
    }, [settings.replayMarket])

    useEffect(() => {
        takeScreenShotRef.current = settings.takeScreenShot;
        triggerScreenShot()
    }, [settings.takeScreenShot])

    useEffect(() => {
        showGridRef.current = settings.showGrid
    }, [settings.showGrid])

    useEffect(() => {
        setRgbaColor(
            hexToRgb(settings.priceBarsColor)
        )
    }, [settings.priceBarsColor])

    useEffect(() => {
        getDataBis()
    }, [settings.periodicity])

    useEffect(() => {
        getBlocksBis()
    }, [settings.blocktradesDates])

    useEffect(() => {
        if(chartLoaded) {
            getDivergence()
            //getOrderBook()
        }
    }, [chartLoaded])

    useEffect(() => {
        return () => {            
            liveFirebaseRef.current.off('value')
            data1mPolyRef.current.off('value')
            //data1mPolyBookRef.current.off('value')
            data15mPolyRef.current.off('value')
            //data15mPolyBookRef.current.off('value')
            divergenceFirebaseRef.current.off('value')
            dataBlocksPolyRef.current.off('value')

            data1mFuturesRef.current.off('value')
            data15mFuturesRef.current.off('value')
            dataBlocksFuturesRef.current.off('value')
            //data1mFuturesBookRef.current.off('value')
            livefuturesRef.current.off('value')
        }
    }, [])

	const trackLivePrice = () => {
        liveFirebaseRef.current.off('value')
        liveFirebaseRef.current.on('value', postTrackLivePrice)
	}

    const trackLiveFuturesPrice = () => {
        livefuturesRef.current.off('value')
        livefuturesRef.current.on('value', postTrackLiveFuturesPrice)
	}

    const onceTrackLivePrice = (rate) => {        
        liveFirebaseRef.current.once('value', (val) => {
            const currentESTTime = new Date(
                (new Date()).toLocaleString('en-US', {
                    timeZone: 'America/New_York'
                })
            )

            if (currentESTTime.getHours() >= 16 ||
                currentESTTime.getHours() < 9 ||
                ( currentESTTime.getHours() == 9 && currentESTTime.getMinutes() < 30) ||
                ( currentESTTime.getHours() == 9 && currentESTTime.getMinutes() < 45 && rate == 15 ) ||
                ( currentESTTime.getDay() == 0 || currentESTTime.getDay() == 6)
            ) {
                return
            }

            const nanexData = val.val()
            const previousNanexData = chartData.current[ chartData.current.length - 1 ]
            const chartTimeTick = new Date(+previousNanexData.timestamp + ( rate * 60000))

            if (
                previousNanexData.date.getHours() == 15 &&
                previousNanexData.date.getMinutes() == 59
            ) {
                return
            }

            chartData.current.push({
                date: chartTimeTick,
                open: +previousNanexData.close,
                high: +previousNanexData.close,
                low: +nanexData.C,
                close: +nanexData.C,
                volume: +nanexData.V,
                upTick: +nanexData.U,
                downTick: +nanexData.D,
                darkUpTick : +nanexData.DU,
                darkDownTick: +nanexData.DD
            })
        })
    }

    const onceTrackFuturesLivePrice = (rate) => {     
        livefuturesRef.current.once('value', (val) => {
            const currentESTTime = new Date(
                (new Date()).toLocaleString('en-US', {
                    timeZone: 'America/New_York'
                })
            )

            if (
                currentESTTime.getDay() == 0 || currentESTTime.getDay() == 6
            ) {
                return
            }

            const nanexData = val.val()
            const previousNanexData = chartData.current[ chartData.current.length - 1 ]
            const chartTimeTick = new Date(+previousNanexData.timestamp + ( rate * 60000))

            chartData.current.push({
                date: chartTimeTick,
                open: +previousNanexData.close,
                high: +previousNanexData.close,
                low: +nanexData.C,
                close: +nanexData.C,
                volume: +nanexData.V,
                upTick: +nanexData.U,
                downTick: +nanexData.D,
                darkUpTick : +nanexData.DU,
                darkDownTick: +nanexData.DD
            })
        })
    }

    const postTrackLivePrice = (val) => {
        const previousChartValues = chartData.current[ chartData.current.length - 1 ]
        const currentESTTime = new Date(
            (new Date()).toLocaleString('en-US', {
                timeZone: 'America/New_York'
            })
        )

        if (typeof previousChartValues !== typeof undefined) {
            if (
                (
                    (currentESTTime.getHours() == 9 && currentESTTime.getMinutes() == 30 && settings.periodicity == '1m') ||
                    (currentESTTime.getHours() == 9 && currentESTTime.getMinutes() < 45 && settings.periodicity == '15m')
                ) && 
                !firstChartDataPush.current
            ) {
                firstChartDataPush.current = true
                chartData.current.push({
                    date: currentESTTime,
                    open: +previousChartValues.close,
                    high: +previousChartValues.close,
                    low: +previousChartValues.close,
                    close: +previousChartValues.close,
                    volume: 0,
                    upTick: 0,
                    downTick: 0,
                    darkUpTick : 0,
                    darkDownTick: 0
                })
            } else {
                chartData.current[ chartData.current.length - 1 ] = {
                    ...previousChartValues,
                    ...{
                        close: val.val().C,
                        high: val.val().C > previousChartValues.high ? val.val().C : previousChartValues.high,
                        low: val.val().C < previousChartValues.low ? val.val().C : previousChartValues.low,
                        volume: val.val().V,
                        upTick: val.val().U,
                        downTick: val.val().D,
                        darkUpTick : val.val().DU,
                        darkDownTick: val.val().DD
                    }
                }   
            }

            forceUpdate()
        }
    }

    const postTrackLiveFuturesPrice = (val) => {
        const previousChartValues = chartData.current[ chartData.current.length - 1 ]
        const currentESTTime = new Date(
            (new Date()).toLocaleString('en-US', {
                timeZone: 'America/New_York'
            })
        )

        if (
            currentESTTime.getDay() == 0 || currentESTTime.getDay() == 6
        ) {
            return
        }

        if (typeof previousChartValues !== typeof undefined) {
            if (
                (
                    (currentESTTime.getHours() == 23 && currentESTTime.getMinutes() == 59 && settings.periodicity == '1m') ||
                    (currentESTTime.getHours() == 23 && currentESTTime.getMinutes() < 45 && settings.periodicity == '15m')
                ) && 
                !firstChartDataPush.current
            ) {
                firstChartDataPush.current = true
                chartData.current.push({
                    date: currentESTTime,
                    open: +previousChartValues.close,
                    high: +previousChartValues.close,
                    low: +previousChartValues.close,
                    close: +previousChartValues.close,
                    volume: 0,
                    upTick: 0,
                    downTick: 0,
                    darkUpTick : 0,
                    darkDownTick: 0
                })
            } else {
                chartData.current[ chartData.current.length - 1 ] = {
                    ...previousChartValues,
                    ...{
                        close: val.val().C,
                        high: ( val.val().C > previousChartValues.high && val.val().C > 0 ) ? val.val().C : previousChartValues.high,
                        low: ( val.val().C < previousChartValues.low && val.val().C > 0 ) ? val.val().C : previousChartValues.low,
                        volume: val.val().V,
                        upTick: val.val().U,
                        downTick: val.val().D,
                        darkUpTick : val.val().DU,
                        darkDownTick: val.val().DD
                    }
                }   
            }

            forceUpdate()
        }
    }

    const triggerScreenShot = () => {
        if (takeScreenShotRef.current) {
            takeScreenShotRef.current = false;
            editSettings({
                takeScreenShot: false
            })
            
            const container = ReactDOM.findDOMNode(chartCanvasRef.current);
            SaveChartAsImage.save(document, container, '#24252f', symbol + '|' + settings.periodicity, fullScreenMode ? 180 : 90, function(src) {
                updateProperty({showScreenShotModal: true, screenShotSrc: src})
            });
        }
    }

    const triggerReplayMarket = () => {
        if (replayMarketRef.current && !startReplayRef.current) {
            startReplayRef.current = true
            intervalId = window.setInterval(function() {
                replayMarket()
            }, replayMarketSpeedRef.current)
        } else if ( !replayMarketRef.current && pausedMarketRef.current ) {
            editSettings({
                replayMarket: false,
                replayMarketSettings: {
                    speed: 250
                }
            })
            xExtentsStartRef.current = 2
            xExtentsEndRef.current = -150

            setXExtentsReplay(
                [xExtentsStartLimitRef.current, xExtentsEndLimitRef.current]
            )
            
            pausedMarketRef.current = false
        }
    }

    const replayMarket = () => {
        setXExtentsReplay(
            [xExtentsStartRef.current, xExtentsEndRef.current]
        )

        xExtentsStartRef.current = xExtentsStartRef.current + 1
        xExtentsEndRef.current = xExtentsEndRef.current + 1

        if (
            xExtentsStartRef.current > chartData.current.length ||
            (!replayMarketRef.current || replayMarketRef.current == 'pause' || replayMarketSpeedChanged.current )
        ) {
            clearInterval(intervalId)
            startReplayRef.current = false

            if ( xExtentsStartRef.current > chartData.current.length ) {
                replayMarketRef.current = false
            }

            if (!replayMarketRef.current) {
                editSettings({
                    replayMarket: false,
                    replayMarketSettings: {
                        speed: 250
                    }
                })

                xExtentsStartRef.current = 2
                xExtentsEndRef.current = -150

                setXExtentsReplay(
                    [xExtentsStartLimitRef.current, xExtentsEndLimitRef.current]
                )

                pausedMarketRef.current = false
            } else if (replayMarketSpeedChanged.current) {
                replayMarketSpeedChanged.current = false
                triggerReplayMarket()
            } else if (replayMarketRef.current == 'pause') {
                pausedMarketRef.current = true
            }
        } 
    }

    const handleSelection = (interactives) => {
        interactives.map(interactive => {
            if (interactive.chartId == chartUid) {
                if (interactive.type == 'Trendline') {
                    editSettings({
                        trends: interactive.objects
                    })

                    SetChartSettings({
                        trends: interactive.objects
                    }, chartUid, false, true, true)
                } else if (interactive.type == 'FibonacciRetracement') {
                    editSettings({
                        retracements: interactive.objects
                    })

                    SetChartSettings({
                        retracements: interactive.objects
                    }, chartUid, false, true, true)
                }
            }
        })
	}

	const onKeyPress = (keyCode) => {
       console.log("keypress:"+keyCode);
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

                if (chartCanvasRef.current != null) chartCanvasRef.current.cancelDrag()
                editSettings({
                    trends: keyTrends,
                    retracements: keyRetracements
                })

                SetChartSettings({
                    trends: keyTrends,
                    retracements: keyRetracements
                }, chartUid, false, true, true)
                break
            }
            case 9: { // TAB    
                let currentIndex = charts.findIndex(mapChart => {
                        return mapChart.chartUid == chartUid
                    }),
                    nextSelectChartIndex = (typeof charts[currentIndex + 1] != typeof undefined) ? currentIndex + 1 : 0
                
                updateProperty({selectedChartEvent: null, selectedChart: charts[nextSelectChartIndex].chartUid})
                break
            }
            case 32: { // SPACE
                updateProperty({selectedChartEvent: null, selectedChart: null})
                break
            }
            case 27: { // ESC
                if (chartCanvasRef.current != null) chartCanvasRef.current.cancelDrag()
                editSettings({
                    trendLine: false,
                    fibonacciRetracements: false
                })
                break
            }
            case 70: { // F
                editSettings({
                    drawingMode: true,
                    fibonacciRetracements: true,
                    fibonacciTrendLineColor: settings.fibonacciRetracementsColor || '#2ec2ff'
                })
                break;
            }
            case 76: { // L
                editSettings({
                    drawingMode: true,
                    trendLine: true,
                    trendLineType: 'LINE',
                    trendLineColor: settings.trendLineLineColor || '#2ec2ff'
                })
                break;
            }
            case 82: { // R
                editSettings({
                    drawingMode: true,
                    trendLine: true,
                    trendLineType: 'RAY',
                    trendLineColor: settings.trendLineRayColor || '#2ec2ff'
                })
                break;
            }
            case 88: { // X
                editSettings({
                    drawingMode: true,
                    trendLine: true,
                    trendLineType: 'XLINE',
                    trendLineColor: settings.trendLineXlineColor || '#2ec2ff'
                })
                break;
            }
            default: {
                if(chartCanvasRef.current != null) chartCanvasRef.current.cancelDrag()
                break;
            }
		}
	}

    const handleReset = (dataLength) => {
        localStorage.setItem(chartUid, JSON.stringify([0, dataLength]))
        localStorage.setItem('scale_' + chartUid, JSON.stringify({
            'length': dataLength,
            'end': 0
        }))
        localStorage.removeItem('yScale_' + chartUid)
        setSuffixState(
            suffixState + 1
        )
    }

    const handleFirst = (dataLength) => {
        let savedScale = localStorage.getItem('scale_' + chartUid)
        if (savedScale !== null) {
            let parsedSavedScale = JSON.parse(savedScale)
            localStorage.setItem('scale_' + chartUid, JSON.stringify({
                'length': parsedSavedScale.length,
                'end': 0
            }))
            setSuffixState(
                suffixState + 1
            )
        } else {
            handleReset(dataLength)
        }
    }

    const applyDivergence = (chartData) => {
        let returnChartData = chartData
        if (chartDivergencesValuesRef.current.length && chartData.length) {
            chartDivergencesValuesRef.current.map(chartDivergence => {
                chartData.map((singleChartData, sIndex) => {
                    let divergenceStartDate = tzmoment(+chartDivergence.startTimeStamp).tz('America/New_York'),
                        divergenceEndDate = tzmoment(+chartDivergence.endTimeStamp).tz('America/New_York'),
                        chartNowDate = tzmoment(+singleChartData.epoch).tz('America/New_York')

                    if (
                        chartNowDate >= divergenceStartDate &&
                        chartNowDate <= divergenceEndDate
                    ) {
                        returnChartData[sIndex] = {
                            ...returnChartData[sIndex],
                            ...{
                                divergenceDetected: true,
                                divergenceTrend: chartDivergence.trend
                            }
                        }
                    }
                })
            })
        }

        return returnChartData
    }

    const applyBlockTrades = (chartData) => {
        let returnChartData = chartData
        if (chartBlocksValuesRef.current && chartData.length) {
            chartData.map((singleChartData, sIndex) => {
                let timeDateCondition = 
                    ("0" + (singleChartData.date.getMonth()+1)).slice(-2) + '-' +
                    ("0" + singleChartData.date.getDate()).slice(-2) + ' ' + 
                    ("0" + singleChartData.date.getHours()).slice(-2) + ':' + ("0" + singleChartData.date.getMinutes()).slice(-2);
                
                const blocksCondition = chartBlocksValuesRef.current.filter(singleBlock => {
                    return singleBlock.timeCondition == timeDateCondition
                })

                if (blocksCondition.length > 0) {
                    returnChartData[sIndex] = {
                        ...returnChartData[sIndex],
                        ...{
                            blockTrade: true,
                            blockTradeValue: blocksCondition[0].yValue
                        }
                    }
                }
            })
        }

        return returnChartData
    }

    const applyHeatMap = (chartData) => {
        let returnChartData = chartData;
        const colorScale = chroma.scale(['08233e', '98c4f0']);
        if (Object.keys(chartOrderbookValuesRef.current).length && chartData.length) {
            chartData.map((singleChartData, sIndex) => {
                if (typeof chartOrderbookValuesRef.current[singleChartData.epoch] !== typeof undefined) {
                    let singleOrderbookChartData = chartOrderbookValuesRef.current[singleChartData.epoch]

                    const vols = extractBidVolumes(singleOrderbookChartData).sort((a, b) => a - b);
                    let maxBidAsk;
                    if (vols.length > 0) {
                        maxBidAsk = vols[vols.length - 1];
                    } else {
                        maxBidAsk = 1;
                    }
    
                    let heatBidCells = [],
                        heatAskCells = [];
                    Object.keys(singleOrderbookChartData.buys).sort().map((rate, kDepth) => {
                        const ratePrice = Number.parseFloat(rate).toFixed(2);
                        const depth = singleOrderbookChartData.buys[rate];
                        //let opacity = ( depth / maxBidAsk );
                        let opacity = 1;
    
                        heatBidCells.push({
                            type: 'bid',
                            fill: hexToRGBA(colorScale(opacity).hex(), 1),
                            hit: ratePrice
                        })
                    });
                    Object.keys(singleOrderbookChartData.sells).sort().map((rate, kDepth) => {
                        const ratePrice = Number.parseFloat(rate).toFixed(2);
                        const depth = singleOrderbookChartData.sells[rate];
                        let opacity = ( depth / maxBidAsk );
    
                        heatAskCells.push({
                            type: 'ask',
                            fill: hexToRGBA(colorScale(opacity).hex(), 1),
                            hit: ratePrice
                        })
                    });

                    returnChartData[sIndex] = {
                        ...returnChartData[sIndex],
                        ...{
                            maxBidAsk: maxBidAsk,
                            heatCells: heatBidCells.concat(heatAskCells)
                        }
                    }
                } else {
                    returnChartData[sIndex] = {
                        ...returnChartData[sIndex],
                        ...{
                            maxBidAsk: 1,
                            heatCells: [].concat([])
                        }
                    }
                }
            })
        }

        return returnChartData
    }

    const extractBidVolumes = (plotData) => {
        if ('buys' in plotData && 'sells' in plotData) {
            let buys = Object.keys(plotData.buys).map(key => +plotData.buys[key]);
            let sells = Object.keys(plotData.sells).map(key => +plotData.sells[key]);
            return buys.concat(sells);
        } else {
            return [];
        }
    }

    const flowindex = flowTrade()
        .id(0)
        .options({ flowType: settings.flowIndex, strokeWidth: Number(settings.flowIndexWidth) })
        .merge((d, c) => { d.flowindex = c; })
        .accessor(d => d.flowindex)
        .stroke(
            settings.flowIndex === 'normal' ? settings.flowIndexColor : (
                settings.flowIndex === 'dark-pool' ? settings.flowDarkIndexColor : settings.flowBothIndexColor
            ))

    const flowindexavg = flowTradeAvg()
        .options({ windowSize: 10, strokeWidth: Number(settings.flowIndexWidth) })
        .merge((d, c) => { d.flowindexavg = c; })
        .accessor(d => d.flowindexavg)
        .stroke(settings.flowIndexAvgColor);

        console.log(flowindex.accessor(),'flowindex');

    const calculatedData = applyHeatMap(applyBlockTrades(applyDivergence(flowindexavg(flowindex(chartData.current)))))
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

    let savedScale = localStorage.getItem('scale_' + chartUid),
        savedYScale = localStorage.getItem('yScale_' + chartUid),
        xExtents
    if (savedScale !== null) {
        let parsedSavedScale = JSON.parse(savedScale),
            endScale = chartData.current.length + parsedSavedScale.end,
            startScale = endScale - parsedSavedScale.length

        xExtents = [startScale, endScale]
    } else {
        xExtents =  [start, end]
    }

    const yExtents = (d) => {
        if (savedYScale !== null) {
            let parsedSavedYScale = JSON.parse(savedYScale)
            return [
                Math.max(d.high, parsedSavedYScale[1]),
                Math.min(d.low, parsedSavedYScale[0])
            ]
        } else {
            return [d.high, d.low]
        }
    }

    if (!replayMarketRef.current) {
        xExtentsStartLimitRef.current = xExtents[0]
        xExtentsEndLimitRef.current = xExtents[1]
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
        }, chartUid, false, true, true)
	}

    const onDrawCompleteRetracement = (retracementsChart) => {
        editSettings({
            fibonacciRetracements: false,
            retracements: retracementsChart
        })

        SetChartSettings({
            retracements: retracementsChart
        }, chartUid, false, true, true)
	}

    const editSettings = (changesObject) => {
        const chartSetting = charts.filter(chartSet => {
            return chartSet.chartUid === chartUid
        })

        if (typeof chartSetting[0] == typeof undefined) return
        chartSetting[0].chartSettings = {
            ...chartSetting[0].chartSettings,
            ...changesObject
        }

        updateProperty({currentChartSettings: chartSetting[0].chartSettings, updateTheCharts: !updateTheCharts })
    }

    const getSettings = (field) => {
        const chartSetting = charts.filter(chartSet => {
            return chartSet.chartUid === chartUid
        })

        return chartSetting[0].chartSettings[field];
    }

    const getBlocksBis = props => {
        dataBlocksPolyRef.current.off('value')
        dataBlocksFuturesRef.current.off('value')

        if (settings.securityType == 'stocks') {
            dataBlocksPolyRef.current.limitToLast(Number(settings.blocktradesDates))
                .on('value', postGetBlocksBis)
        } else {
            dataBlocksFuturesRef.current.limitToLast(Number(settings.blocktradesDates))
                .on('value', postGetBlocksBis)
        }
	}

    const postGetBlocksBis = (val) => {
        let chartBlocksDataRequest = []
        val.forEach(function(daysBlockTrades) {
            daysBlockTrades.forEach(function(dayBlockTrades) {
                const blockData = dayBlockTrades.val()
                const currentBlockDate = +blockData.t
                const utcTimeTick = moment(currentBlockDate).tz('America/New_York').format('MM-DD HH:mm')

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
        })

        chartBlocksValuesRef.current = chartBlocksDataRequest
        forceUpdate()
    }

    const getDivergence = props => {
		divergenceFirebaseRef.current.on('value', postGetDivergence)
	}

    const postGetDivergence = async(val) => {
        let chartDivergencesDataRequest = []
        val.forEach(function(childSnapshot) {
            if (['priceDown', 'priceUp'].find(element => element == childSnapshot.key)) {
                let divergenceColor = childSnapshot.key == 'priceDown' ? '#0ccf02' : '#d0021b'
                childSnapshot.forEach(function(childSnapshotChild) {
                    let divergenceFrequency = +childSnapshotChild.key
                    childSnapshotChild.forEach(function(childSnapshotTimeStamp) {
                        const childSnapShotValue = childSnapshotTimeStamp.val()
                        if (childSnapShotValue.s == chartKey) {
                            let divergenceAlreadyAdded = chartDivergencesDataRequest.some(divergenceData => {
                                return divergenceData.endTimeStamp == childSnapShotValue.t && divergenceData.fill == divergenceColor
                            })

                            if (!divergenceAlreadyAdded) {
                                chartDivergencesDataRequest.push({
                                    id: childSnapshotTimeStamp.key,
                                    startTimeStamp: String(+childSnapShotValue.t - (60000 * divergenceFrequency)),
                                    endTimeStamp: +childSnapShotValue.t,
                                    fill: divergenceColor,
                                    canvasGradient: createVerticalLinearGradient([
                                        { stop: 0, color: hexToRGBA(divergenceColor, 0.025) },
                                        { stop: 0.5, color: hexToRGBA(divergenceColor, 0.15) },
                                        { stop: 1, color: hexToRGBA(divergenceColor, 0.5) }
                                    ]),
                                    trend: childSnapshot.key,
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
    }

    // const getOrderBook = () => {
    //     if (settings.periodicity == '15m') {
    //         if (settings.securityType == 'stocks') {
    //             data1mPolyBookRef.current.off('value')
    //             data15mPolyBookRef.current.on('value', postGetDataBook15m)
    //         } else {
    //             data1mFuturesBookRef.current.off('value')
    //             data15mFuturesBookRef.current.on('value', postGetDataBook15m)
    //         }
    //     } else {
    //         if (settings.securityType == 'stocks') {
    //             data15mPolyBookRef.current.off('value')
    //             data1mPolyBookRef.current.on('value', postGetDataBook1m)
    //         } else {
    //             console.log('getting order book bro')
    //             data15mFuturesBookRef.current.off('value')
    //             data1mFuturesBookRef.current.on('value', postGetDataBook1m)
    //         }
    //     }
    // }

    // const postGetDataBook1m = (val) => {
    //     console.log('GOT order book bro, processing now')
    //     let chartOrderbookDataRequest = {}
    //     val.forEach(function(dayTicks) {
    //         let snapOrderBook = {}
    //         dayTicks.forEach(function(orderbookTicks) {
    //             let theOrderbook = {}
    //             Object.keys(orderbookTicks.val()).forEach(function(orderbookPrice) { 
    //                 let newKey = orderbookPrice.replace('_', '.')

    //                 theOrderbook[newKey] = orderbookTicks.val()[orderbookPrice]
    //             });

    //             snapOrderBook[orderbookTicks.key] = theOrderbook
    //         })

    //         chartOrderbookValuesRef.current = {
    //             ...chartOrderbookValuesRef.current,
    //             ...snapOrderBook
    //         }
    //     })

    //     forceUpdate()
    // }
    // const postGetDataBook15m = (val) => {
    //     let chartOrderbookDataRequest = []
    //     console.log(val.val())
    // }


    const getDataBis = () => {
        setChartLoaded(false)
        chartData.current = []

        if (settings.periodicity == '15m') {
            if (settings.securityType == 'stocks') {
                data1mPolyRef.current.off('value')
                data15mPolyRef.current.on('value', postGetData15m)
            } else {
                data1mFuturesRef.current.off('value')
                data15mFuturesRef.current.on('value', postGetData15m)
            }
        } else {
            if (settings.securityType == 'stocks') {
                data15mPolyRef.current.off('value')
                data1mPolyRef.current.on('value', postGetData1m)
            } else {
                data15mFuturesRef.current.off('value')
                data1mFuturesRef.current.on('value', postGetData1m)
            }
        }

        if(settings.securityType == 'stocks') {
            trackLivePrice()
        } else {
            trackLiveFuturesPrice()
        }
    }

    const postGetData1m = (val) => {
        let chartDataRequest = []
        val.forEach(function(childSnapshot) {
            childSnapshot.forEach(function(dayTicks) {
                const currentTick = parseNanexDataBis(
                    dayTicks.key,
                    dayTicks.val(),
                    1,
                    settings.securityType == 'stocks'
                )

                if (currentTick !== false) {
                    chartDataRequest.push(currentTick)
                }
            })
        })

        if (chartDataRequest.length == 0) {
            setUnavailableChart(true)
            setChartLoaded(true)
        } else {
            chartData.current = chartDataRequest
            if(settings.securityType == 'stocks') {
                onceTrackLivePrice(1)
            } else {
                onceTrackFuturesLivePrice(1)
            }
            setChartLoaded(true)
        }
        forceUpdate()
        chartSettingsRef.current = settings
    }
    const postGetData15m = (val) => {
        let chartDataRequest = []
        val.forEach(function(childSnapshot) {
            childSnapshot.forEach(function(dayTicks) {
                const currentTick = parseNanexDataBis(
                    dayTicks.key,
                    dayTicks.val(),
                    15,
                    settings.securityType == 'stocks'
                )
    
                if (currentTick !== false) {
                    chartDataRequest.push(currentTick)
                }
            })
        })

        if (chartDataRequest.length == 0) {
            setUnavailableChart(true)
            setChartLoaded(true)
        } else {
            chartData.current = chartDataRequest
            if(settings.securityType == 'stocks') {
                onceTrackLivePrice(15)
            } else {
                onceTrackFuturesLivePrice(15)
            }
            setChartLoaded(true)
        }
        forceUpdate()
        chartSettingsRef.current = settings
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
        <ChartHolderContainer {...props} {...{
            //height: newChartLoadedRef.current ? (height - 45) : height,
            suffixState: suffixState,
            data: data,
            xScale: xScale,
            xAccessor: xAccessor,
            displayXAccessor: displayXAccessor,
            xExtents: xExtents,
            yExtents: yExtents,

            rgbaColor: rgbaColor,

            onDrawCompleteChart: onDrawCompleteChart,
            onDrawCompleteRetracement: onDrawCompleteRetracement,
            handleSelection: handleSelection,
            handleReset: handleReset,
            handleFirst: handleFirst,

            flowindex: flowindex,
            flowindexavg: flowindexavg,

            chartBlocksValuesRef: chartBlocksValuesRef,
            chartCanvasRef: chartCanvasRef,
            showGridRef: showGridRef
        }} />
    )
})

let ChartHolderContainer = forwardRef((props, ref) => {
    const {
        type: type, 
        width: width, 
        height: height, 
        symbol: symbol,
        ratio: ratio,
        settings: settings,
        chartKey: chartKey,
        chartUid : chartUid,
        chartEvent: chartEvent,

        suffixState,
        data,
        xScale,
        xAccessor,
        displayXAccessor,
        xExtents,
        yExtents,

        rgbaColor,

        onDrawCompleteChart,
        onDrawCompleteRetracement,
        handleSelection,
        handleReset,
        handleFirst,

        flowindex,
        flowindexavg,

        chartBlocksValuesRef,
        chartCanvasRef,
        showGridRef,

        charts,
        chartState,
        darkMode,
        whiteColor,
        primaryDarkColor,
        primaryLightColor,
        primaryLightBackground,
        xEventsState,
        screenShotSrc,
        showScreenShotModal,
        updateTheCharts,
        selectedChart,
        selectedChartEvent,
        updateProperty,
        SetChartSettings
    } = props

    var margin = { left: 0, right: 50, top: 20, bottom: 30 };
    var gridHeight = height - margin.top - margin.bottom
    var gridWidth = width - margin.left - margin.right

    var yGrid = showGridRef.current ? { 
        innerTickSize: -1 * gridWidth,
        tickStrokeDasharray: 'Solid',
        tickStrokeOpacity: 0.1,
        tickStrokeWidth: 1
    } : {}
    var xGrid = showGridRef.current ? { 
        innerTickSize: -1 * gridHeight,
        tickStrokeDasharray: 'Solid',
        tickStrokeOpacity: 0.1,
        tickStrokeWidth: 1
    } : {}

    return (
        <ChartCanvas height={height}
                ref={chartCanvasRef}
                ratio={ratio}
                width={width}
                chartUid={chartUid}
                margin={margin}
                padding={15}
                type={type}
                seriesName={'MSFT_' + suffixState}
                data={data}
                xScale={xScale}
                xAccessor={xAccessor}
                displayXAccessor={displayXAccessor}
                xExtents={xExtents}>

            <Chart id={chartUid} 
                yExtents={yExtents}
                padding={{ top: 10, bottom: 10 }}>

                <XAxis 
                    axisAt='bottom' 
                    orient='bottom'
                    stroke={'white'}
                    strokeWidth={0.15}
                    opacity={0.1}
                    tickStroke={darkMode ? whiteColor : primaryLightBackground}
                    ticks={10}
                    customLevels={[11, 12]}
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

                <HeatMapSeries />

                <MouseCoordinateX
                    at="bottom"
                    orient="bottom"
                    fontSize={10}
                    rectWidth={25}
                    rectHeight={15}
                    rectRadius={7}
                    displayFormat={timeFormat("%b %d, %H:%M")} 
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

                {settings.chartType == 'ohlc' && 
                    <OHLCSeries 
                        stroke={settings.priceBarsColor} />}
                {settings.chartType == 'candles' && 
                    <CandlestickSeries {...{
                        wickStroke: settings.priceBarsColor,
                        fill: function fill(d) {
                            return rgbaColor ? (
                                d.close > d.open ? "rgba(" + rgbaColor.r + ", " + rgbaColor.g + ", " + rgbaColor.b + ", 0.8)" : 
                                    "rgba(" + rgbaColor.r + ", " + rgbaColor.g + ", " + rgbaColor.b + ", 0.1)"
                            ) : (
                                d.close > d.open ? "rgba(196, 205, 211, 0.8)" : "rgba(22, 22, 22, 0.8)"
                            )
                        },
                        stroke: settings.priceBarsColor,
                        candleStrokeWidth: 1,
                        widthRatio: 0.8,
                        opacity: 1,
                    }}/>}

                <EdgeIndicator 
                    itemType="last" 
                    orient="right" 
                    edgeAt="right"
                    lineStroke="#ffffff"
                    lineOpacity={0.5}
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
                    ref={saveInteractiveNodes('Trendline', chartUid)}
                    enabled={settings.trendLine}
                    type={settings.trendLineType}
                    snap={false}
                    snapTo={d => [d.high, d.low]}
                    onComplete={onDrawCompleteChart}
                    trends={settings.trends}
                    appearance={{
                        ...{
                            stroke: settings.trendLineColor || primaryDarkColor
                        },
                        ...{
                            strokeOpacity: 1,
                            strokeWidth: 1,
                            strokeDasharray: 'Solid',
                            edgeStrokeWidth: 1,
                            edgeFill: '#FFFFFF',
                            edgeStroke: '#000000',
                            r: 6
                        }
                    }}
                />

                <FibonacciRetracement
                    ref={saveInteractiveNodes('FibonacciRetracement', chartUid)}
                    enabled={settings.fibonacciRetracements}
                    type={'EXTEND'}
                    retracements={settings.retracements}
                    onComplete={onDrawCompleteRetracement}
                    appearance={{
                        ...{
                            stroke: settings.fibonacciTrendLineColor || primaryDarkColor
                        },
                        ...{
                            strokeWidth: 1,
                            strokeOpacity: 1,
                            fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
                            fontSize: 11,
                            fontFill: darkMode ? '#FFFFFF' : '#000000',
                            edgeStroke: '#000000',
                            edgeFill: '#FFFFFF',
                            nsEdgeFill: settings.fibonacciTrendLineColor || primaryDarkColor,
                            edgeStrokeWidth: 1,
                            r: 5
                        }
                    }}
                />

                { settings.blocksLine &&
                    <Annotate 
                        with={LabelAnnotation}
                        when={d => d.blockTrade}
                        usingProps={{
                            fontFamily: "coreui-icons-solid",
                            fontSize: 8,
                            fill: "white",
                            opacity: 1,
                            className: "blocktrades-marker",
                            text: "\ueb69",
                            y: ({ yScale, datum }) => yScale(datum.blockTradeValue),
                            tooltip: d => timeFormat("%b %d, %H:%M")(d.date),
                        }} />}

                { settings.showDivergence &&
                    <>
                        <AreaSeries
                            key={`${chartUid}priceDown`}
                            yAccessor={d => {
                                if (d.divergenceDetected && d.divergenceTrend == 'priceDown') return d.close
                            }}
                            strokeWidth={0}
                            strokeOpacity={0}
                            upperArea={true}
                            canvasGradient={createVerticalLinearGradient([
                                { stop: 0, color: hexToRGBA('#0ccf02', 0.85) },
                                { stop: 0.5, color: hexToRGBA('#0ccf02', 0.35) },
                                { stop: 1, color: hexToRGBA('#0ccf02', 0) }
                            ])}
                        />
                        <AreaSeries
                            key={`${chartUid}priceUp`}
                            yAccessor={d => {
                                if (d.divergenceDetected && d.divergenceTrend == 'priceUp') return d.close
                            }}
                            strokeWidth={0}
                            strokeOpacity={0}
                            canvasGradient={createVerticalLinearGradient([
                                { stop: 0, color: hexToRGBA('#d0021b', 0) },
                                { stop: 0.5, color: hexToRGBA('#d0021b', 0.35) },
                                { stop: 1, color: hexToRGBA('#d0021b', 0.85) }
                            ])}
                        />
                    </>
                }

                <ZoomButtons
                    onReset={() => {
                        handleReset(data.length)
                    }}
                    onFirst={() => {
                        handleFirst(data.length)
                    }}
                    dataLength={data.length}
                />
            </Chart>
            <Chart id={`${chartUid}2`}
                yExtents={flowindex.accessor()}
                padding={{ top: 10, bottom: 20 }}
            >
                <LineSeries yAccessor={flowindex.accessor()} stroke={flowindex.stroke()}  strokeWidth={flowindex.options().strokeWidth} />
                <CurrentCoordinate yAccessor={flowindex.accessor()} fill={flowindex.stroke()} />
            </Chart>
            
            {settings.showAverage &&<Chart id={`${chartUid}3`}
                yExtents={flowindexavg.accessor()}
                padding={{ top: 10, bottom: 20 }}
            >
                <LineSeries  yAccessor={flowindexavg.accessor()} stroke={flowindexavg.stroke()} strokeWidth={flowindexavg.options().strokeWidth} />
                <CurrentCoordinate yAccessor={flowindexavg.accessor()} fill={flowindexavg.stroke()} />
            </Chart>}

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
ChartHolderContainer = fitWidth(ChartHolderContainer)

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
    updateTheCharts: state.charts.updateTheCharts,
    selectedChart: state.charts.selectedChart,
    selectedChartEvent: state.charts.selectedChartEvent,
    fullScreenMode: state.charts.fullScreenMode
  }
}
const mapDispatchToProps = (dispatch) => {
  return {
    updateProperty: (property) => dispatch(updateProperty(property)),
    SetChartSettings: (
          newChartSettings, chartUid, resetChartData, synchronizeChart, synchronizeChartOnly
        ) => dispatch(SetChartSettings(newChartSettings, chartUid, resetChartData, synchronizeChart, synchronizeChartOnly))
  }
}

export default compose(
    connect(
        mapStateToProps,
        mapDispatchToProps
    )
)(ChartHolder)