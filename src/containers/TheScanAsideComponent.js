import React, { useEffect, useState, useRef, useReducer } from 'react'
import PerfectScrollbar from 'perfect-scrollbar'
import {
    CDataTable
} from '@coreui/react'

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

let theScanPs = null
const TheScanAsideComponent = props => {
    const {
        parentType,
        type,
        dataType,
        dataCategory,
        fields,
        data,
        slots,
        onlyWatchList,
        myWatchList,
        symbolFilters
    } = props;

    let theWrapperRef = useRef(null),
        parsedScansData = useRef([])

    const [_, forceUpdate] = useReducer((x) => x + 1, 0);

    useEffect(() => {
        theWrapperRef.current && (theScanPs = new PerfectScrollbar(`.option-table_wrapper-${type}`))

        parseScansData(data)
        if (parentType == 'trends') subscribeToTrends()
    }, [data, onlyWatchList, myWatchList, symbolFilters])

    const parseScansData = (scanData) => {
        if (typeof scanData !== typeof undefined) {
            if (parentType == 'trends') {
                let gotScansData = []
                Object.keys(scanData).map((k,v) => {
                    scanData[k].map(trendScanItem => {
                        if (['0', '1'].includes(trendScanItem.b)) {
                            if (trendScanItem.ty == dataType) {
                                if (dataCategory == 'trends') {
                                    if (!onlyWatchList || (
                                        onlyWatchList && trendScanItem.t in myWatchList
                                    )) {
                                        if (symbolFilters.length == 0 || (
                                            symbolFilters.length > 0 && symbolFilters.map(a => a.value).includes(trendScanItem.t)
                                        )) {
                                            gotScansData.push({
                                                symbol: trendScanItem.t,
                                                date: trendScanItem.d,
                                                epoch: (new Date(trendScanItem.d)).getTime(),
                                                price: '0',
                                                _classes: trendScanItem.b == 0 ? 'bearish-scan_row' : 'bullish-scan_row'
                                            })
                                        }
                                    }
                                } else {
                                    if (!onlyWatchList || (
                                        onlyWatchList && trendScanItem.t in myWatchList
                                    )) {
                                        if (symbolFilters.length == 0 || (
                                            symbolFilters.length > 0 && symbolFilters.map(a => a.value).includes(trendScanItem.t)
                                        )) {
                                            gotScansData.push({
                                                symbol: trendScanItem.t,
                                                price: '0',
                                                _classes: trendScanItem.b == 0 ? 'bearish-scan_row' : 'bullish-scan_row'
                                            })
                                        }
                                    }
                                }
                            }
                        }
                    })
                })

                parsedScansData.current = gotScansData
                forceUpdate()
            } else {
                let gotScansData = []
                scanData.map(singleScanData => {
                    if (!onlyWatchList || (
                        onlyWatchList && singleScanData.symbol in myWatchList
                    )) {
                        if (symbolFilters.length == 0 || (
                            symbolFilters.length > 0 && symbolFilters.map(a => a.value).includes(singleScanData.symbol)
                        )) {
                            gotScansData.push(singleScanData)
                        }
                    }
                })

                parsedScansData.current = gotScansData
                forceUpdate()
            }
        }
    }

    const subscribeToTrends = () => {
        parsedScansData.current.map(singleScanData => {
            let databaseSymbol = getDatabase(singleScanData.symbol)
            React.firebase.firebase.database(React.firebase['live' + databaseSymbol]).ref(`${singleScanData.symbol}`)
                .once('value', postTrackLivePrice)
        })
    }

    const postTrackLivePrice = (val) => {
        let symbol = val.key,
            livePrice = val.val()

        if (val.val() == null) return
        const symbolIndex = parsedScansData.current.findIndex((obj => obj.symbol == symbol));
        parsedScansData.current[symbolIndex].price = livePrice.C.toFixed(2)

        forceUpdate()
    }

    return (
        <div className={`option-table_wrapper-${parentType} option-table_wrapper-${type}`} ref={theWrapperRef}>
            <CDataTable
                items={parsedScansData.current}
                fields={fields}
                striped
                hover
                sorter
                scopedSlots={slots}
            />
        </div>
    )
}



export default TheScanAsideComponent