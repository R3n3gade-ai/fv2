import React, { useEffect, useState, useRef, useReducer } from 'react'
import { compose } from 'redux'
import { connect } from 'react-redux'
import { firebaseConnect } from 'react-redux-firebase'
import { updateProperty } from '../store/actions/StylesActions'
import { EditWatchList, EditMarket } from '../store/actions/ChartActions'
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

import FtAsyncSelect from '../views/components/common/FtAsyncSelect'

import { isBrowser, isMobile } from 'react-device-detect'

import TheScanAsideComponent from './TheScanAsideComponent'

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
        updateTheCharts,
        defaultChartSettings,
        scanAsideShow,
        disableEvent,

        myWatchList,

        trendScansData,
        updateProperty,
        EditWatchList,
        EditMarket
    } = props;

    const [symbolFilters, setSymbolFilters] = useState([])
    const [onlyWatchlist, setOnlyWatchlist] = useState(false)

    const [scanType, setScanType] = useState('alpha')
    const [alphaScansData, setAlphaScansData] = useState([])

    const [lastActiveTrendsTab, setLastActiveTrendsTab] = useState('trends_4h')
    const [lastActiveKeltsTab, setLastActiveKeltsTab] = useState('kelts_4h')

    let TrendsDataRef = useRef([]),
        TrendsDataCopyRef = useRef([]),
        firebaseRefs = useRef([]),
        alphaFirebaseRef = useRef(null)

    useEffect(() => {
        if (alphaFirebaseRef.current == null) {
            let requestDate = moment(new Date()).format('YYYY-MM-DD')
            alphaFirebaseRef.current = React.firebase.firebase.database(React.firebase.tracking).ref(`${requestDate}/one/gainers`)

            getAlphaScans()
        }
    }, [symbolFilters, onlyWatchlist, trendScansData])
    
    useEffect(() => {
        return () => {
            alphaFirebaseRef.current.off('value')
        }
    }, [])
    
    const getAlphaScans = () => {
        alphaFirebaseRef.current.on('value', postGetAlphaScans)
    }

    const postGetAlphaScans = (val) => {
        let scansData = []
        val.forEach(function(childSnapshot) {
            let currentSymbol = childSnapshot.key,
                currentValues = childSnapshot.val();

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

    const childData = {
        'alpha': {
            'fields': [
                { key: 'symbol', label: 'Symbol', _style: {} },
                { key: 'action', label: '', _style: {}, _classes: 'pl-0 pr-0' },
                { key: 'close', label: 'Close', _style: {} },
                { key: 'opened', label: 'Opened', _style: {} },
                { key: 'netchange', label: 'Net Change', _style: {} }
            ],
            'slots': {
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
                            <div style={{cursor: 'pointer'}} onClick={() => EditWatchList(item.symbol, !(item.symbol in myWatchList))}>
                                { !(item.symbol in myWatchList) && 
                                    <CIcon size={'sm'} className='text-success' name="cil-queue-add" />
                                }
                                { item.symbol in myWatchList && 
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
            },
            'maps': {}
        },
        'trends': {
            'fields': [
                { key: 'symbol', label: 'Symbol', _style: {} },
                { key: 'action', label: '', _style: {}, _classes: 'pl-0 pr-0' },
                { key: 'date', label: 'Date', _style: {} },
                { key: 'price', label: 'Price', _style: {} }
            ],
            'slots': {
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
                            <div style={{cursor: 'pointer'}} onClick={() => EditWatchList(item.symbol, !(item.symbol in myWatchList))}>
                                { !(item.symbol in myWatchList) && 
                                    <CIcon size={'sm'} className='text-success' name="cil-queue-add" />
                                }
                                { item.symbol in myWatchList && 
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
            },
            'maps': {
                'trends_4h': 'T4H',
                'trends_1d': 'TD',
                'trends_1w': 'TW',
                'trends_1m': 'TM'
            }
        },
        'kelts': {
            'fields': [
                { key: 'symbol', label: 'Symbol', _style: {} },
                { key: 'action', label: '', _style: {}, _classes: 'pl-0 pr-0' },
                { key: 'price', label: 'Price', _style: {} }
            ],
            'slots': {
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
                            <div style={{cursor: 'pointer'}} onClick={() => EditWatchList(item.symbol, !(item.symbol in myWatchList))}>
                                { !(item.symbol in myWatchList) && 
                                    <CIcon size={'sm'} className='text-success' name="cil-queue-add" />
                                }
                                { item.symbol in myWatchList && 
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
            },
            'maps': {
                'kelts_4h': '4H',
                'kelts_1d': 'D',
                'kelts_1w': 'W',
                'kelts_1m': 'M'
            }
        }
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

    const getTabComponent = (scanCategory, theScanType, theParentType) => {
        if (scanCategory == scanType) {
            return (
                <TheScanAsideComponent 
                    parentType={theParentType} 
                    dataType={theParentType == 'trends' ? childData[theScanType].maps[scanCategory] : ''} 
                    dataCategory={theScanType} 
                    type={scanType} 
                    fields={childData[theScanType].fields} 
                    data={theParentType == 'trends' ? trendScansData : alphaScansData} 
                    slots={childData[theScanType].slots} 
                    onlyWatchList={onlyWatchlist}
                    myWatchList={myWatchList}
                    symbolFilters={symbolFilters}
                />
            )
        } else {
            return (null)
        }
    }

    const changeScanTab = (tabValue, tabType) => {
        if (tabType == 'parent') {
            switch(tabValue) {
                case 0:
                    setScanType('alpha')
                    break;
                case 1:
                    setScanType(lastActiveTrendsTab)
                    break;
                case 2:
                    setScanType(lastActiveKeltsTab)
                    break;
            }
        } else if (tabType == 'trends') {
            switch(tabValue) {
                case 0:
                    setScanType('trends_4h')
                    setLastActiveTrendsTab('trends_4h')
                    break;
                case 1:
                    setScanType('trends_1d')
                    setLastActiveTrendsTab('trends_1d')
                    break;
                case 2:
                    setScanType('trends_1w')
                    setLastActiveTrendsTab('trends_1w')
                    break;
                case 3:
                    setScanType('trends_1m')
                    setLastActiveTrendsTab('trends_1m')
                    break;
            }
        } else if (tabType == 'kelts') {
            switch(tabValue) {
                case 0:
                    setScanType('kelts_4h')
                    setLastActiveKeltsTab('kelts_4h')
                    break;
                case 1:
                    setScanType('kelts_1d')
                    setLastActiveKeltsTab('kelts_1d')
                    break;
                case 2:
                    setScanType('kelts_1w')
                    setLastActiveKeltsTab('kelts_1w')
                    break;
                case 3:
                    setScanType('kelts_1m')
                    setLastActiveKeltsTab('kelts_1m')
                    break;
            }
        }
    }

    return (
        <CSidebar
            className='overlaid-sidebar_divergence'
            colorScheme='dark'
            size={isMobile ? `lg` : `xl`}
            show={scanAsideShow}
            //onShowChange={() => updateProperty({scanAsideShow: !scanAsideShow})}
        >
            <CSidebarClose className='z-index_it' 
                onClick={() => updateProperty({scanAsideShow: false}) } 
            />
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
                                <FtAsyncSelect 
                                    placeholderProps={'Symbols filter'} 
                                    onChangeProps={setSymbolFilters}
                                    isMultiProps={true}
                                    onFocusProps={() => updateProperty({disableEvent: true})}
                                    onBlurProps={() => updateProperty({disableEvent: false})}
                                />
                            </CCol>
                        </CRow>

                        <CTabs onActiveTabChange={(e) => changeScanTab(e, 'parent')} >
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
                                    {getTabComponent('alpha', 'alpha', 'alpha')}
                                </CTabPane>
                                <CTabPane>
                                    <CTabs onActiveTabChange={(e) => changeScanTab(e, 'trends')}>
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
                                                {getTabComponent('trends_4h', 'trends', 'trends')}
                                            </CTabPane>
                                            <CTabPane>
                                                {getTabComponent('trends_1d', 'trends', 'trends')}
                                            </CTabPane>
                                            <CTabPane>
                                                {getTabComponent('trends_1w', 'trends', 'trends')}
                                            </CTabPane>
                                            <CTabPane>
                                                {getTabComponent('trends_1m', 'trends', 'trends')}
                                            </CTabPane>
                                        </CTabContent>
                                    </CTabs>
                                </CTabPane>
                                <CTabPane>
                                    <CTabs onActiveTabChange={(e) => changeScanTab(e, 'kelts')}>
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
                                                {getTabComponent('kelts_4h', 'kelts', 'trends')}
                                            </CTabPane>
                                            <CTabPane>
                                                {getTabComponent('kelts_1d', 'kelts', 'trends')}
                                            </CTabPane>
                                            <CTabPane>
                                                {getTabComponent('kelts_1w', 'kelts', 'trends')}
                                            </CTabPane>
                                            <CTabPane>
                                                {getTabComponent('kelts_1m', 'kelts', 'trends')}
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
    auth: state.firebase.auth,

    charts: state.charts.charts,
    updateTheCharts: state.charts.updateTheCharts,
    defaultChartSettings: state.charts.defaultChartSettings,
    scanAsideShow: state.charts.scanAsideShow,
    disableEvent: state.charts.disableEvent,
    trendScansData: state.firebase.data.scansTest,

    myWatchList: 'mySymbols' in state.firebase.data ? (
        state.firebase.data.mySymbols[state.firebase.auth.uid] !== null ? state.firebase.data.mySymbols[state.firebase.auth.uid] : {}
      ) : {}
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    updateProperty: (property) => dispatch(updateProperty(property)),
    EditWatchList: (brandSymbol, addBrand) => dispatch(EditWatchList(brandSymbol, addBrand)),
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
        { path: `mySymbols/${props.auth.uid}`, queryParams: [
            'orderByKey'
        ] }
    ]))
)(TheScanAside))