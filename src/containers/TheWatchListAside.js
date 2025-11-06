import React, { useEffect, useReducer, useState, useRef } from 'react'
import { compose } from 'redux'
import { connect } from 'react-redux'
import { firebaseConnect } from 'react-redux-firebase'
import { updateProperty } from '../store/actions/StylesActions'
import { EditWatchList, EditMarket } from '../store/actions/ChartActions'
import FtAsyncSelect from '../views/components/common/FtAsyncSelect'

import PerfectScrollbar from 'perfect-scrollbar'
import {
    CSidebar,
    CSidebarClose,
    CDataTable,
    CBadge,
    CRow,
    CCol
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import moment from 'moment'
import tzmoment from 'moment-timezone'
import { changeTimezone } from '/node_modules/@tradingproject19/react-stockcharts/src/lib/utils'
import { isBrowser, isMobile } from 'react-device-detect'

import {
	getLatestWorkingDay
} from '../views/charts/Utils/dateUtils';

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

let watchlistPs = null,
    theWatchListViewEdit = [],
    filterSymbols = []
const TheWatchListAside = props => {
  const {
    auth,
    watchlistAsideShow,
    myWatchList,
    disableEvent,
    updateProperty,
    EditWatchList,
    EditMarket
  } = props;

  const [computedWatchList, setComputedWatchList] = useState([])
  const [symbolFilters, setSymbolFilters] = useState([])

  const [ignored, forceUpdate] = useReducer(x => x + 1, 0)

  let wacthListTableWrapperRef = useRef(null)

  useEffect(() => {
    if (wacthListTableWrapperRef.current) {
      watchlistPs = new PerfectScrollbar('.watchlist-table_wrapper')
    }
  })

  useEffect(() => {
     setComputedWatchList(Object.keys(myWatchList).map(watchedElement => {
        return {
          symbol: watchedElement,
          last: 0,
          netdaily: 0,
          positive: false,
          loading: true
        }
    }))

    Object.keys(myWatchList).map(watchedElement => {
      if (symbolFilters.length == 0 || (
        symbolFilters.length > 0 && symbolFilters.map(a => a.value).includes(watchedElement)
      )) {
        getLatestValue(watchedElement)
      }
    })
  }, [myWatchList, symbolFilters])

  const getLatestValue = async(watchedSymbol) => {
    let databaseSymbol = getDatabase(watchedSymbol)

    if (watchedSymbol.match(/\*0$/)) {
      let futureWatchedSymbol = watchedSymbol.replace('*0', '')
      React.firebase.firebase.database(React.firebase['livefutures'])
      .ref(`symbols/${futureWatchedSymbol}`)
      .once('value', (latestValueSnap) => {
        gotLatestValue(latestValueSnap.val(), futureWatchedSymbol, true)
      })
    } else {
      React.firebase.firebase.database(React.firebase['live' + databaseSymbol])
      .ref(`${watchedSymbol}`)
      .once('value', (latestValueSnap) => {
        gotLatestValue(latestValueSnap.val(), watchedSymbol)
      })
    }
  }

  const gotLatestValue = async(snapShoptValues, watchedSymbol, isFuture = false) => {
    if (snapShoptValues == null) return
    
    let symbolLatestValue = snapShoptValues.C.toFixed(2)
    getMOForNetValue(watchedSymbol, isFuture)
      .then(symbolMoForNetValue => {
        setComputedWatchList(old => {
          const existingIndex = old.findIndex((oldElement) => oldElement.symbol == ( watchedSymbol + ( isFuture ? '*0' : '' ) ))
          if (existingIndex == -1) {
            return [...old, ...[
              {
                symbol: watchedSymbol + ( isFuture ? '*0' : '' ),
                last: symbolLatestValue,
                netdaily: ( symbolLatestValue - symbolMoForNetValue ).toFixed(2),
                positive: symbolLatestValue > symbolMoForNetValue,
                loading: false
              }
            ]]
          } else {
            old[existingIndex] = {
              symbol: watchedSymbol + ( isFuture ? '*0' : '' ),
              last: symbolLatestValue,
              netdaily: ( symbolLatestValue - symbolMoForNetValue ).toFixed(2),
              positive: symbolLatestValue > symbolMoForNetValue,
              loading: false
            }

            return old
          }
        })
        
        forceUpdate()
      })
  }

  const getMOForNetValue = async(watchedSymbol, isFuture) => {
     return new Promise((resolve, reject) => {
       if (isFuture) {
        React.firebase.firebase.database(React.firebase.trackingfutures)
          .ref(`MO/${watchedSymbol}`)
          .once('value', (val) => {
            resolve(val.val())
          })  
       } else {
        React.firebase.firebase.database(React.firebase.tracking)
          .ref(`MO/${watchedSymbol}`)
          .once('value', (val) => {
            resolve(val.val())
          })  
       } 
    })
  }

  const fields = [
    { key: 'symbol', label: 'Symbol', _style: {} },
    { key: 'action', label: '', _style: {}, _classes:'pl-0 pr-0' },
    { key: 'last', label: 'Last', _style: {} },
    { key: 'netdaily', label: 'Net Daily', _style: {} }
  ]

  const getBadge = (positiveNet)=>{
    if (positiveNet) return 'success'
    return 'danger'
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
      size={isMobile ? `lg` : `xl`}
      show={watchlistAsideShow}
      onShowChange={() => updateProperty({watchlistAsideShow: !watchlistAsideShow})}
    >
      <CSidebarClose className='z-index_it' onClick={() => updateProperty({watchlistAsideShow: false}) } />
      <CRow>
        <CCol xs='12' sm='12' md='12' className='aside-heading'>
          <div className='d-flex flex-row align-items-center position-relative'>
            <CIcon name='cis-queue' height={30} />
            <h4 className='mb-0 ml-2'>Watchlist</h4> 
          </div>
        </CCol>
        <CCol xs='12' sm='12' md='12'>
            <div className='d-flex flex-column'>
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
                <div className='watchlist-table_wrapper' ref={wacthListTableWrapperRef}>
                  <CDataTable
                      items={computedWatchList}
                      fields={fields}
                      striped
                      hover
                      sorter
                      scopedSlots = {{
                          'symbol':
                          (item, index)=> {
                              return (
                                <td style={{fontWeight: 'bolder'}}>
                                    <div style={{cursor: 'pointer'}} onClick={() => EditMarket(item.symbol, 0, false, {
                                      securityType: item.symbol.match(/\*0$/) ? 'futures' : 'stocks'
                                    })}>
                                        {item.symbol}
                                    </div>
                                </td>
                              )
                          },
                          'action':
                          (item, index)=> {
                              return (
                                <td className='add-to_watchlist pl-0 pr-0'>
                                    <div style={{cursor: 'pointer'}} onClick={() => EditWatchList(item.symbol, false)}>
                                      <CIcon size={'sm'} className='text-danger' name="cis-queue-remove" />
                                    </div>
                                </td>
                              )
                          },
                          'last':
                          (item, index)=> {
                              return (
                                  <td>
                                      {item.loading && 
                                        <div className="lds-dual-ring"></div> || 
                                        <CBadge color={'info'}>
                                          {item.last}
                                      </CBadge>}
                                  </td>
                              )
                          },
                          'netdaily':
                          (item, index)=> {
                              return (
                                  <td>
                                      {item.loading && 
                                        <div className="lds-dual-ring"></div> || 
                                        <CBadge color={getBadge(item.positive)}>
                                            {item.netdaily}
                                        </CBadge>
                                      }
                                  </td>
                              )
                          }
                      }}
                  />
                </div>
            </div>
        </CCol>
      </CRow>
    </CSidebar>
  )
}

const mapStateToProps = (state) => {
  return {
    auth: state.firebase.auth,
    watchlistAsideShow: state.charts.watchlistAsideShow,
    disableEvent: state.charts.disableEvent,

    myWatchList: 'mySymbols' in state.firebase.data ? (
      state.firebase.data.mySymbols[state.firebase.auth.uid] !== null ? state.firebase.data.mySymbols[state.firebase.auth.uid] : {}
    ) : {}

    // myWatchList: 'mySymbols' in state.firebase.data ? (
    //   state.firebase.data.mySymbols[state.firebase.auth.uid] !== null ? (
    //     Object.keys(state.firebase.data.mySymbols[state.firebase.auth.uid]).map(symbolBrand => {
    //       return {
    //         symbol: symbolBrand,
    //         last: 0,
    //         netdaily: 0
    //       }
    //     })
    //   ) : []
    // ) : []
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    updateProperty: (property) => dispatch(updateProperty(property)),
    EditWatchList: (brandSymbol, brandAdd) => dispatch(EditWatchList(brandSymbol, brandAdd)),
    EditMarket: (brandSymbol, brandUid, removeBrand, additionalSettings) => dispatch(EditMarket(brandSymbol, brandUid, removeBrand, additionalSettings)),
  }
}

export default React.memo(compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  ),
  firebaseConnect((props) => {
    return ([
      { path: `mySymbols/${props.auth.uid}`, queryParams: [
          'orderByKey'
      ] }
    ])
  })
)(TheWatchListAside))
