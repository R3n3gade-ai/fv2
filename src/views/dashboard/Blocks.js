import React, { useEffect, useState, useRef } from 'react'
import { compose } from 'redux'
import { connect } from 'react-redux'
import { firebaseConnect } from 'react-redux-firebase'
import { updateProperty } from '../../store/actions/StylesActions'

import FtAsyncSelect from '../components/common/FtAsyncSelect'

import PerfectScrollbar from 'perfect-scrollbar'
import {
  CCardBody,
  CBadge,
  CDataTable,
  CSelect,
  CInput,

  CButton
} from '@coreui/react'
import CIcon from '@coreui/icons-react'

import moment from 'moment'
import Slider from 'react-rangeslider'
import 'react-rangeslider/lib/index.css'

const kmFormatter = (number) => {
    const SI_SYMBOL = ["", "k", "M", "G", "T", "P", "E"];

    // what tier? (determines SI symbol)
    var tier = Math.log10(Math.abs(number)) / 3 | 0;

    // if zero, we don't need a suffix
    if(tier == 0) return number;

    // get suffix and determine scale
    if (typeof SI_SYMBOL[tier] == typeof undefined || tier >= 3) return false; 
    var suffix = SI_SYMBOL[tier];
    var scale = Math.pow(10, tier * 3);

    // scale the number
    var scaled = number / scale;

    // format number and add suffix
    return scaled.toFixed(1) + suffix;
}
const compare = ( a, b ) => {
  if ( a.epoch > b.epoch ){
    return -1;
  }
  if ( a.epoch < b.epoch ){
    return 1;
  }
  return 0;
}

let blocksPs = null
const Blocks = props => {
  const {
    blockListData,
    updateProperty
  } = props

  const [symbolFilters, setSymbolFilters] = useState([])
  const [sizeFilter, setSizeFilter] = useState(100)
  const [poolFilter, setPoolFilter] = useState('combo')

  const [showLoadMoreButton, setShowLoadMoreButton] = useState(false)
  const [isMoreResultLoading, setIsMoreResultLoading] = useState(false)

  let blocksTableWrapperRef = useRef(null),
      blockFirebaseRef = useRef(null),
      blockFirebaseSymbols = useRef([]),
      blockFirebaseSymbolsRefs = useRef([]),
      blockFirebaseLastDocument = useRef([]),
      blocksLastDocument = useRef(null),
      blockChildListener = useRef(false),
      paginationBlockListData = useRef([]),
      blockListDataRef = useRef([]),
      loopNumbers = useRef(50)

  useEffect(() => {
    if (blockFirebaseRef.current == null) {
      blockFirebaseRef.current = React.firebase.firebase.database(React.firebase.blocks)
        .ref(`/latest`)
        .orderByChild('t')
        .limitToLast(100)
    }

    if (symbolFilters.length > 0) {
      blockFirebaseSymbolsRefs.current.map(singleSymbolRef => {
        singleSymbolRef.ref.off('child_added')
      })

      blockFirebaseSymbols.current = symbolFilters

      let symbolRefs = []
      symbolFilters.map(symbolFilter => {
        symbolRefs.push({
          symbol: symbolFilter.value,
          ref: React.firebase.firebase.database(React.firebase.blocks).ref(`latestSymbols/${symbolFilter.value}`).orderByChild('t').limitToLast(100)
        })
      })
      blockFirebaseSymbolsRefs.current = symbolRefs
    } else {
      blockFirebaseSymbols.current = []
      blockFirebaseSymbolsRefs.current = []
    }

    updateProperty({blockListData: []})
    blockListDataRef.current = []
    paginationBlockListData.current = []

    getBlocksBis()

    if (blocksTableWrapperRef.current) {
      blocksPs = new PerfectScrollbar('.block-trades_table')
    }
  }, [symbolFilters, poolFilter, sizeFilter])

  useEffect(() => {
      return () => {
          blockFirebaseRef.current.off('child_added')
          blockFirebaseSymbolsRefs.current.map(singleSymbolRef => {
            singleSymbolRef.ref.off('child_added')
          })    
      }
  }, [])

  const getBlocksBis = () => {
    if (blockFirebaseSymbolsRefs.current.length > 0) {
      blockFirebaseSymbolsRefs.current.map(symbolRef => {
        symbolRef.ref.once('value', (val) => {
          postGetBlocksBis(val, true, symbolRef.symbol, symbolRef.ref)
        })
      })
    } else {
      blockFirebaseRef.current.once('value', postGetBlocksBis)
    }
  }
  const postGetBlocksBis = (val, paginateIt = false, paginateSymbol = null, paginateRef = null) => {
    let blocksData = paginateIt ? blockListDataRef.current : [],
        paginatedBlocksData = paginateIt ? paginationBlockListData.current : []

    val.forEach(function(childSnapshot) {
      const blockData = childSnapshot.val()
      const utcTimeTick = moment(+blockData.t).tz('America/New_York').format('HH:mm MMMM DD, YYYY')
      const blockValue = kmFormatter(Number(blockData.S) * Number(blockData.P))

      paginatedBlocksData.push({
        symbol: blockData.Sy,
        epoch: blockData.t,
        key: childSnapshot.key
      })

      if (blockValue) {
          if (poolFilter !== 'combo') {
            if (poolFilter == 'dark' && !blockData.D) return
            if (poolFilter == 'regular' && blockData.D) return
          }

          if(Number(blockData.S) < ( Number(sizeFilter) * 1000 ) ) return

          // if (symbolFilters.length > 0) {
          //   let filterSymbols = symbolFilters.map(Sy => {
          //     return Sy.value
          //   })
            
          //   if (!filterSymbols.find(SyElement => SyElement == blockData.Sy)) return
          // }

          blocksData.push({
              symbol: blockData.Sy,
              dark_pool: blockData.D,
              size: kmFormatter(Number(blockData.S)),
              price: Number(blockData.P).toFixed(2),
              value: blockValue,
              time: utcTimeTick,
              epoch: +blockData.t,
              _classes: blockData.D ? 'dark-pool_row' : '',
              key: childSnapshot.key
          })
      }
    })

    blocksData = Array.from(new Set(blocksData.map(JSON.stringify))).map(JSON.parse)
    paginatedBlocksData = Array.from(new Set(paginatedBlocksData.map(JSON.stringify))).map(JSON.parse)

    const sortedBlocksData = blocksData.sort( compare )
    const sortedPaginatedBlocksData = paginatedBlocksData.sort( compare )
    updateProperty({blockListData: sortedBlocksData})
    if (paginateSymbol == null) {
      blocksLastDocument.current = sortedPaginatedBlocksData.slice(-1)[0].epoch

      blockFirebaseRef.current.off('child_added')
      blockFirebaseRef.current.on('child_added', postGetBlockBis)
    } else {
      blockFirebaseLastDocument.current[paginateSymbol] = sortedPaginatedBlocksData.slice(-1)[0].epoch

      paginateRef.off('child_added')
      paginateRef.on('child_added', postGetBlockBis)
    }
    
    paginationBlockListData.current = sortedPaginatedBlocksData
    blockListDataRef.current = sortedBlocksData

    setShowLoadMoreButton(true)
    setIsMoreResultLoading(false)
  }

  const postGetBlockBis = (val) => {
    const childExists = paginationBlockListData.current.some(blockChild => {
      return blockChild.key == val.key
    })

    if (childExists) return

    const blockData = val.val()
    const utcTimeTick = moment(+blockData.t).tz('America/New_York').format('HH:mm MMMM DD, YYYY')
    const blockValue = kmFormatter(Number(blockData.S) * Number(blockData.P))

    if (blockValue) {
      let blocksData = blockListDataRef.current
      
      if (poolFilter !== 'combo') {
        if (poolFilter == 'dark' && !blockData.D) return
        if (poolFilter == 'regular' && blockData.D) return
      }

      if(Number(blockData.S) < ( Number(sizeFilter) * 1000 ) ) return

      // if (symbolFilters.length > 0) {
      //   let filterSymbols = symbolFilters.map(Sy => {
      //     return Sy.value
      //   })
        
      //   if (!filterSymbols.find(SyElement => SyElement == blockData.Sy)) return
      // }

      blocksData.push({
          symbol: blockData.Sy,
          dark_pool: blockData.D,
          size: kmFormatter(Number(blockData.S)),
          price: Number(blockData.P).toFixed(2),
          value: blockValue,
          time: utcTimeTick,
          epoch: +blockData.t,
          _classes: blockData.D ? 'dark-pool_row' : ''
      })

      updateProperty({blockListData: blocksData.sort( compare )})
      blockListDataRef.current = blocksData.sort( compare )
    }
  }

  const paginateBis = () => {
    setIsMoreResultLoading(true)
    if (blockFirebaseSymbolsRefs.current.length > 0) {
      blockFirebaseSymbolsRefs.current.map(symbolRef => {
        symbolRef.ref.endBefore(blockFirebaseLastDocument.current[symbolRef.symbol])
          .once('value', (val) => {
            postGetBlocksBis(val, true, symbolRef.symbol, symbolRef.ref)
          })
      })
    } else {
      blockFirebaseRef.current.endBefore(blocksLastDocument.current)
      .once('value', (val) => {
        postGetBlocksBis(val, true)
      })
    }
  }

  const filterResults = (filterSymbols) => {
    // console.log(filterSymbols)
    // updateProperty({blockListData: []})
    // setSymbolFilters(filterSymbols)
    // getBlocks()
    // do {
    //   console.log(blockListData.length)
    //   paginate()
    // } while (blockListData.length < 100)
  }

  const fields = [
    { key: 'symbol', label: 'Symbol', _style: { width: '20%' } },
    { key: 'dark_pool', label: 'Dark Pool', _style: { width: '15%' } },
    { key: 'size', label: 'Size', _style: { width: '20%' } },
    { key: 'price', label: 'Price', _style: { width: '10%' } },
    { key: 'value', label: 'Value', _style: { width: '10%' } },
    { key: 'time', label: 'Time', _style: { width: '25%' } }
  ]

  const getBadge = (status)=>{
    switch (status) {
      case 'size': return 'warning'
      case 'price': return 'success'
      case 'value': return 'danger'
      default: return 'primary'
    }
  }

  return (
    <CCardBody innerRef={blocksTableWrapperRef} className='block-trades_table'>
      <CDataTable
        items={blockListData}
        fields={fields}
        columnFilter
        striped
        hover
        sorter
        scopedSlots = {{
          'symbol':
            (item, index)=> {
              return (
                <td style={{fontWeight: 'bolder'}}>
                  {item.symbol}
                </td>
              )
            },
          'dark_pool':
            (item, index)=> {
              return (
                <td>
                  { item.dark_pool && 
                    <CBadge color={'info'}>
                      {'YES'}
                    </CBadge> 
                  }
                </td>
              )
            },
          'size':
            (item, index)=> {
              return (
                <td>
                  <CBadge style={{ color: '#322201', fontSize: 12}} color={getBadge('size')}>
                    {item.size}
                  </CBadge> 
                </td>
              )
            },
          'price':
            (item, index)=> {
              return (
                <td>
                  <CBadge style={{ color: '#122b1b', fontSize: 12}} color={getBadge('price')}>
                    {item.price}
                  </CBadge> 
                </td>
              )
            },
          'value':
            (item, index)=> {
              return (
                <td>
                  <CBadge style={{ color: '#330f0f', fontSize: 12}} color={getBadge('value')}>
                    {item.value}
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
            },
        }}
        columnFilterSlot = {{
          'symbol': (
            <FtAsyncSelect 
              placeholderProps={'Symbols filter'} 
              onChangeProps={setSymbolFilters}
              isMultiProps={true}
            />
          ),
          'dark_pool': (
            <CSelect 
              style={{fontWeight: 'bold', color: 'hsl(0, 0%, 50%)'}}
              custom size='sm' name='selectSm' id='SelectLm' 
              defaultValue={poolFilter}
              onChange={(e) => {
                setPoolFilter(e.target.value)
              }}>
              <option value='combo'>Combo</option>
              <option value='regular'>Regular</option>
              <option value='dark'>Dark</option>
            </CSelect>
          ),
          'size': (
            <div className='size-slider pl-3 pr-3'>
              <Slider
                min={0}
                max={1000}
                value={sizeFilter}
                step={500}
                labels={{
                  100: '+100K',
                  500: '+500K',
                  1000: '+1M'
                }}
                onChange={setSizeFilter}
                tooltip={false}
              />
            </div>
          ),
          'price': (<div></div>),
          'value': (<div></div>),
          'time': (<div></div>)
        }}
      />
      <div className='d-flex justify-content-center'>
        {showLoadMoreButton && <CButton 
        onClick={() => {
          paginateBis()
        }}
        className='font-weight-bold' style={{width: '35%'}} shape='pill' color='primary'
        disabled={isMoreResultLoading}
        >
          {isMoreResultLoading ? 'Loading ...' : 'Load More'}
        </CButton>}
      </div>
    </CCardBody>
  )
}

const mapStateToProps = (state) => {
  return {
    blockListData: state.charts.blockListData
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    updateProperty: (property) => dispatch(updateProperty(property))
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Blocks)