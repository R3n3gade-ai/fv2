import React, { useEffect, useState, useRef } from 'react'
import { compose } from 'redux'
import { connect } from 'react-redux'
import { firebaseConnect } from 'react-redux-firebase'
import { updateProperty } from '../store/actions/StylesActions'
import { EditWatchList, EditMarket, SearchSymbol } from '../store/actions/ChartActions'
import { EditProfile } from '../store/actions/UserActions'
import PerfectScrollbar from 'perfect-scrollbar'
import {
  CNav,
  CNavItem,
  CNavLink,
  CTabs,
  CTabContent,
  CTabPane,
  CListGroup,
  CListGroupItem,
  CSwitch,
  CProgress,
  CSidebar,
  CImg,
  CSidebarClose,
  CDataTable,
  CBadge,
  CRow,
  CCol,
  CButton,
  CTooltip
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import moment from 'moment'
import tzmoment from 'moment-timezone'
import { changeTimezone } from '@t0x1c3500/react-stockcharts/lib/utils'
import AsyncSelect  from 'react-select/async'

import {
	getLatestWorkingDay
} from '../views/charts/Utils/dateUtils';

const calcTime = () => {
    let d = new Date(),
        myDatetimeString = tzmoment(d).tz('America/New_York').format('YYYY-MM-DD hh:mm:ss a z')

    return myDatetimeString
}

let divergencePs = null
const TheAside = props => {
  const {
    brands,
    asideShow,
    divergenceVerified,
    watchList,
    watchListChanged,
    disableEvent,
    updateProperty,
    EditWatchList,
    EditMarket,
    SearchSymbol,
    EditProfile
  } = props;

  const [symbolFilters, setSymbolFilters] = useState([])
  const [onlyWatchlist, setOnlyWatchlist] = useState(false)

  const [divergencesListData, setDivergencesListData] = useState([])

  let tableWrapperRef = useRef(null),
      divergenceFirebaseRef = useRef(null)

  useEffect(async() => {
    if (divergenceFirebaseRef.current == null) {
      const requestDate = await getLatestWorkingDay()
      divergenceFirebaseRef.current = React.firebase.firebase.database(React.firebase.tracking).ref(`${requestDate}/one/latest`)
    }

    getDivergences()

    if (tableWrapperRef.current) {
      divergencePs = new PerfectScrollbar('.option-table_wrapper')
    }
  }, [symbolFilters, onlyWatchlist, divergenceVerified])

  useEffect(() => {
      return () => {
          divergenceFirebaseRef.current.off('value', postGetDivergences)
      }
  }, [])

  const getDivergences = async() => {
    return new Promise((resolve, reject) => {
      divergenceFirebaseRef.current.on('value', postGetDivergences)
    })
  }

  const postGetDivergences = (val) => {
    let divergenceData = []
    val.forEach(function(childSnapshot) {
      if (['priceDown', 'priceUp'].find(element => element == childSnapshot.key)) {
        let divergenceColor = childSnapshot.key == 'priceDown' ? '#0ccf02' : '#d0021b'
        childSnapshot.forEach(function(childSnapshotChild) {
          let divergenceFrequency = +childSnapshotChild.key;
          if (divergenceFrequency == 15) {
            childSnapshotChild.forEach(function(childSnapshotTimeStamp) {
              const childSnapShotValue = childSnapshotTimeStamp.val()

              if (symbolFilters.length > 0) {
                let filterSymbols = symbolFilters.map(Sy => {
                  return Sy.value
                })
                
                if (!filterSymbols.find(SyElement => SyElement == childSnapShotValue.s.substring(1))) return
              }

              if (onlyWatchlist) {
                if (!watchList.find(SyElement => SyElement.symbol == childSnapShotValue.s.substring(1))) return
              }

              divergenceData.push({
                symbol: childSnapShotValue.s.substring(1),
                type: childSnapshot.key == 'priceDown' ? 'Bullish' : 'Bearish',
                price: childSnapShotValue.c,
                time: moment(changeTimezone(new Date(+childSnapShotValue.t), 'UTC')).format('HH:mm M/D'),
                epoch: +childSnapShotValue.t,
              })
            })
          }
        })
      }
    })

    setDivergencesListData(divergenceData.sort( compare ))
  }

  const fields = [
    { key: 'symbol', label: 'Symbol', _style: {} },
    { key: 'action', label: '', _style: {}, _classes:'pl-0 pr-0' },
    { key: 'price', label: 'Price', _style: {} },
    { key: 'type', label: 'Type', _style: {} },
    { key: 'time', label: 'Time', _style: {} },
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

  const getBadge = (status)=>{
    switch (status) {
      case 'Bullish': return 'success'
      case 'Bearish': return 'danger'
      default: return 'primary'
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

  return (
    <CSidebar
      className='overlaid-sidebar_divergence'
      colorScheme='dark'
      size='lg'
      show={asideShow}
      onShowChange={() => updateProperty({asideShow: !asideShow})}
    >
      <CSidebarClose className='z-index_it' onClick={() => updateProperty({asideShow: false}) } />
      <CRow>
        <CCol xs='12' sm='12' md='12' className='aside-heading'>
          <div className='d-flex flex-row align-items-center position-relative'>
            <CIcon name='cis-call-split' height={30} />
            <h4 className='mb-0 ml-2'>Divergence</h4> 
            <div className='aside-heading_beta'>
              <i>BETA</i>
            </div>
          </div>
        </CCol>
        <CCol xs='12' sm='12' md='12'>
          { divergenceVerified && 
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
              <div className='option-table_wrapper' ref={tableWrapperRef}>
                <CDataTable
                  items={divergencesListData}
                  fields={fields}
                  striped
                  hover
                  scopedSlots = {{
                    'symbol':
                      (item, index)=> {
                        return (
                          <td style={{fontWeight: 'bolder'}}>
                            <div style={{cursor: 'pointer'}} onClick={() => EditMarket(item.symbol, 0, false, {
                              showDivergence: true
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
                            {/* <CTooltip content='Add to Watchlist'> */}
                              <div style={{cursor: 'pointer'}} onClick={() => EditWatchList(item.symbol)}>
                                { !watchList.find(element => element.symbol == item.symbol) && 
                                  <CIcon size={'sm'} className='text-success' name="cil-queue-add" />
                                }
                                { watchList.find(element => element.symbol == item.symbol) && 
                                  <CIcon size={'sm'} className='text-danger' name="cis-queue-remove" />
                                }
                              </div>
                            {/* </CTooltip> */}
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
                    'type':
                      (item, index)=> {
                        return (
                          <td>
                            <CBadge color={getBadge(item.type)}>
                              {item.type}
                            </CBadge> 
                          </td>
                        )
                      },
                    'time':
                      (item, index)=> {
                        return (
                          <td style={{fontWeight: 'bolder'}}>
                            {item.time}
                          </td>
                        )
                      }
                  }}
                />
              </div>
            </div>
          }
          { !divergenceVerified &&
            <div className='d-flex flex-column justify-content-center align-items-center text-center mt-3'>
              <h6>BETA FEATURE</h6>
              <p className='pl-3 pr-3'>The divergence tool is currently in Beta form as we develop the functionality. As such, it should not be used as a stand alone reference. You are solely responsible for confirming divergence exists manually. Only regular divergence is detected, not trend divergence. Click the button below only if you agree to use this tool at your own risk. Please submit any issues or feedback for this tool in the '#divergence-tool' channel of the Discord server.</p>
              <CButton 
              onClick={() => EditProfile({divergenceVerified: !divergenceVerified})}
              className='font-weight-bold' shape='pill' color='primary'
              >
                I Do Agree
              </CButton>
            </div>
          }
        </CCol>
      </CRow>
    </CSidebar>
  )
}

const mapStateToProps = (state) => {
  return {
    brands: 'symbolMap1' in state.firebase.data ? state.firebase.data.symbolMap1.A : [],
    divergenceVerified: state.firebase.profile.divergenceVerified || false,
    asideShow: state.charts.asideShow,
    watchList: state.charts.watchList,
    watchListChanged: state.charts.watchListChanged,
    disableEvent: state.charts.disableEvent
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    updateProperty: (property) => dispatch(updateProperty(property)),
    EditProfile: (propertyUpdate) => dispatch(EditProfile(propertyUpdate)),
    EditWatchList: (brandSymbol) => dispatch(EditWatchList(brandSymbol)),
    EditMarket: (brandSymbol, brandUid, removeBrand, additionalSettings) => dispatch(EditMarket(brandSymbol, brandUid, removeBrand, additionalSettings)),
    SearchSymbol: (searchInput) => dispatch(SearchSymbol(searchInput))
  }
}

export default React.memo(compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  ),
  firebaseConnect((props) => ([
      `symbolMap1/A#limitToFirst=100`
  ]))
)(TheAside))
