import { isNotDefined, isDefined } from "@t0x1c3500/react-stockcharts/lib/utils";

let interactiveNodes = {};

export function saveInteractiveNode(chartId) {
	return node => {
		this[`node_${chartId}`] = node;
	};
}

export function handleSelection(type, chartId) {
	return selectionArray => {
		const key = `${type}_${chartId}`;
		const interactive = this.state[key].map((each, idx) => {
			return {
				...each,
				selected: selectionArray[idx]
			};
		});
		this.setState({
			[key]: interactive
		});
	};
}

export function saveInteractiveNodes(type, chartId) {
	return node => {
		const key = `${type}_${chartId}`;
		if (isDefined(node) || isDefined(interactiveNodes[key])) {
			// console.error(node, key)
			// console.log(interactiveNodes)
			// eslint-disable-next-line fp/no-mutation
			interactiveNodes = {
				...interactiveNodes,
				[key]: { type, chartId, node },
			};
		}
	};
}

export function deleteInteractiveNodes(chartId) {
	const nodeTypes = ['FibonacciRetracement', 'Trendline']
	nodeTypes.map(nodeType => {
		if (interactiveNodes.hasOwnProperty(`${nodeType}_${chartId}`)) {
			delete interactiveNodes[`${nodeType}_${chartId}`];
		}
	})
}

export function getInteractiveNodes() {
	return interactiveNodes;
}