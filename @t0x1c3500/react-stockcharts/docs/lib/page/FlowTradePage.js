

import React from "react";
import { TypeChooser, SaveChartAsImage } from "react-stockcharts/lib/helper";

import ContentSection from "lib/content-section";
import Row from "lib/row";
import Section from "lib/section";

import FlowTradeAlgo from "lib/charts/FlowTradeAlgo";

class FlowTradePage extends React.Component {
	constructor(props) {
		super(props);
		this.saveNode = this.saveNode.bind(this);
		this.saveChartAsImage = this.saveChartAsImage.bind(this);
	}
	saveNode(node) {
		this.chart = node;
	}
	saveChartAsImage() {
		const container = ReactDOM.findDOMNode(this.chart); // eslint-disable-line react/no-find-dom-node
		SaveChartAsImage.save(document, container, '#24252f', "AAPL - 1m", function(src) {
			const a = document.createElement("a");
			a.setAttribute("href", src);
			a.setAttribute("download", "Chart.png");

			document.body.appendChild(a);
			a.addEventListener("click", function(/* e */) {
				a.parentNode.removeChild(a);
			});

			a.click();
		});
	}
	render() {
		return (
			<ContentSection title={FlowTradePage.title}>
				<Row>
					<Section colSpan={2} className="dark">
						<button type="button" className="btn btn-success btn-lg pull-right" onClick={this.saveChartAsImage} >
							<span className="glyphicon glyphicon-floppy-save" aria-hidden="true"></span>
						</button>
						<TypeChooser ref="container">
							{(type) => (<FlowTradeAlgo blocksData={this.props.blocksData} data={this.props.flowTradeData} type={type} ref={this.saveNode} />)}
						</TypeChooser>
					</Section>
				</Row>
				<Row>
					<Section colSpan={2}>
						<aside dangerouslySetInnerHTML={{ __html: require("md/VOLUME-PROFILE-BY-SESSION") }}></aside>
					</Section>
				</Row>
			</ContentSection>
		);
	}
}

FlowTradePage.title = "FlowTrade";

export default FlowTradePage;