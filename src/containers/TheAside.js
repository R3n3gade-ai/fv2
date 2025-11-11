import React, { useEffect, useState, useRef } from 'react'
import { connect } from 'react-redux'
import { updateProperty } from '../store/actions/StylesActions'
import { EditWatchList, EditMarket } from '../store/actions/ChartActions'
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
import { changeTimezone } from '/node_modules/@tradingproject19/react-stockcharts/src/lib/utils'

import FtAsyncSelect from '../views/components/common/FtAsyncSelect'

import {
	getLatestWorkingDay
} from '../views/charts/Utils/dateUtils'

import { isBrowser, isMobile } from 'react-device-detect'

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
    disableEvent,
    myWatchList,
    updateProperty,
    EditWatchList,
    EditMarket,
    EditProfile
  } = props;

  const [symbolFilters, setSymbolFilters] = useState([])
  const [onlyWatchlist, setOnlyWatchlist] = useState(false)

  const [divergencesListData, setDivergencesListData] = useState([])

  let tableWrapperRef = useRef(null),
      divergenceFirebaseRef = useRef(null)

  useEffect(() => {
    if (divergenceFirebaseRef.current == null) {
      let requestDateOrigin = new Date(),
          requestedMoment = tzmoment(requestDateOrigin).tz('America/New_York'),
          requestDateEdited = ([0,6].includes(requestedMoment.day())) ? 
            requestedMoment.subtract(
              requestedMoment.day() == 0 ? 2 : 1, 
              'days'
            )
            : (
              requestedMoment.hour() < 9 ? requestedMoment.subtract(1, 'days') : requestedMoment
            ),
          requestDate = requestDateEdited.format('YYYY-MM-DD')

      divergenceFirebaseRef.current = React.firebase.firebase.database(React.firebase.tracking).ref(`${requestDate}/one/latest`)
    }

    setTimeout(() => {
      getDivergences()
    }, 300)

    if (tableWrapperRef.current) {
      divergencePs = new PerfectScrollbar('.option-table_wrapper')
    }
  }, [symbolFilters, onlyWatchlist, myWatchList, divergenceVerified])

  useEffect(() => {
      return () => {
        divergenceFirebaseRef.current.off('value')
      }
  }, [])

  const getDivergences = () => {
    divergenceFirebaseRef.current.on('value', postGetDivergences)
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
                
                if (!filterSymbols.find(SyElement => SyElement == childSnapShotValue.s)) return
              }

              if (onlyWatchlist) {
                if (! ( childSnapShotValue.s in myWatchList)) return
              }

              divergenceData.push({
                symbol: childSnapShotValue.s,
                type: childSnapshot.key == 'priceDown' ? 'Bullish' : 'Bearish',
                price: childSnapShotValue.c,
                time: tzmoment(+childSnapShotValue.t).tz('America/New_York').format('HH:mm M/D'),
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
      size={isMobile ? `lg` : `xl`}
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
                  <FtAsyncSelect 
                    placeholderProps={'Symbols filter'} 
                    onChangeProps={setSymbolFilters}
                    isMultiProps={true}
                    onFocusProps={() => updateProperty({disableEvent: true})}
                    onBlurProps={() => updateProperty({disableEvent: false})}
                  />
                </CCol>
              </CRow>
              <div className='option-table_wrapper' ref={tableWrapperRef}>
                <CDataTable
                  items={divergencesListData}
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
                              <div style={{cursor: 'pointer'}} onClick={() => EditWatchList(item.symbol, !(item.symbol in myWatchList))}>
                                { !(item.symbol in myWatchList) && 
                                  <CIcon size={'sm'} className='text-success' name="cil-queue-add" />
                                }
                                { item.symbol in myWatchList && 
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
    auth: state.firebase.auth,

    divergenceVerified: state.firebase.profile.divergenceVerified || false,
    asideShow: state.charts.asideShow,
    disableEvent: state.charts.disableEvent,

    myWatchList: 'mySymbols' in state.firebase.data ? (
      state.firebase.data.mySymbols[state.firebase.auth.uid] !== null ? state.firebase.data.mySymbols[state.firebase.auth.uid] : {}
    ) : {}
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    updateProperty: (property) => dispatch(updateProperty(property)),
    EditProfile: (propertyUpdate) => dispatch(EditProfile(propertyUpdate)),
    EditWatchList: (brandSymbol, addBrand) => dispatch(EditWatchList(brandSymbol, addBrand)),
    EditMarket: (brandSymbol, brandUid, removeBrand, additionalSettings) => dispatch(EditMarket(brandSymbol, brandUid, removeBrand, additionalSettings)),
  }
}

export default React.memo(connect(
  mapStateToProps,
  mapDispatchToProps
)(TheAside))
