import React, { Component } from "react";
import PropTypes from "prop-types";

import GenericChartComponent from "../GenericChartComponent";
import { getAxisCanvas } from "../GenericComponent";

import {
	hexToRGBA, createVerticalLinearGradient, isDefined, functor, plotDataLengthBarWidth, head
} from "../utils";

import { range as d3Range } from "d3-array";

class HeatMapSeries extends Component {
	constructor(props) {
		super(props);
		// this.renderSVG = this.renderSVG.bind(this);
		this.drawOnCanvas = this.drawOnCanvas.bind(this);
	}
	drawOnCanvas(ctx, moreProps) {
		drawOnCanvas(ctx, this.props, moreProps);
	}

	render() {
		const { clip } = this.props;
		return <GenericChartComponent
			clip={clip}
			canvasDraw={this.drawOnCanvas}
			canvasToDraw={getAxisCanvas}
			drawOn={["pan"]}
		/>;
	}
}

HeatMapSeries.propTypes = {
	className: PropTypes.string,
	classNames: PropTypes.oneOfType([
		PropTypes.func,
		PropTypes.string
	]),
	width: PropTypes.oneOfType([
		PropTypes.number,
		PropTypes.func
	]),
	yAccessor: PropTypes.func,
};

HeatMapSeries.defaultProps = {
	className: "react-stockcharts-heatmap",
	yAccessor: d => ({ open: d.open, high: d.high, low: d.low, close: d.close }),
	classNames: d => d.close > d.open ? "up" : "down",
	width: plotDataLengthBarWidth,
};

function getHeatMapData(props, xAccessor, xScale, yScale, plotData, realYDomain, theHeight, scale) {
	const { classNames, yAccessor } = props;
	const className = functor(classNames);

	const yMin = parseFloat(yScale.invert(theHeight).toFixed(2));
	const yMax = parseFloat(yScale.invert(0).toFixed(2));
	const tickNumbers = ( yMax - yMin ) * 100;
	const tickHeight = theHeight / tickNumbers;

	const heatCells = [];

	for (let i = 0; i < plotData.length; i++) {
		const d = plotData[i];
		if (isDefined(d.heatCells)) {
			const x = Math.round(xScale(xAccessor(d)));
			d.heatCells.map(heatCell => {
				if (heatCell.hit > d.high || heatCell.hit < d.low) {
					heatCells.push({
						...heatCell,
						...{
							x: x,
							height: tickHeight,
							yPos: yScale(heatCell.hit)
						}
					});
				}
			});
		}
	}

	return heatCells;
}

function drawOnCanvas(ctx, props, moreProps) {
	const { opacity, candleStrokeWidth, yAccessor } = props;
	const { xScale, chartConfig: { yScale, realYDomain }, plotData, xAccessor, height } = moreProps;

	const heatMapBlocksData = getHeatMapData(props, xAccessor, xScale, yScale, plotData, realYDomain, height, getYScale(moreProps));

	const width = xScale(xAccessor(plotData[plotData.length - 1]))
		- xScale(xAccessor(plotData[0]));
	const barWidth = Math.max(1, Math.round(width / (plotData.length - 1) ));
	const barHeight = barWidth * ( height / width );

	heatMapBlocksData.map(singleStop => {
		ctx.fillStyle = singleStop.fill;
		ctx.fillRect(
			singleStop.x - barWidth / 2,
			singleStop.yPos,
			barWidth,
			singleStop.height
		);
	});
}

function getYScale(moreProps) {
	const { yScale: scale, flipYScale, height } = moreProps.chartConfig;
	if (scale.invert) {
		const trueRange = flipYScale ? [0, height] : [height, 0];
		const trueDomain = trueRange.map(scale.invert);
		return scale.copy()
			.domain(trueDomain)
			.range(trueRange);
	}
	return scale;
}
export default HeatMapSeries;