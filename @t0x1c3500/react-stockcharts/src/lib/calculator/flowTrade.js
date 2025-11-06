

/*
https://github.com/ScottLogic/d3fc/blob/master/src/indicator/algorithm/calculator/exponentialMovingAverage.js

The MIT License (MIT)

Copyright (c) 2014-2015 Scott Logic Ltd.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

import { FT as defaultOptions } from "./defaultOptionsForComputation";

export default function() {

	let options = defaultOptions;

	function calculator(data) {
		const { flowType } = options;
		const zeroAlgoLine = (upTick, downTick) => {
			if (flowType === "normal") {
				if (parseInt(upTick) > 10000000 || parseInt(downTick) > 10000000) {
					return false;
				} else {
					return true;
				}
			} else if (flowType === "dark-pool") {
				if (parseInt(upTick) !== 0 || parseInt(downTick) !== 0) {
					return true;
				} else {
					return false;
				}
			} else {
				return true;
			}
		};
		// eslint-disable-next-line prefer-const
		let algo_line = [];

		return data.map(function(d, i) {
			let algoLine;
			if (flowType === "normal") {
				algoLine = zeroAlgoLine(d.upTick, d.downTick) ? d.upTick - d.downTick +
				( i - 1 in algo_line ? algo_line[ i - 1 ] : 0 ) : 0;
			} else if (flowType === "dark-pool") {
				algoLine = zeroAlgoLine(d.darkUpTick, d.darkDownTick) ? d.darkUpTick - d.darkDownTick +
				 ( i - 1 in algo_line ? algo_line[ i - 1 ] : 0 ) : 0;
			} else if (flowType === "both") {
				algoLine = d.upTick + d.darkUpTick - (d.darkDownTick + d.downTick) +
				( i - 1 in algo_line ? algo_line[ i - 1 ] : 0 );
			}

			algo_line[i] = algoLine;

			return (3 * algo_line[i] + 2 * ( algo_line[i - 1] || 0 ) + ( algo_line[i - 2] || 0 ) ) / 6;
		});
	}
	calculator.undefinedLength = function() {
		const { windowSize } = options;
		return windowSize - 1;
	};
	calculator.options = function(x) {
		if (!arguments.length) {
			return options;
		}
		options = { ...defaultOptions, ...x };
		return calculator;
	};

	return calculator;
}
