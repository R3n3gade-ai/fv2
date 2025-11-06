
import React from "react";
import PropTypes from "prop-types";

import { format } from "d3-format";
import { timeFormat } from "d3-time-format";
import { curveMonotoneX } from "d3-shape";

import moment from 'moment';
import tzmoment from 'moment-timezone';
import shortid from 'shortid';

import flowData from '../../data/flowData.json';
import orderBook from '../../data/orderbook2.json';

import { ChartCanvas, Chart, ZoomButtons } from "react-stockcharts";
import {
	OHLCSeries,
	LineSeries,
	AreaSeries,
	VolumeProfileSeries,
	HeatMapSeries
} from "react-stockcharts/lib/series";
import { XAxis, YAxis } from "react-stockcharts/lib/axes";
import {
	CrossHairCursor,
	EdgeIndicator,
	CurrentCoordinate,
	MouseCoordinateX,
	MouseCoordinateY,
} from "react-stockcharts/lib/coordinates";
import {
	InteractiveYCoordinate,
	Zones
} from "react-stockcharts/lib/interactive";
import HoverTextNearMouse from "react-stockcharts/lib/interactive/components/HoverTextNearMouse";

import { discontinuousTimeScaleProvider } from "react-stockcharts/lib/scale";
import {
	OHLCTooltip,
	MovingAverageTooltip,
} from "react-stockcharts/lib/tooltip";
import { flowTrade, flowTradeAvg } from "react-stockcharts/lib/indicator";
import { fitWidth } from "react-stockcharts/lib/helper";
import algo from "react-stockcharts/lib/algorithm";
import {
	Label,
	Annotate,
	LabelAnnotation,
} from "react-stockcharts/lib/annotation";
import { last, createVerticalLinearGradient, hexToRGBA, changeTimezone } from "react-stockcharts/lib/utils";

import chroma from "chroma-js";

const canvasGradient = createVerticalLinearGradient([
	{ stop: 0, color: hexToRGBA("#d0021b", 0) },
	{ stop: 0.5, color: hexToRGBA("#d0021b", 0.5) },
	{ stop: 1, color: hexToRGBA("#d0021b", 1) },
]);
const parseNanexData = (nanexDate, nanexData, nanexOffset) => {
	const utcTimeTick = moment.utc(+nanexDate - ( nanexOffset * 60000 )).format();
	const chartTimeTick = new Date(new Date(utcTimeTick).toUTCString().substr(0, 25));

	if (+nanexData.C > 0 && (
		parseInt(chartTimeTick.getHours()) >= 9 && parseInt(chartTimeTick.getHours()) < 16
	)) {
        if (chartTimeTick.getHours() == 9 && chartTimeTick.getMinutes() == 30) {
            return false;
        }

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

        const startOfDay = ( nanexOffset == 1 ) ?
            chartTimeTick.getHours() == 9 && chartTimeTick.getMinutes() == 31 :
            chartTimeTick.getHours() == 9 && chartTimeTick.getMinutes() == 45

		return {
			date: chartTimeTick,
            timestamp: +nanexDate,
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
	} else {
		return false;
	}
}

class FlowTradeAlgo extends React.Component {
	constructor(props) {
		super(props);
		this.handleReset = this.handleReset.bind(this);
		this.handleFirst = this.handleFirst.bind(this);
		this.setData = this.setData.bind(this);
		this.chartCanvasRef = React.createRef();
	}
	componentWillMount() {
		const newData = this.setData();

		this.setState({
			suffix: 1,
			chartData: newData
		});
	}
	componentDidMount() {
		console.log(this.chartCanvasRef.current)
	}
	handleReset() {
		this.setState({
			suffix: this.state.suffix + 1
		});
	}
	handleFirst() {
		this.setState({
			suffix: this.state.suffix + 1
		});
	}
	onXScaleChange(type, moreProps, state) {
        if (typeof moreProps !== typeof undefined) {
            if (typeof moreProps.xScale !== typeof undefined) {
				let showFirstCondition = moreProps.xScale.domain()[1] < this.state.chartData.length
				this.setState({
					showFirst: showFirstCondition
				});
            }
        }
    }
	setData() {
		let chartDataRequest = [];
		for (var key in orderBook) {
			if (orderBook.hasOwnProperty(key)) {
				const currentTick = parseNanexData(
					key + '000',
					orderBook[key],
					1
				)

				if (currentTick !== false) {
					chartDataRequest.push(currentTick)
				}
			}
		}

		return chartDataRequest;
	}
	render() {
		const { type, data: initialData, width, ratio, blocksData: blocksData } = this.props;

		const flowindex = flowTrade()
			.id(0)
			.options({ flowType: "normal" })
			.merge((d, c) => { d.flowindex = c; })
			.accessor(d => d.flowindex);

		const flowIndexAvg = flowTradeAvg()
			.options({ windowSize: 10 })
			.merge((d, c) => { d.flowIndexAvg = c; console.log(c,d,'bilal') })
			.accessor(d => d.flowIndexAvg);

		const defaultAnnotationProps = {
			fontFamily: "Glyphicons Halflings",
			fontSize: 20,
			opacity: 0.8,
			onClick: console.log.bind(console),
		};
		const testBlocks = blocksData.map(singleBlock => {
			return {
				...singleBlock,
				...{
					timeCondition: singleBlock.text,
					text: Number(singleBlock.yValue).toFixed(2),
					textBox: {
						Radius: 8,
						height: 15,
						left: 0,
						show: true,
						fontSize: 9,
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
						...singleBlock.edge,
						displayFormat: InteractiveYCoordinate.defaultProps.defaultPriceCoordinate.edge.displayFormat
					}
				}
			};
		});

		const applyDivergence = (chartData) => {
			let returnChartData = chartData
			if (flowData.length && chartData.length) {
				flowData.map(chartDivergence => {
					chartData.map((singleChartData, sIndex) => {
						if (
							singleChartData.timestamp >= +chartDivergence.startTimeStamp &&
							singleChartData.timestamp <= +chartDivergence.endTimeStamp
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
		};

		const floxMaxBidAsk = (chartData) => {
			let returnChartData = chartData;
			const colorScale = chroma.scale(['001545', '0074D9', '7ABAF2']).domain([0,0.01,1]);
			if (chartData.length) {
				chartData.map((singleChartData, sIndex) => {
					const vols = extractBidVolumes(singleChartData).sort((a, b) => a - b);
					let maxBidAsk;
					if (vols.length > 0) {
						maxBidAsk = vols[vols.length - 1];
					} else {
						maxBidAsk = 1;
					}

					let heatBidCells = [],
						heatAskCells = [],
						opacities = [];
					Object.keys(singleChartData.bids).sort().map((rate, kDepth) => {
						const ratePrice = Number.parseFloat(rate).toFixed(2);
						const depth = singleChartData.bids[rate].S;
						let opacity = ( depth / maxBidAsk );
						opacities.push({
							opacity: opacity,
							depth: depth
						});
						heatBidCells.push({
							type: 'bid',
							fill: hexToRGBA(colorScale(opacity).hex(), opacity),
							hit: ratePrice
						})
					});
					Object.keys(singleChartData.asks).sort().map((rate, kDepth) => {
						const ratePrice = Number.parseFloat(rate).toFixed(2);
						const depth = singleChartData.asks[rate].S;
						let opacity = ( depth / maxBidAsk );
						opacities.push({
							opacity: opacity,
							depth: depth
						});
						heatAskCells.push({
							type: 'ask',
							fill: hexToRGBA(colorScale(opacity).hex(), opacity),
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
				})
			}

			return returnChartData
		}

		const extractBidVolumes = (plotData) => {
			if ('bids' in plotData && 'asks' in plotData) {
				let buys = Object.keys(plotData.bids).map(key => +plotData.bids[key].S);
				let sells = Object.keys(plotData.asks).map(key => +plotData.asks[key].S);
				return buys.concat(sells);
			} else {
				return [];
			}
		}

		const longAnnotationProps = {
			...defaultAnnotationProps,
			fill: "#006517",
			text: "\ue093",
			y: ({ yScale, datum }) => yScale(datum.low) + 20,
			tooltip: "Go long",
		};

		const shortAnnotationProps = {
			...defaultAnnotationProps,
			fill: "#E20000",
			text: "\ue094",
			y: ({ yScale, datum }) => yScale(datum.high),
			tooltip: "Go short",
		};

		const margin = { left: 80, right: 80, top: 30, bottom: 50 };
		const height = 600;

		const [yAxisLabelX, yAxisLabelY] = [width - margin.left - 40, margin.top + (height - margin.top - margin.bottom) / 2];

		const gridHeight = height - margin.top - margin.bottom;
		const gridWidth = width - margin.left - margin.right;

		const showGrid = false;
		const yGrid = showGrid ? { innerTickSize: -1 * gridWidth, tickStrokeOpacity: 0.2 } : {};
		const xGrid = showGrid ? { innerTickSize: -1 * gridHeight, tickStrokeOpacity: 0.2 } : {};

		// const calculatedData = applyDivergence(flowIndexAvg(flowindex(initialData)));
		const calculatedData = floxMaxBidAsk(flowIndexAvg(flowindex(this.state.chartData)));

		const xScaleProvider = discontinuousTimeScaleProvider
			.inputDateAccessor(d => d.date);
		const {
			data,
			xScale,
			xAccessor,
			displayXAccessor,
		} = xScaleProvider(calculatedData);

		const start = xAccessor(last(data));
		const end = xAccessor(data[0]);
		const xExtents = [start, end];

		return (
			<ChartCanvas height={height}
				ref={this.chartCanvasRef}
				width={width}
				ratio={ratio}
				margin={margin}
				chartUid={'84898984984'}
				padding={15}
				type={type}
				seriesName={`MSFT_${this.state.suffix}`}
				data={data}
				xScale={xScale}
				xAccessor={xAccessor}
				displayXAccessor={displayXAccessor}
				xExtents={xExtents}
			>
				<Chart id={1}
					yExtents={[d => [d.high, d.low]]}
					padding={{ top: 10, bottom: 0 }}
				>
					<XAxis {...xGrid} axisAt="bottom" orient="bottom" customLevels={[11, 12]} tickStroke="#FFFFFF" stroke="#FFFFFF" />
					<YAxis {...yGrid} axisAt="right" orient="right" ticks={10} tickStroke="#FFFFFF" />

					<HeatMapSeries />
					<MouseCoordinateX
						at="bottom"
						orient="bottom"
						fontSize={10}
						rectWidth={25}
						rectHeight={15}
						rectRadius={7}
						displayFormat={timeFormat("%H:%M")} />

					<MouseCoordinateY
						at="right"
						orient="right"
						displayFormat={format(".2f")}
						arrowWidth={0}
						fontSize={10}
						rectWidth={25}
						rectRadius={7}
						rectHeight={15} />

					<OHLCSeries stroke={"#bc4c00"} />

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

					<OHLCTooltip origin={[-40, 0]}/>

					<AreaSeries
						key={`priceDown`}
						yAccessor={d => {
							if (d.divergenceDetected && d.divergenceTrend == 'priceDown') return d.close
						}}
						strokeWidth={0}
						strokeOpacity={0}
						upperArea={true}
						canvasGradient={createVerticalLinearGradient([
							{ stop: 0, color: hexToRGBA('#0ccf02', 1) },
							{ stop: 0.5, color: hexToRGBA('#0ccf02', 0.75) },
							{ stop: 1, color: hexToRGBA('#0ccf02', 0) }
						])}
					/>
					<AreaSeries
						key={`priceUp`}
						yAccessor={d => {
							if (d.divergenceDetected && d.divergenceTrend == 'priceUp') return d.close
						}}
						strokeWidth={0}
						strokeOpacity={0}
						canvasGradient={createVerticalLinearGradient([
							{ stop: 0, color: hexToRGBA('#d0021b', 0) },
							{ stop: 0.5, color: hexToRGBA('#d0021b', 0.75) },
							{ stop: 1, color: hexToRGBA('#d0021b', 1) }
						])}
					/>

					<ZoomButtons
						onReset={this.handleReset}
						onFirst={this.handleFirst}
						showFirst={this.state.showFirst}
					/>
				</Chart>
				<Chart id={2}
					yExtents={flowindex.accessor()}
					padding={{ top: 10, bottom: 20 }}
				>
					<LineSeries yAccessor={flowindex.accessor()} stroke={flowindex.stroke()}/>
					<LineSeries yAccessor={flowIndexAvg.accessor()} stroke={flowIndexAvg.stroke()}/>

					<CurrentCoordinate yAccessor={flowindex.accessor()} fill={flowindex.stroke()} />
				</Chart>
				<CrossHairCursor stroke="#FFFFFF" />
			</ChartCanvas>
		);
	}
}

FlowTradeAlgo.propTypes = {
	data: PropTypes.array.isRequired,
	width: PropTypes.number.isRequired,
	ratio: PropTypes.number.isRequired,
	type: PropTypes.oneOf(["svg", "hybrid"]).isRequired,
	blocksData: PropTypes.array
};

FlowTradeAlgo.defaultProps = {
	type: "svg",
};

FlowTradeAlgo = fitWidth(FlowTradeAlgo);

export default FlowTradeAlgo;
