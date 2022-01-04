import React, { useEffect, useReducer, useState, useRef } from 'react'
import { compose } from 'redux'
import { connect } from 'react-redux'
import { firebaseConnect } from 'react-redux-firebase'
import { updateProperty } from '../store/actions/StylesActions'
import { EditWatchList, EditMarket, SearchSymbol } from '../store/actions/ChartActions'
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
import { changeTimezone } from '@t0x1c3500/react-stockcharts/lib/utils'
import AsyncSelect  from 'react-select/async'

let watchlistPs = null
const TheWatchListAside = props => {
  const {
    auth,
    brands,
    watchlistAsideShow,
    watchList,
    watchListChanged,
    dbWachList,
    disableEvent,
    updateProperty,
    EditWatchList,
    EditMarket,
    SearchSymbol
  } = props;

  const [symbolFilters, setSymbolFilters] = useState([])

  const [ignored, forceUpdate] = useReducer(x => x + 1, 0)

  let wacthListTableWrapperRef = useRef(null)

  useEffect(() => {
    if (typeof dbWachList !== typeof undefined) {
      if (dbWachList[auth.uid] !== null) {
        Object.keys(dbWachList[auth.uid]).map((singleDbWachList) => {
          mapSymbolWatchlist(singleDbWachList)
        })
      }
    }

    if (wacthListTableWrapperRef.current) {
      console.log('new scroll inti')
      watchlistPs = new PerfectScrollbar('.option-table_wrapper')
    }
  }, [dbWachList, watchListChanged])

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

  const mapSymbolWatchlist  = (watchedSymbol) => {
    var theWatchListViewEdit = watchList
    var symbolExists = theWatchListViewEdit.some(WatchedSymbolView => {
      return WatchedSymbolView.symbol == watchedSymbol
    })

    if ( !symbolExists ) {
      theWatchListViewEdit.push({
        symbol: watchedSymbol,
        last: 0,
        netdaily: 0
      })

      getLatestValue(watchedSymbol, theWatchListViewEdit)
    }
  }

  const getLatestValue = async(watchedSymbol, theWatchListViewEdit) => {
    let symbolDatabase = getDatabase(watchedSymbol),
        currentMoment = (new Date()).getTime(),
        workingMoment = !['Sunday', 'Saturday'].includes(moment(currentMoment).format('dddd')) ? currentMoment : (
          moment(currentMoment).format('dddd') == 'Saturday' ? currentMoment - 60000 * 60 * 24 : currentMoment - 60000 * 60 * 48
        ),
        requestDate = moment(workingMoment).format('YYYY_MM_DD')

    React.firebase.firebase.database(React.firebase[symbolDatabase])
      .ref(`nanex/e${watchedSymbol}/${requestDate}`)
      .limitToLast(1)
      .on('value', (latestValueSnap) => {
        gotLatestValue(latestValueSnap, watchedSymbol, theWatchListViewEdit)
      })
  }

  const gotLatestValue = async(latestValueSnap, watchedSymbol, theWatchListViewEdit) => {
    latestValueSnap.forEach(function(childSnapshot) {
      let snapShoptValues = childSnapshot.val()
      let symbolLatestValue = snapShoptValues.C.toFixed(2)

      getMOForNetValue(watchedSymbol)
        .then(symbolMoForNetValue => {
          let theWatchListViewIndex = theWatchListViewEdit.findIndex(theWatchListViewEl => {
            return theWatchListViewEl.symbol == watchedSymbol
          })

          theWatchListViewEdit[theWatchListViewIndex] = {
            ...theWatchListViewEdit[theWatchListViewIndex],
            ...{
              last: symbolLatestValue,
              netdaily: ( symbolLatestValue - symbolMoForNetValue ).toFixed(2),
              positive: symbolLatestValue > symbolMoForNetValue
            }
          }

          updateProperty({watchList: theWatchListViewEdit, watchListChanged: !watchListChanged})
          forceUpdate()
        })
    })
  }

  const getMOForNetValue = async(watchedSymbol) => {
     return new Promise((resolve, reject) => {
        React.firebase.firebase.database(React.firebase.tracking)
          .ref(`MO/e${watchedSymbol}`)
          .once('value', (val) => {
            resolve(val.val())
          })   
    })
  }

  const fields = [
    { key: 'symbol', label: 'Symbol', _style: {} },
    { key: 'action', label: '', _style: {}, _classes:'pl-0 pr-0' },
    { key: 'last', label: 'Last', _style: {} },
    { key: 'netdaily', label: 'Net Daily', _style: {} }
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
    },
    
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
      size='lg'
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
                        <AsyncSelect
                            placeholder='Filter Symbols'
                            styles={customStyles}
                            name="form-field-name2"
                            cacheOptions
                            defaultOptions={defaultSymbolOptions}
                            loadOptions={promiseOptions}
                            onChange={setSymbolFilters}
                            isMulti
                            onFocus={() => updateProperty({disableEvent: true})}
                            onBlur={() => updateProperty({disableEvent: false})}
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
                <div className='option-table_wrapper' ref={wacthListTableWrapperRef}>
                  <CDataTable
                      items={watchList}
                      fields={fields}
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
                                      <CIcon size={'sm'} className='text-danger' name="cis-queue-remove" />
                                    </div>
                                </td>
                              )
                          },
                          'last':
                          (item, index)=> {
                              return (
                                  <td>
                                      <CBadge color={'info'}>
                                          {item.last}
                                      </CBadge>
                                  </td>
                              )
                          },
                          'netdaily':
                          (item, index)=> {
                              return (
                                  <td>
                                      <CBadge color={getBadge(item.positive)}>
                                          {item.netdaily}
                                      </CBadge>
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
    brands: 'symbolMap1' in state.firebase.data ? state.firebase.data.symbolMap1.A : [],
    watchlistAsideShow: state.charts.watchlistAsideShow,
    watchList: state.charts.watchList,
    watchListChanged: state.charts.watchListChanged,
    disableEvent: state.charts.disableEvent,
    dbWachList: state.firebase.data.mySymbols
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
    `mySymbols/${props.auth.uid}`,
    `symbolMap1/A#limitToFirst=100`
  ]))
)(TheWatchListAside))
