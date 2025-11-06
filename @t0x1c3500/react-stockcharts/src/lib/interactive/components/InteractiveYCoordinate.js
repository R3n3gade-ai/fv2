import React, { Component } from "react";
import PropTypes from "prop-types";

import GenericChartComponent from "../../GenericChartComponent";
import { getMouseCanvas } from "../../GenericComponent";
import { isDefined, noop, hexToRGBA, getStrokeDasharrayCanvas } from "../../utils";
import { drawOnCanvas } from "../../coordinates/EdgeCoordinateV3";
import { getYCoordinate } from "../../coordinates/MouseCoordinateY";

class InteractiveYCoordinate extends Component {
	constructor(props) {
		super(props);

		this.renderSVG = this.renderSVG.bind(this);
		this.drawOnCanvas = this.drawOnCanvas.bind(this);
		this.isHover = this.isHover.bind(this);
	}
	isHover(moreProps) {
		const { onHover } = this.props;

		if (isDefined(onHover)) {
			const values = helper(this.props, moreProps);
			if (values == null) return false;

			const { x1, x2, y, rect } = values;
			const { mouseXY: [mouseX, mouseY] } = moreProps;

			if (
				mouseX >= rect.x
				&& mouseX <= rect.x + this.width
				&& mouseY >= rect.y
				&& mouseY <= rect.y + rect.height
			) {
				return true;
			}
			if (
				x1 <= mouseX
				&& x2 >= mouseX
				&& Math.abs(mouseY - y) < 4
			) {
				return true;
			}
		}
		return false;
	}
	drawOnCanvas(ctx, moreProps) {
		const {
			bgFill,
			bgOpacity,

			textFill,
			fontFamily,
			fontSize,

			fontStyle,
			fontWeight,
			stroke,
			strokeWidth,
			strokeOpacity,
			strokeDasharray,
			text,
			textBox,
			edge,
		} = this.props;

		const { selected, hovering } = this.props;

		const values = helper(this.props, moreProps);
		if (values == null) return;

		const { x1, x2, y, rect } = values;

		ctx.strokeStyle = hexToRGBA(stroke, strokeOpacity);

		ctx.beginPath();
		if (selected || hovering) {
			ctx.lineWidth = strokeWidth + .25;
		} else {
			ctx.lineWidth = strokeWidth;
		}
		ctx.textBaseline = "middle";
		ctx.textAlign = "start";
		ctx.font = `${fontStyle} ${fontWeight} ${textBox.fontSize}px ${fontFamily}`;

		this.width = textBox.padding.left
			+ ctx.measureText(text).width
			+ textBox.padding.right
			+ ( textBox.closeIcon.show ? textBox.closeIcon.padding.left : 0 )
			+ ( textBox.closeIcon.show ? textBox.closeIcon.width : 0 )
			+ ( textBox.closeIcon.show ? textBox.closeIcon.padding.right : 0 );

		ctx.setLineDash(getStrokeDasharrayCanvas(strokeDasharray));
		ctx.moveTo(x1, y);
		ctx.lineTo(rect.x, y);

		ctx.moveTo(rect.x, y);
		ctx.lineTo(x2, y);
		ctx.stroke();

		ctx.setLineDash([]);


		ctx.fillStyle = hexToRGBA(bgFill, bgOpacity);

		if (textBox.show) {
			if (textBox.Radius) {
				roundRect(ctx, rect.x, rect.y, this.width, rect.height, textBox.Radius);
				ctx.fill();
			} else {
				ctx.fillRect(rect.x, rect.y, this.width, rect.height);
				ctx.strokeRect(rect.x, rect.y, this.width, rect.height);
			}
		}

		ctx.fillStyle = textFill;

		ctx.beginPath();
		if (textBox.show) {
			ctx.fillText(text, rect.x + textBox.padding.right, y);
		}
		const newEdge = {
			...edge,
			textFill,
			fontFamily,
			fontSize,
			opacity: bgOpacity
		};

		if (edge.show) {
			const yValue = edge.displayFormat(this.props.yValue);
			const yCoord = getYCoordinate(y, yValue, newEdge, moreProps);
			drawOnCanvas(ctx, yCoord);
		}
	}
	renderSVG() {
		throw new Error("svg not implemented");
	}
	render() {
		const { interactiveCursorClass } = this.props;
		const { onHover, onUnHover } = this.props;
		const { onDragStart, onDrag, onDragComplete } = this.props;

		return (
			<GenericChartComponent
				clip={false}
				xxxyyy
				isHover={this.isHover}

				svgDraw={this.renderSVG}
				canvasToDraw={getMouseCanvas}
				canvasDraw={this.drawOnCanvas}

				interactiveCursorClass={interactiveCursorClass}
				/* selected={selected} */
				enableDragOnHover

				onDragStart={onDragStart}
				onDrag={onDrag}
				onDragComplete={onDragComplete}
				onHover={onHover}
				onUnHover={onUnHover}

				drawOn={["mousemove", "mouseleave", "pan", "drag"]}
			/>
		);
	}
}

function helper(props, moreProps) {
	const { yValue, textBox } = props;

	const { chartConfig: { width, yScale, height } } = moreProps;

	const y = Math.round(yScale(yValue));

	if (y >= 0 && y <= height) {
		const rect = {
			x: textBox.left,
			y: y - textBox.height / 2,
			height: textBox.height,
		};
		return {
			x1: 0,
			x2: width,
			y,
			rect,
		};
	}

}

function roundRect(ctx, x, y, width, height, radius) {
	ctx.beginPath();
	ctx.moveTo(x + radius, y);
	ctx.lineTo(x + width - radius, y);
	ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
	ctx.lineTo(x + width, y + height - radius);
	ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
	ctx.lineTo(x + radius, y + height);
	ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
	ctx.lineTo(x, y + radius);
	ctx.quadraticCurveTo(x, y, x + radius, y);
	ctx.closePath();
}

InteractiveYCoordinate.propTypes = {
	bgFill: PropTypes.string.isRequired,
	bgOpacity: PropTypes.number.isRequired,

	stroke: PropTypes.string.isRequired,
	strokeWidth: PropTypes.number.isRequired,
	strokeOpacity: PropTypes.number.isRequired,
	strokeDasharray: PropTypes.string.isRequired,

	textFill: PropTypes.string.isRequired,
	fontFamily: PropTypes.string.isRequired,
	fontSize: PropTypes.number.isRequired,
	fontWeight: PropTypes.oneOfType([
		PropTypes.number,
		PropTypes.string,
	]).isRequired,
	fontStyle: PropTypes.string.isRequired,

	text: PropTypes.string.isRequired,
	edge: PropTypes.object.isRequired,
	textBox: PropTypes.object.isRequired,
	yValue: PropTypes.number.isRequired,

	onDragStart: PropTypes.func.isRequired,
	onDrag: PropTypes.func.isRequired,
	onDragComplete: PropTypes.func.isRequired,
	onHover: PropTypes.func,
	onUnHover: PropTypes.func,

	defaultClassName: PropTypes.string,
	interactiveCursorClass: PropTypes.string,

	tolerance: PropTypes.number.isRequired,
	selected: PropTypes.bool.isRequired,
	hovering: PropTypes.bool.isRequired,
};

InteractiveYCoordinate.defaultProps = {
	onDragStart: noop,
	onDrag: noop,
	onDragComplete: noop,

	fontWeight: "normal", // standard dev

	strokeWidth: 1,
	tolerance: 4,
	selected: false,
	hovering: false,
};

export default InteractiveYCoordinate;