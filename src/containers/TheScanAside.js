import React, { useEffect, useState, useRef, useReducer } from 'react'
import { compose } from 'redux'
import { connect } from 'react-redux'
import { firebaseConnect } from 'react-redux-firebase'
import { updateProperty } from '../store/actions/StylesActions'
import { EditWatchList, EditMarket, SearchSymbol } from '../store/actions/ChartActions'
import PerfectScrollbar from 'perfect-scrollbar'
import {
    CSidebar,
    CSidebarClose,
    CRow,
    CCol,
    CSwitch,

    CTabs,
    CNav,
    CNavItem,
    CNavLink,
    CTabContent,
    CTabPane,

    CDataTable,
    CBadge
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import moment from 'moment'
import AsyncSelect  from 'react-select/async'

let alphaScansPs = null,
    TrendsScansPs = null,
    TrendsOdayScansPs = null,
    TrendsOweekScansPs = null,
    TrendsOmonthScansPs = null,
    KeltsScansPs = null,
    KeltsOdayScansPs = null,
    KeltsOweekScansPs = null,
    KeltsOmonthScansPs = null

const TheScanAside = props => {
    const {
        charts,
        brands,
        updateTheCharts,
        watchList,
        watchListChanged,
        defaultChartSettings,
        scanAsideShow,
        disableEvent,
        trendScansData,
        updateProperty,
        EditWatchList,
        EditMarket,
        SearchSymbol
    } = props;

    const [symbolFilters, setSymbolFilters] = useState([])
    const [onlyWatchlist, setOnlyWatchlist] = useState(false)

    const [alphaScansData, setAlphaScansData] = useState([])
    const [TrendsScansDataTable, setTrendsScansDataTable] = useState([])
    const [TrendsScansOdayDataTable, setTrendsScansOdayDataTable] = useState([])
    const [TrendsScansOweekDataTable, setTrendsScansOweekDataTable] = useState([])
    const [TrendsScansOmonthDataTable, setTrendsScansOmonthDataTable] = useState([])
    const [KeltsScansDataTable, setKeltsScansDataTable] = useState([])
    const [KeltsScansOdayDataTable, setKeltsScansOdayDataTable] = useState([])
    const [KeltsScansOweekDataTable, setKeltsScansOweekDataTable] = useState([])
    const [KeltsScansOmonthDataTable, setKeltsScansOmonthDataTable] = useState([])

    const AlphaScanstableWrapperRef = useRef(null)
    const TrendsScanstableWrapperRef = useRef(null)
    const TrendsOdayScanstableWrapperRef = useRef(null)
    const TrendsOweekScanstableWrapperRef = useRef(null)
    const TrendsOmonthScanstableWrapperRef = useRef(null)
    const KeltsScanstableWrapperRef = useRef(null)
    const KeltsOdayScanstableWrapperRef = useRef(null)
    const KeltsOweekScanstableWrapperRef = useRef(null)
    const KeltsOmonthScanstableWrapperRef = useRef(null)
    const gotTrendsDataRef = useRef({
        TrendsScansDataTable: false,
        TrendsScansOdayDataTable: false,
        TrendsScansOweekDataTable: false,
        TrendsScansOmonthDataTable: false,
        KeltsScansDataTable: false,
        KeltsScansOdayDataTable: false,
        KeltsScansOweekDataTable: false,
        KeltsScansOmonthDataTable: false
    })

    const [ignored, forceUpdate] = useReducer(x => x + 1, 0)

    let TrendsDataRef = useRef([]),
        firebaseRefs = useRef([]),
        alphaFirebaseRef = useRef(null)

    useEffect(async() => {
        if (alphaFirebaseRef.current == null) {
            let requestDate = moment(new Date()).format('YYYY_MM_DD')
            alphaFirebaseRef.current = React.firebase.firebase.database(React.firebase.tracking).ref(`${requestDate}/one/gainers`)
        }

        getAlphaScans()
        const gotTrends = await getTrendsScans()
        if(gotTrends) subscribeToTrends()

        AlphaScanstableWrapperRef.current && (alphaScansPs = new PerfectScrollbar('.option-table_wrapper-alpha'))
        TrendsScanstableWrapperRef.current && (TrendsScansPs = new PerfectScrollbar('.option-table_wrapper-trends_4h'))
        TrendsOdayScanstableWrapperRef.current && (TrendsOdayScansPs = new PerfectScrollbar('.option-table_wrapper-trends_1d'))
        TrendsOweekScanstableWrapperRef.current && (TrendsOweekScansPs = new PerfectScrollbar('.option-table_wrapper-trends_1w'))
        TrendsOmonthScanstableWrapperRef.current && (TrendsOmonthScansPs = new PerfectScrollbar('.option-table_wrapper-trends_1m'))
        KeltsScanstableWrapperRef.current && (KeltsScansPs = new PerfectScrollbar('.option-table_wrapper-kelts_4h'))
        KeltsOdayScanstableWrapperRef.current && (KeltsOdayScansPs = new PerfectScrollbar('.option-table_wrapper-kelts_1d'))
        KeltsOweekScanstableWrapperRef.current && (KeltsOweekScansPs = new PerfectScrollbar('.option-table_wrapper-kelts_1w'))
        KeltsOmonthScanstableWrapperRef.current && (KeltsOmonthScansPs = new PerfectScrollbar('.option-table_wrapper-kelts_1m'))
    }, [symbolFilters, onlyWatchlist, trendScansData])
    
    useEffect(() => {
        return () => {
            alphaFirebaseRef.current.off('value', postGetAlphaScans)
            firebaseRefs.current.map(firebaseRef => {
                firebaseRef.dbRef.off('value', (val) => {
                    preTrackLivePriceBis(val, firebaseRef.symbol)
                })
            })
        }
    }, [])

    const subscribeToTrends = () => {
        TrendsDataRef.current.map((trendTypeData, trendTypeDataIndex) => {
            trendTypeData.data.map((trendDetailsData, trendDetailsDataIndex) => {
                let symbolDatabase = getDatabase(trendDetailsData.symbol),
                    ExistingRef = firebaseRefs.current.findIndex(firebaseRef => {
                        return firebaseRef.pathName == `liveTick/e${trendDetailsData.symbol}`
                    })

                if (ExistingRef == '-1') {
                    firebaseRefs.current.push({
                        'dbRef': React.firebase.firebase.database(React.firebase['l' + symbolDatabase])
                                    .ref(`liveTick/e${trendDetailsData.symbol}`),
                        'pathName': `liveTick/e${trendDetailsData.symbol}`,
                        'symbol': trendDetailsData.symbol
                    })

                    ExistingRef = firebaseRefs.current.findIndex(firebaseRef => {
                        return firebaseRef.pathName == `liveTick/e${trendDetailsData.symbol}`
                    })

                    firebaseRefs.current[ExistingRef].dbRef.on('value', (val) => {
                        preTrackLivePriceBis(val, trendDetailsData.symbol)
                    })
                }
            }) 
        })
    }

    const getDatabase = (eSymbol) => {
        let eSymbolCodeCharachter = eSymbol.charAt(0)
        let eSymbolCode = (eSymbolCodeCharachter.toLowerCase()).charCodeAt( eSymbolCodeCharachter.length - 1 )

        if (eSymbolCode >= 97 && eSymbolCode <= 102) {
            return 'ae'
        }

        if (eSymbolCode > 102 && eSymbolCode <= 108) {
            return 'fl'
        }

        if (eSymbolCode >= 109 && eSymbolCode <= 115) {
            return 'ms'
        }

        if (eSymbolCode >= 116 && eSymbolCode <= 122) {
            return 'tz'
        }
    }

    const getAlphaScans = async() => {
        return new Promise((resolve, reject) => {
            alphaFirebaseRef.current.on('value', postGetAlphaScans)
        })
    }

    const postGetAlphaScans = (val) => {
        let scansData = []
        val.forEach(function(childSnapshot) {
            let currentSymbol = childSnapshot.key.substring(1),
                currentValues = childSnapshot.val()

            if (symbolFilters.length > 0) {
                let filterSymbols = symbolFilters.map(Sy => {
                return Sy.value
                })
                
                if (!filterSymbols.find(SyElement => SyElement == currentSymbol)) return
            }

            if (onlyWatchlist) {
                if (!watchList.find(SyElement => SyElement.symbol == currentSymbol)) return
            }

            if (currentValues.C > currentValues.MO) {
                scansData.push({
                    symbol: currentSymbol,
                    opened: currentValues.MO,
                    close: currentValues.C,
                    netchange: (currentValues.C - currentValues.MO).toFixed(2),
                    epoch: +currentValues.T
                })
            }
        })

        setAlphaScansData(scansData.sort( compare ))
    }

    const getTrendsScans = async() => {
        if (typeof trendScansData !== typeof undefined) {
            let trendsData = [],
                trendsOdayData = [],
                trendsOweekData = [],
                trendsOmonthData = [],
                keltsData = [],
                keltsOdayData = [],
                keltsOweekData = [],
                keltsOmonthData = []
                
            const trendsDataPromises = Object.keys(trendScansData).map((k,v) => {
                trendScansData[k].map(trendScanItem => {
                    if (['0', '1'].includes(trendScanItem.b)) {
                        if (symbolFilters.length > 0) {
                            let filterSymbols = symbolFilters.map(Sy => {
                                return Sy.value
                            })
                            
                            if (!filterSymbols.find(SyElement => SyElement == trendScanItem.t)) return
                        }

                        if (onlyWatchlist) {
                            if (!watchList.find(SyElement => SyElement.symbol == trendScanItem.t)) return
                        }

                        switch(trendScanItem.ty) {
                            case 'T4H':
                                trendsData.push({
                                    symbol: trendScanItem.t,
                                    date: trendScanItem.d,
                                    epoch: (new Date(trendScanItem.d)).getTime(),
                                    price: '0',
                                    _classes: trendScanItem.b == 0 ? 'bearish-scan_row' : 'bullish-scan_row'
                                })
                                break
                            case 'TD':
                                trendsOdayData.push({
                                    symbol: trendScanItem.t,
                                    date: trendScanItem.d,
                                    epoch: (new Date(trendScanItem.d)).getTime(),
                                    price: '0',
                                    _classes: trendScanItem.b == 0 ? 'bearish-scan_row' : 'bullish-scan_row'
                                })
                                break
                            case 'TW':
                                trendsOweekData.push({
                                    symbol: trendScanItem.t,
                                    date: trendScanItem.d,
                                    epoch: (new Date(trendScanItem.d)).getTime(),
                                    price: '0',
                                    _classes: trendScanItem.b == 0 ? 'bearish-scan_row' : 'bullish-scan_row'
                                })
                                break
                            case 'TM':
                                trendsOmonthData.push({
                                    symbol: trendScanItem.t,
                                    date: trendScanItem.d,
                                    epoch: (new Date(trendScanItem.d)).getTime(),
                                    price: '0',
                                    _classes: trendScanItem.b == 0 ? 'bearish-scan_row' : 'bullish-scan_row'
                                })
                                break
                            case '4H':
                                keltsData.push({
                                    symbol: trendScanItem.t,
                                    price: '0',
                                    _classes: trendScanItem.b == 0 ? 'bearish-scan_row' : 'bullish-scan_row'
                                })
                                break
                            case 'D':
                                keltsOdayData.push({
                                    symbol: trendScanItem.t,
                                    price: '0',
                                    _classes: trendScanItem.b == 0 ? 'bearish-scan_row' : 'bullish-scan_row'
                                })
                                break
                            case 'W':
                                keltsOweekData.push({
                                    symbol: trendScanItem.t,
                                     price: '0',
                                    _classes: trendScanItem.b == 0 ? 'bearish-scan_row' : 'bullish-scan_row'
                                })
                                break
                            case 'M':
                                keltsOmonthData.push({
                                    symbol: trendScanItem.t,
                                    price: '0',
                                    _classes: trendScanItem.b == 0 ? 'bearish-scan_row' : 'bullish-scan_row'
                                })
                                break
                        }
                    }
                })
            })
            
            await Promise.all(trendsDataPromises)
            TrendsDataRef.current = [
                {
                    type: 'trendsScansDataTable',
                    data: trendsData.sort( compare )
                },
                {
                    type: 'trendsScansOdayDataTable',
                    data: trendsOdayData.sort( compare )
                },
                {
                    type: 'trendsScansOweekDataTable',
                    data: trendsOweekData.sort( compare )
                },
                {
                    type: 'trendsScansOmonthDataTable',
                    data: trendsOmonthData.sort( compare )
                },
                {
                    type: 'keltsScansDataTable',
                    data: keltsData
                },
                {
                    type: 'keltsScansOdayDataTable',
                    data: keltsOdayData
                },
                {
                    type: 'keltsScansOweekDataTable',
                    data: keltsOweekData
                },
                {
                    type: 'keltsScansOmonthDataTable',
                    data: keltsOmonthData
                }
            ]

            return true
        } else {
            return false
        }
    }

    const preTrackLivePriceBis = (val, symbol) => {
        TrendsDataRef.current.map((trendTypeData, trendTypeDataIndex) => {
            trendTypeData.data.map((trendDetailsData, trendDetailsDataIndex) => {
                if (trendDetailsData.symbol == symbol) {
                    TrendsDataRef.current[trendTypeDataIndex].data[trendDetailsDataIndex].price = 
                        val.val() !== null && val.val().C.toFixed(2) || '0'

                    // forceUpdate()
                }
            })
        })
    }

    const alphaFields = [
        { key: 'symbol', label: 'Symbol', _style: {} },
        { key: 'action', label: '', _style: {}, _classes: 'pl-0 pr-0' },
        { key: 'close', label: 'Close', _style: {} },
        { key: 'opened', label: 'Opened', _style: {} },
        { key: 'netchange', label: 'Net Change', _style: {} }
    ]
    const TrendsFields = [
        { key: 'symbol', label: 'Symbol', _style: {} },
        { key: 'action', label: '', _style: {}, _classes: 'pl-0 pr-0' },
        { key: 'date', label: 'Date', _style: {} },
        { key: 'price', label: 'Price', _style: {} }
    ]
    const KeltsFields = [
        { key: 'symbol', label: 'Symbol', _style: {} },
        { key: 'action', label: '', _style: {}, _classes: 'pl-0 pr-0' },
        { key: 'price', label: 'Price', _style: {} }
    ]

    const customStyles = {
        container:  (provided, state) => ({
            ...provided,
            padding: '0',
            border: '0',
            fontSize: '0.76563rem',
            lineHeight: 1.5,
            width: '100%'
        }),
        control:  (provided, state) => ({
            ...provided,
            height: 'calc(1.5em + 0.5rem + 2px)',
            minHeight: 'calc(1.5em + 0.5rem + 2px)',
            fontSize: '0.76563rem',
            lineHeight: 1.5,
            borderRadius: '0.2rem',
            border: 'none',
            borderColor: '#d8dbe0',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            boxShadow: 'inset 0 1px 1px rgba(0, 0, 0, 0.075)',
            transition: 'background-color 0.15s ease-in-out, border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out',
            ':hover': {
            borderColor: state.isFocused ? '#66afe9' : '#d8dbe0',
            boxShadow: state.isFocused ? 
                'inset 0 1px 1px rgba(0, 0, 0, 0.075), 0 0 8px rgba(102, 175, 233, 0.6)' : 
                'inset 0 1px 1px rgba(0, 0, 0, 0.075)',
            }
        }),
        valueContainer: (provided, state) => ({
            ...provided,
            marginTop: '0',
            marginLeft: '6px',
            padding: '0',
            border: '0',
        }),
        dropdownIndicator: (provided, state) => ({
            ...provided,
            marginTop: '0',
            padding: '0',
            border: '0',
            width: '16px',
        }),
        clearIndicator: (provided, state) => ({
            ...provided,
            marginTop: '0',
            padding: '0',
            border: '0',
            width: '16px',
        }),
        indicatorsContainer: (provided, state) => ({
            ...provided,
            paddingRight: '4px',
            border: '0',
        }),
        multiValue: (provided, state) => {
            return ({
                ...provided,
                backgroundColor: '#4799eb'
            })
        },
        multiValueLabel: (provided, state) => {
            return ({
                ...provided,
                color: 'white',
                fontWeight: 'bold'
            })
        },
        multiValueRemove: (provided, state) => {
            return ({
                ...provided,
                ':hover': {
                    backgroundColor: 'white',
                    color: '#4799eb'
                }
            })
        },
        input: (provided, state) => {
            return ({
                ...provided,
                color: 'white'
            })
        },
        option: (provided, state) => {
            return ({
                ...provided,
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                textAlign: 'left',
                ':hover': {
                    backgroundColor: '#4799eb'
                },
            })
        },
        menuList: (provided, state) => {
            return ({
                ...provided,
                '::-webkit-scrollbar': {
                    width: '9px',
                },
                '::-webkit-scrollbar-track': {
                    background: 'transparent'
                },
                '::-webkit-scrollbar-thumb': {
                    background: '#555',
                    borderRadius: 10

                },
                '::-webkit-scrollbar-thumb:hover': {
                    background: '#555'
                }
            })
        }
    }

    const defaultSymbolOptions = Object.keys(brands).map((brand, i) => {
        return {
            'value': brand,
            'label': brand
        }
    })

    const promiseOptions = (inputValue) => {
        return new Promise(async(resolve) => {
            const brandsSearch = await SearchSymbol(inputValue)
            let newValues = (brandsSearch !== false) ? brandsSearch : brands

            let resolveValues = Object.keys(newValues).map((brand, i) => {
                return {
                    'value': brand,
                    'label': brand
                }
            })
            resolve(resolveValues)
        })
    }

    const compare = ( a, b ) => {
        if ( a.epoch > b.epoch ){
            return -1
        }
        if ( a.epoch < b.epoch ){
            return 1
        }
        return 0
    }

    return (
        <CSidebar
            className='overlaid-sidebar_divergence'
            colorScheme='dark'
            size='lg'
            show={scanAsideShow}
            onShowChange={() => updateProperty({scanAsideShow: !scanAsideShow})}
        >
            <CSidebarClose className='z-index_it' onClick={() => updateProperty({scanAsideShow: false}) } />
            <CRow>
                <CCol xs='12' sm='12' md='12' className='aside-heading'>
                    <div className='d-flex flex-row align-items-center position-relative'>
                    <CIcon name='cis-search' height={30} />
                    <h4 className='mb-0 ml-2'>Scan</h4> 
                    </div>
                </CCol>
                <CCol xs='12' sm='12' md='12'>
                    <div className='d-flex flex-column'>
                        <div className='d-flex flex-row justify-content-end pl-3 pr-3 pt-3 pb-1'>
                            <CSwitch
                                className="mr-1"
                                color="info"
                                checked={onlyWatchlist || false}
                                shape="pill"
                                variant="3d"
                                size="sm"
                                onChange={() => setOnlyWatchlist(!onlyWatchlist)}
                            />
                            <div>Only WatchList</div>
                        </div>
                        <CRow className='pl-3 pr-3 pb-3 pt-1 align-items-center'>
                            <CCol xs='12' sm='12' md='12'>
                                <AsyncSelect
                                    placeholder='Filter Symbols'
                                    styles={customStyles}
                                    name="form-field-name2"
                                    cacheOptions
                                    defaultOptions={defaultSymbolOptions}
                                    loadOptions={promiseOptions}
                                    onChange={setSymbolFilters}
                                    onFocus={() => updateProperty({disableEvent: true})}
                                    onBlur={() => updateProperty({disableEvent: false})}
                                    isMulti
                                    theme={(theme) => ({
                                        ...theme,
                                        colors: {
                                        ...theme.colors,
                                        primary: 'black',
                                        primary25: 'black',
                                        dangerLight: 'black',
                                        neutral0: '#2a2b36'
                                        },
                                    })}
                                />
                            </CCol>
                        </CRow>

                        <CTabs>
                            <CNav variant='tabs' className='nav-underline nav-underline-primary justify-content-center custom-scans_nav'>
                                <CNavItem>
                                    <CNavLink>
                                        Alpha
                                    </CNavLink>
                                </CNavItem>
                                <CNavItem>
                                    <CNavLink>
                                        Trends
                                    </CNavLink>
                                    </CNavItem>
                                <CNavItem>
                                    <CNavLink>
                                        Kelts
                                    </CNavLink>
                                </CNavItem>
                            </CNav>
                            <CTabContent>
                                <CTabPane>
                                    <div className='option-table_wrapper-alpha' ref={AlphaScanstableWrapperRef}>
                                        <CDataTable
                                            items={alphaScansData}
                                            fields={alphaFields}
                                            striped
                                            hover
                                            scopedSlots = {{
                                                'symbol':
                                                    (item, index)=> {
                                                        return (
                                                            <td style={{fontWeight: 'bolder'}}>
                                                                <div style={{cursor: 'pointer'}} onClick={() => EditMarket(item.symbol, 0, false)}>
                                                                    {item.symbol}
                                                                </div>
                                                            </td>
                                                        )
                                                    },
                                                'action':
                                                    (item, index)=> {
                                                        return (
                                                        <td className='add-to_watchlist pl-0 pr-0'>
                                                            <div style={{cursor: 'pointer'}} onClick={() => EditWatchList(item.symbol)}>
                                                                { !watchList.find(element => element.symbol == item.symbol) && 
                                                                    <CIcon size={'sm'} className='text-success' name="cil-queue-add" />
                                                                }
                                                                { watchList.find(element => element.symbol == item.symbol) && 
                                                                    <CIcon size={'sm'} className='text-danger' name="cis-queue-remove" />
                                                                }
                                                            </div>
                                                        </td>
                                                        )
                                                    },
                                                'close':
                                                    (item, index)=> {
                                                        return (
                                                            <td>
                                                                <CBadge color={'danger'}>
                                                                    {item.close}
                                                                </CBadge>
                                                            </td>
                                                        )
                                                    },
                                                'opened':
                                                    (item, index)=> {
                                                        return (
                                                            <td>
                                                                <CBadge color={'success'}>
                                                                    {item.opened}
                                                                </CBadge>
                                                            </td>
                                                        )
                                                    },
                                                'netchange':
                                                    (item, index)=> {
                                                        return (
                                                            <td style={{fontWeight: 'bolder'}}>
                                                                {item.netchange}
                                                            </td>
                                                        )
                                                    },
                                            }}
                                        />
                                    </div>
                                </CTabPane>
                                <CTabPane>
                                    <CTabs>
                                        <CNav variant='pills' className='nav-underline nav-underline-primary flex-sm-row'>
                                            <CNavItem className='flex-sm-fill'>
                                                <CNavLink className='text-sm-center'>
                                                    4 Hours
                                                </CNavLink>
                                            </CNavItem>
                                            <CNavItem className='flex-sm-fill'>
                                                <CNavLink className='text-sm-center'>
                                                    Day
                                                </CNavLink>
                                            </CNavItem>
                                            <CNavItem className='flex-sm-fill'>
                                                <CNavLink className='text-sm-center'>
                                                    Week
                                                </CNavLink>
                                            </CNavItem>
                                            <CNavItem className='flex-sm-fill'>
                                                <CNavLink className='text-sm-center'>
                                                    Month
                                                </CNavLink>
                                            </CNavItem>
                                        </CNav>
                                        <CTabContent>
                                            <CTabPane>
                                                <div className='option-table_wrapper-trends option-table_wrapper-trends_4h' ref={TrendsScanstableWrapperRef}>
                                                    {TrendsDataRef.current[0] && <CDataTable
                                                        items={TrendsDataRef.current[0].data}
                                                        fields={TrendsFields}
                                                        striped
                                                        hover
                                                        scopedSlots = {{
                                                            'symbol':
                                                                (item, index)=> {
                                                                    return (
                                                                        <td style={{fontWeight: 'bolder'}}>
                                                                            <div style={{cursor: 'pointer'}} onClick={() => EditMarket(item.symbol, 0, false)}>
                                                                                {item.symbol}
                                                                            </div>
                                                                        </td>
                                                                    )
                                                                },
                                                            'action':
                                                                (item, index)=> {
                                                                    return (
                                                                    <td className='add-to_watchlist pl-0 pr-0'>
                                                                        <div style={{cursor: 'pointer'}} onClick={() => EditWatchList(item.symbol)}>
                                                                            { !watchList.find(element => element.symbol == item.symbol) && 
                                                                                <CIcon size={'sm'} className='text-success' name="cil-queue-add" />
                                                                            }
                                                                            { watchList.find(element => element.symbol == item.symbol) && 
                                                                                <CIcon size={'sm'} className='text-danger' name="cis-queue-remove" />
                                                                            }
                                                                        </div>
                                                                    </td>
                                                                    )
                                                                },
                                                            'date':
                                                                (item, index)=> {
                                                                    return (
                                                                        <td style={{fontWeight: 'bolder'}}>
                                                                            {item.date}
                                                                        </td>
                                                                    )
                                                                },
                                                            'price':
                                                                (item, index)=> {
                                                                    return (
                                                                        <td>
                                                                            <CBadge color={'info'}>
                                                                                {item.price}
                                                                            </CBadge>
                                                                        </td>
                                                                    )
                                                                },
                                                        }}
                                                    />}
                                                </div>
                                            </CTabPane>
                                            <CTabPane>
                                                <div className='option-table_wrapper-trends option-table_wrapper-trends_1d' ref={TrendsOdayScanstableWrapperRef}>
                                                    {TrendsDataRef.current[1] && <CDataTable
                                                        items={TrendsDataRef.current[1].data}
                                                        fields={TrendsFields}
                                                        striped
                                                        hover
                                                        scopedSlots = {{
                                                            'symbol':
                                                                (item, index)=> {
                                                                    return (
                                                                        <td style={{fontWeight: 'bolder'}}>
                                                                            <div style={{cursor: 'pointer'}} onClick={() => EditMarket(item.symbol, 0, false)}>
                                                                                {item.symbol}
                                                                            </div>
                                                                        </td>
                                                                    )
                                                                },
                                                            'action':
                                                                (item, index)=> {
                                                                    return (
                                                                    <td className='add-to_watchlist pl-0 pr-0'>
                                                                        <div style={{cursor: 'pointer'}} onClick={() => EditWatchList(item.symbol)}>
                                                                            { !watchList.find(element => element.symbol == item.symbol) && 
                                                                                <CIcon size={'sm'} className='text-success' name="cil-queue-add" />
                                                                            }
                                                                            { watchList.find(element => element.symbol == item.symbol) && 
                                                                                <CIcon size={'sm'} className='text-danger' name="cis-queue-remove" />
                                                                            }
                                                                        </div>
                                                                    </td>
                                                                    )
                                                                },
                                                            'date':
                                                                (item, index)=> {
                                                                    return (
                                                                        <td style={{fontWeight: 'bolder'}}>
                                                                            {item.date}
                                                                        </td>
                                                                    )
                                                                },
                                                            'price':
                                                                (item, index)=> {
                                                                    return (
                                                                        <td>
                                                                            <CBadge color={'info'}>
                                                                                {item.price}
                                                                            </CBadge>
                                                                        </td>
                                                                    )
                                                                },
                                                        }}
                                                    />}
                                                </div>
                                            </CTabPane>
                                            <CTabPane>
                                                <div className='option-table_wrapper-trends option-table_wrapper-trends_1w' ref={TrendsOweekScanstableWrapperRef}>
                                                    {TrendsDataRef.current[2]  && <CDataTable
                                                        items={TrendsDataRef.current[2].data}
                                                        fields={TrendsFields}
                                                        striped
                                                        hover
                                                        scopedSlots = {{
                                                            'symbol':
                                                                (item, index)=> {
                                                                    return (
                                                                        <td style={{fontWeight: 'bolder'}}>
                                                                            <div style={{cursor: 'pointer'}} onClick={() => EditMarket(item.symbol, 0, false)}>
                                                                                {item.symbol}
                                                                            </div>
                                                                        </td>
                                                                    )
                                                                },
                                                            'action':
                                                                (item, index)=> {
                                                                    return (
                                                                    <td className='add-to_watchlist pl-0 pr-0'>
                                                                        <div style={{cursor: 'pointer'}} onClick={() => EditWatchList(item.symbol)}>
                                                                            { !watchList.find(element => element.symbol == item.symbol) && 
                                                                                <CIcon size={'sm'} className='text-success' name="cil-queue-add" />
                                                                            }
                                                                            { watchList.find(element => element.symbol == item.symbol) && 
                                                                                <CIcon size={'sm'} className='text-danger' name="cis-queue-remove" />
                                                                            }
                                                                        </div>
                                                                    </td>
                                                                    )
                                                                },
                                                            'date':
                                                                (item, index)=> {
                                                                    return (
                                                                        <td style={{fontWeight: 'bolder'}}>
                                                                            {item.date}
                                                                        </td>
                                                                    )
                                                                },
                                                            'price':
                                                                (item, index)=> {
                                                                    return (
                                                                        <td>
                                                                            <CBadge color={'info'}>
                                                                                {item.price}
                                                                            </CBadge>
                                                                        </td>
                                                                    )
                                                                },
                                                        }}
                                                    />}
                                                </div>
                                            </CTabPane>
                                            <CTabPane>
                                                <div className='option-table_wrapper-trends option-table_wrapper-trends_1m' ref={TrendsOmonthScanstableWrapperRef}>
                                                    {TrendsDataRef.current[3] && <CDataTable
                                                        items={TrendsDataRef.current[3].data}
                                                        fields={TrendsFields}
                                                        striped
                                                        hover
                                                        scopedSlots = {{
                                                            'symbol':
                                                                (item, index)=> {
                                                                    return (
                                                                        <td style={{fontWeight: 'bolder'}}>
                                                                            <div style={{cursor: 'pointer'}} onClick={() => EditMarket(item.symbol, 0, false)}>
                                                                                {item.symbol}
                                                                            </div>
                                                                        </td>
                                                                    )
                                                                },
                                                            'action':
                                                                (item, index)=> {
                                                                    return (
                                                                    <td className='add-to_watchlist pl-0 pr-0'>
                                                                        <div style={{cursor: 'pointer'}} onClick={() => EditWatchList(item.symbol)}>
                                                                            { !watchList.find(element => element.symbol == item.symbol) && 
                                                                                <CIcon size={'sm'} className='text-success' name="cil-queue-add" />
                                                                            }
                                                                            { watchList.find(element => element.symbol == item.symbol) && 
                                                                                <CIcon size={'sm'} className='text-danger' name="cis-queue-remove" />
                                                                            }
                                                                        </div>
                                                                    </td>
                                                                    )
                                                                },
                                                            'date':
                                                                (item, index)=> {
                                                                    return (
                                                                        <td style={{fontWeight: 'bolder'}}>
                                                                            {item.date}
                                                                        </td>
                                                                    )
                                                                },
                                                            'price':
                                                                (item, index)=> {
                                                                    return (
                                                                        <td>
                                                                            <CBadge color={'info'}>
                                                                                {item.price}
                                                                            </CBadge>
                                                                        </td>
                                                                    )
                                                                },
                                                        }}
                                                    />}
                                                </div>
                                            </CTabPane>
                                        </CTabContent>
                                    </CTabs>
                                </CTabPane>
                                <CTabPane>
                                    <CTabs>
                                        <CNav variant='pills' className='nav-underline nav-underline-primary flex-sm-row'>
                                            <CNavItem className='flex-sm-fill'>
                                                <CNavLink className='text-sm-center'>
                                                    4 Hours
                                                </CNavLink>
                                            </CNavItem>
                                            <CNavItem className='flex-sm-fill'>
                                                <CNavLink className='text-sm-center'>
                                                    Day
                                                </CNavLink>
                                            </CNavItem>
                                            <CNavItem className='flex-sm-fill'>
                                                <CNavLink className='text-sm-center'>
                                                    Week
                                                </CNavLink>
                                            </CNavItem>
                                            <CNavItem className='flex-sm-fill'>
                                                <CNavLink className='text-sm-center'>
                                                    Month
                                                </CNavLink>
                                            </CNavItem>
                                        </CNav>
                                        <CTabContent>
                                            <CTabPane>
                                                <div className='option-table_wrapper-trends option-table_wrapper-kelts_4h' ref={KeltsScanstableWrapperRef}>
                                                    {TrendsDataRef.current[4] && <CDataTable
                                                        items={TrendsDataRef.current[4].data}
                                                        fields={KeltsFields}
                                                        striped
                                                        hover
                                                        scopedSlots = {{
                                                            'symbol':
                                                                (item, index)=> {
                                                                    return (
                                                                        <td style={{fontWeight: 'bolder'}}>
                                                                            <div style={{cursor: 'pointer'}} onClick={() => EditMarket(item.symbol, 0, false)}>
                                                                                {item.symbol}
                                                                            </div>
                                                                        </td>
                                                                    )
                                                                },
                                                            'action':
                                                                (item, index)=> {
                                                                    return (
                                                                    <td className='add-to_watchlist pl-0 pr-0'>
                                                                        <div style={{cursor: 'pointer'}} onClick={() => EditWatchList(item.symbol)}>
                                                                            { !watchList.find(element => element.symbol == item.symbol) && 
                                                                                <CIcon size={'sm'} className='text-success' name="cil-queue-add" />
                                                                            }
                                                                            { watchList.find(element => element.symbol == item.symbol) && 
                                                                                <CIcon size={'sm'} className='text-danger' name="cis-queue-remove" />
                                                                            }
                                                                        </div>
                                                                    </td>
                                                                    )
                                                                },
                                                            'price':
                                                                (item, index)=> {
                                                                    return (
                                                                        <td>
                                                                            <CBadge color={'info'}>
                                                                                {item.price}
                                                                            </CBadge>
                                                                        </td>
                                                                    )
                                                                },
                                                        }}
                                                    />}
                                                </div>
                                            </CTabPane>
                                            <CTabPane>
                                                <div className='option-table_wrapper-trends option-table_wrapper-kelts_1d' ref={KeltsOdayScanstableWrapperRef}>
                                                    {TrendsDataRef.current[5] && <CDataTable
                                                        items={TrendsDataRef.current[5].data}
                                                        fields={KeltsFields}
                                                        striped
                                                        hover
                                                        scopedSlots = {{
                                                            'symbol':
                                                                (item, index)=> {
                                                                    return (
                                                                        <td style={{fontWeight: 'bolder'}}>
                                                                            <div style={{cursor: 'pointer'}} onClick={() => EditMarket(item.symbol, 0, false)}>
                                                                                {item.symbol}
                                                                            </div>
                                                                        </td>
                                                                    )
                                                                },
                                                            'action':
                                                                (item, index)=> {
                                                                    return (
                                                                    <td className='add-to_watchlist pl-0 pr-0'>
                                                                        <div style={{cursor: 'pointer'}} onClick={() => EditWatchList(item.symbol)}>
                                                                            { !watchList.find(element => element.symbol == item.symbol) && 
                                                                                <CIcon size={'sm'} className='text-success' name="cil-queue-add" />
                                                                            }
                                                                            { watchList.find(element => element.symbol == item.symbol) && 
                                                                                <CIcon size={'sm'} className='text-danger' name="cis-queue-remove" />
                                                                            }
                                                                        </div>
                                                                    </td>
                                                                    )
                                                                },
                                                            'price':
                                                                (item, index)=> {
                                                                    return (
                                                                        <td>
                                                                            <CBadge color={'info'}>
                                                                                {item.price}
                                                                            </CBadge>
                                                                        </td>
                                                                    )
                                                                },
                                                        }}
                                                    />}
                                                </div>
                                            </CTabPane>
                                            <CTabPane>
                                                <div className='option-table_wrapper-trends option-table_wrapper-kelts_1w' ref={KeltsOweekScanstableWrapperRef}>
                                                    {TrendsDataRef.current[6] && <CDataTable
                                                        items={TrendsDataRef.current[6].data}
                                                        fields={KeltsFields}
                                                        striped
                                                        hover
                                                        scopedSlots = {{
                                                            'symbol':
                                                                (item, index)=> {
                                                                    return (
                                                                        <td style={{fontWeight: 'bolder'}}>
                                                                            <div style={{cursor: 'pointer'}} onClick={() => EditMarket(item.symbol, 0, false)}>
                                                                                {item.symbol}
                                                                            </div>
                                                                        </td>
                                                                    )
                                                                },
                                                            'action':
                                                                (item, index)=> {
                                                                    return (
                                                                    <td className='add-to_watchlist pl-0 pr-0'>
                                                                        <div style={{cursor: 'pointer'}} onClick={() => EditWatchList(item.symbol)}>
                                                                            { !watchList.find(element => element.symbol == item.symbol) && 
                                                                                <CIcon size={'sm'} className='text-success' name="cil-queue-add" />
                                                                            }
                                                                            { watchList.find(element => element.symbol == item.symbol) && 
                                                                                <CIcon size={'sm'} className='text-danger' name="cis-queue-remove" />
                                                                            }
                                                                        </div>
                                                                    </td>
                                                                    )
                                                                },
                                                            'price':
                                                                (item, index)=> {
                                                                    return (
                                                                        <td>
                                                                            <CBadge color={'info'}>
                                                                                {item.price}
                                                                            </CBadge>
                                                                        </td>
                                                                    )
                                                                },
                                                        }}
                                                    />}
                                                </div>
                                            </CTabPane>
                                            <CTabPane>
                                                <div className='option-table_wrapper-trends option-table_wrapper-kelts_1m' ref={KeltsOmonthScanstableWrapperRef}>
                                                    {TrendsDataRef.current[7] && <CDataTable
                                                        items={TrendsDataRef.current[7].data}
                                                        fields={KeltsFields}
                                                        striped
                                                        hover
                                                        scopedSlots = {{
                                                            'symbol':
                                                                (item, index)=> {
                                                                    return (
                                                                        <td style={{fontWeight: 'bolder'}}>
                                                                            <div style={{cursor: 'pointer'}} onClick={() => EditMarket(item.symbol, 0, false)}>
                                                                                {item.symbol}
                                                                            </div>
                                                                        </td>
                                                                    )
                                                                },
                                                            'action':
                                                                (item, index)=> {
                                                                    return (
                                                                    <td className='add-to_watchlist pl-0 pr-0'>
                                                                        <div style={{cursor: 'pointer'}} onClick={() => EditWatchList(item.symbol)}>
                                                                            { !watchList.find(element => element.symbol == item.symbol) && 
                                                                                <CIcon size={'sm'} className='text-success' name="cil-queue-add" />
                                                                            }
                                                                            { watchList.find(element => element.symbol == item.symbol) && 
                                                                                <CIcon size={'sm'} className='text-danger' name="cis-queue-remove" />
                                                                            }
                                                                        </div>
                                                                    </td>
                                                                    )
                                                                },
                                                            'price':
                                                                (item, index)=> {
                                                                    return (
                                                                        <td>
                                                                            <CBadge color={'info'}>
                                                                                {item.price}
                                                                            </CBadge>
                                                                        </td>
                                                                    )
                                                                },
                                                        }}
                                                    />}
                                                </div>
                                            </CTabPane>
                                        </CTabContent>
                                    </CTabs>
                                </CTabPane>
                            </CTabContent>
                        </CTabs>
                    </div>
                </CCol>
            </CRow>
        </CSidebar>
    )
}

const mapStateToProps = (state) => {
  return {
    charts: state.charts.charts,
    brands: 'symbolMap1' in state.firebase.data ? state.firebase.data.symbolMap1.A : [],
    updateTheCharts: state.charts.updateTheCharts,
    watchList: state.charts.watchList,
    watchListChanged: state.charts.watchListChanged,
    defaultChartSettings: state.charts.defaultChartSettings,
    scanAsideShow: state.charts.scanAsideShow,
    disableEvent: state.charts.disableEvent,
    trendScansData: state.firebase.data.scansTest,
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    updateProperty: (property) => dispatch(updateProperty(property)),
    EditWatchList: (brandSymbol) => dispatch(EditWatchList(brandSymbol)),
    EditMarket: (brandSymbol, brandUid, removeBrand) => dispatch(EditMarket(brandSymbol, brandUid, removeBrand)),
    SearchSymbol: (searchInput) => dispatch(SearchSymbol(searchInput))
  }
}

export default React.memo(compose(
    connect(
        mapStateToProps,
        mapDispatchToProps
    ),
    firebaseConnect((props) => ([
        `scansTest#limitToLast=1`,
        `symbolMap1/A#limitToFirst=100`
    ]))
)(TheScanAside))