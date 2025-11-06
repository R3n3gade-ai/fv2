import React, { Component } from "react";
import PropTypes from "prop-types";

import GenericChartComponent from "../GenericChartComponent";
import { getAxisCanvas } from "../GenericComponent";
import { hexToRGBA, strokeDashTypes, getStrokeDasharray, createVerticalLinearGradient, changeTimezone } from "../utils";

class Zone extends Component {
	constructor(props) {
		super(props);

		this.renderSVG = this.renderSVG.bind(this);
		this.drawOnCanvas = this.drawOnCanvas.bind(this);
	}

	getZonesBoundaries(zones, plotData) {
		const boundaries = {};
		zones.forEach(zone => {
			const start = plotData.filter((element, i) => {
				const startTime = changeTimezone(new Date(+zone.startTimeStamp), "UTC");
				const endTime = changeTimezone(new Date(+zone.endTimeStamp), "UTC");
				return element.date >= startTime && element.date < endTime && plotData[i + 1] && (!plotData[i - 1] || plotData[i - 1].date < startTime);
			});
			const end = plotData.filter((element, i) => {
				const startTime = changeTimezone(new Date(+zone.startTimeStamp), "UTC");
				const endTime = changeTimezone(new Date(+zone.endTimeStamp), "UTC");
				return element.date <= endTime && element.date > startTime && plotData[i - 1] && (!plotData[i + 1] || plotData[i + 1].date > endTime);
			});
			boundaries[zone.id] = start.map((v, i) => { return { start: v, end: end[i] };});
		});
		return boundaries;
	}

	drawOnCanvas(ctx, moreProps) {
		const { xScale, xAccessor, plotData, height, chartConfig: { yScale } } = moreProps;
		const { zones } = this.props;
		const config = zones.reduce((obj, item) => (obj[item.id] = item, obj), {}); // Convert zones array to object id => zone
		const boundaries = this.getZonesBoundaries(zones, plotData);
		for (const [id, borders] of Object.entries(boundaries)) {
			borders.forEach(border => {
				const x1 = Math.round(xScale(xAccessor(border.start)));
				const x2 = Math.round(xScale(xAccessor(border.end)));
				const width = x2 - x1;
				if ("gradientFill" in config[id]) {
					const canvasGradient = createVerticalLinearGradient(config[id].gradientFill);
					ctx.fillStyle = canvasGradient(moreProps, ctx);
				} else {
					ctx.fillStyle = hexToRGBA(config[id].fill, config[id].opacity);
				}
				ctx.fillRect(x1, 0, width, height);
				// if (config[id].startLine) this.drawCanvasLine(ctx, { x: x1, height }, config[id].startLine);
				// if (config[id].endLine) this.drawCanvasLine(ctx, { x: x2, height }, config[id].endLine);
			});
		}
	}
	drawCanvasLine(ctx, coordinates, d) {
		ctx.beginPath();
		ctx.strokeStyle = hexToRGBA(d.stroke, d.strokeOpacity);
		ctx.lineWidth = d.strokeWidth;
		ctx.setLineDash(getStrokeDasharray(d.strokeDasharray).split(","));
		ctx.moveTo(coordinates.x, 0);
		ctx.lineTo(coordinates.x, coordinates.height);
		ctx.stroke();
	}
	renderSVG(moreProps) {
		// TODO:
		const d = {
		  stroke: "#000000",
		  fill: "#ffcc00",
		  x: 0,
		  y: 0,
		  width: 100,
		  opacity: 0.5,
		  heigh: 2.5
		};

		return <rect className={d.className}
			stroke={d.stroke}
			fill={d.fill}
			x={d.x}
			y={d.y}
			width={d.width}
			fillOpacity={d.opacity}
			height={d.height} />;
	}
	render() {
		const { clip } = this.props;

		return (
			<GenericChartComponent
				clip={clip}
				svgDraw={this.renderSVG}

				canvasToDraw={getAxisCanvas}
				canvasDraw={this.drawOnCanvas}

				drawOn={["pan"]}
			/>
		);
	}
}

Zone.propTypes = {
	zones: PropTypes.arrayOf(
		PropTypes.shape({
			id: PropTypes.string.isRequired,
			startTimeStamp: PropTypes.string.isRequired,
			endTimeStamp: PropTypes.string.isRequired,
			start: PropTypes.shape({
				hours: PropTypes.number.isRequired,
				minutes: PropTypes.number.isRequired,
				seconds: PropTypes.number.isRequired
			}),
			end: PropTypes.shape({
				hours: PropTypes.number.isRequired,
				minutes: PropTypes.number.isRequired,
				seconds: PropTypes.number.isRequired
			}),
			fill: PropTypes.string.isRequired,
			opacity: PropTypes.number.isRequired,
			gradientFill: PropTypes.array,
			stroke: PropTypes.string,
			strokeWidth: PropTypes.number,
			strokeOpacity: PropTypes.number,
			strokeDasharray: PropTypes.oneOf(strokeDashTypes),
			startLine: PropTypes.shape({
				stroke: PropTypes.string.isRequired,
				strokeWidth: PropTypes.number.isRequired,
				strokeOpacity: PropTypes.number.isRequired,
				strokeDasharray: PropTypes.oneOf(strokeDashTypes),
			}),
			endLine: PropTypes.shape({
				stroke: PropTypes.string.isRequired,
				strokeWidth: PropTypes.number.isRequired,
				strokeOpacity: PropTypes.number.isRequired,
				strokeDasharray: PropTypes.oneOf(strokeDashTypes),
			})
		})
	)
};

export default Zone;