import React, { useEffect, useState, useRef } from 'react'
import { compose } from 'redux'
import { connect } from 'react-redux'
import { firebaseConnect } from 'react-redux-firebase'
import { updateProperty } from '../../store/actions/StylesActions'
import { SearchSymbol } from '../../store/actions/ChartActions'
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
import AsyncSelect  from 'react-select/async'
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
    brands,
    blockListData,
    updateProperty,
    SearchSymbol
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
        .orderByKey()
        .limitToLast(100)
    }

    if (symbolFilters.length > 0) {
      blockFirebaseSymbols.current = symbolFilters

      let symbolRefs = []
      symbolFilters.map(symbolFilter => {
        symbolRefs.push({
          symbol: symbolFilter.value,
          ref: React.firebase.firebase.database(React.firebase.blocks).ref(`/Symbol/e${symbolFilter.value}`).orderByKey().limitToLast(100)
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

    // let loopPagination = symbolFilters.length > 0 || sizeFilter > 100 || poolFilter != 'combo'
    // getBlocks(loopPagination)

    getBlocks()

    if (blocksTableWrapperRef.current) {
      blocksPs = new PerfectScrollbar('.block-trades_table')
    }
  }, [symbolFilters, sizeFilter, poolFilter])

    useEffect(() => {
        return () => {
            blockFirebaseRef.current.off('child_added', postGetBlock)
        }
    }, [])

  // const getBlocks = (loopPagination = false) => {
  //   blockFirebaseRef.current.once('value', (val) => {
  //     postGetBlocks(val, false, loopPagination)
  //   })
  // }

  const getBlocks = () => {
    if (blockFirebaseSymbolsRefs.current.length > 0) {
      blockFirebaseSymbolsRefs.current.map(symbolRef => {
        symbolRef.ref.once('value', (val) => {
          postGetBlocks(val, true, symbolRef.symbol)
        })
      })
    } else {
      blockFirebaseRef.current.once('value', postGetBlocks)
    }
  }

  const postGetBlocks = (val, paginateIt = false, paginateSymbol = null, loopPagination = false) => {
    let blocksData = paginateIt ? blockListDataRef.current : [],
        paginatedBlocksData = paginateIt ? paginationBlockListData.current : []

    val.forEach(function(childSnapshot) {
      const blockData = childSnapshot.val()
      const utcTimeTick = moment.utc(+blockData.t).format('HH:mm MMMM DD, YYYY')
      const blockValue = kmFormatter(Number(blockData.S) * Number(blockData.P))

      paginatedBlocksData.push({
        symbol: blockData.Sy.substring(1),
        epoch: +blockData.t,
        key: childSnapshot.key
      })

      if (blockValue) {
          if (poolFilter !== 'combo') {
            if (poolFilter == 'dark' && !blockData.D) return
            if (poolFilter == 'regular' && blockData.D) return
          }

          if(Number(blockData.S) < ( Number(sizeFilter) * 1000 ) ) return

          if (symbolFilters.length > 0) {
            let filterSymbols = symbolFilters.map(Sy => {
              return Sy.value
            })
            
            if (!filterSymbols.find(SyElement => SyElement == blockData.Sy.substring(1))) return
          }

          blocksData.push({
              symbol: blockData.Sy.substring(1),
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
      blocksLastDocument.current = sortedPaginatedBlocksData.slice(-1)[0].key
    } else {
      blockFirebaseLastDocument.current[paginateSymbol] = sortedPaginatedBlocksData.slice(-1)[0].key
    }
    
    paginationBlockListData.current = sortedPaginatedBlocksData
    blockListDataRef.current = sortedBlocksData

    setShowLoadMoreButton(true)
    setIsMoreResultLoading(false)

    if (!blockChildListener.current) {
      blockChildListener.current = true
      blockFirebaseRef.current.on('child_added', postGetBlock)
    }
    
    // if (loopPagination && loopNumbers.current > 0) {
    //   loopNumbers.current = loopNumbers.current - 1
    //   paginate(true)
    // } else {
    //   loopNumbers.current = 100
    // }
  }

  const postGetBlock = (val) => {
    const childExists = paginationBlockListData.current.some(blockChild => {
      return blockChild.key == val.key
    })

    if (childExists) return

    const blockData = val.val()
    const utcTimeTick = moment.utc(+blockData.t).format('HH:mm MMMM DD, YYYY')
    const blockValue = kmFormatter(Number(blockData.S) * Number(blockData.P))

    if (blockValue) {
      let blocksData = blockListDataRef.current
      
      if (poolFilter !== 'combo') {
        if (poolFilter == 'dark' && !blockData.D) return
        if (poolFilter == 'regular' && blockData.D) return
      }

      if(Number(blockData.S) < ( Number(sizeFilter) * 1000 ) ) return

      if (symbolFilters.length > 0) {
        let filterSymbols = symbolFilters.map(Sy => {
          return Sy.value
        })
        
        if (!filterSymbols.find(SyElement => SyElement == blockData.Sy.substring(1))) return
      }

      blocksData.push({
          symbol: blockData.Sy.substring(1),
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

  const paginate = (loopPagination = false) => {
    setIsMoreResultLoading(true)
    if (blockFirebaseSymbolsRefs.current.length > 0) {
      blockFirebaseSymbolsRefs.current.map(symbolRef => {
        symbolRef.ref.endBefore(blockFirebaseLastDocument.current[symbolRef.symbol])
          .once('value', (val) => {
            postGetBlocks(val, true, symbolRef.symbol)
          })
      })
    } else {
      blockFirebaseRef.current.endBefore(blocksLastDocument.current)
        .once('value', (val) => {
          postGetBlocks(val, true)
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

  const customStyles = {
    container:  (provided, state) => ({
      ...provided,
      padding: '0',
      border: '0',
      fontSize: '0.76563rem',
      lineHeight: 1.5,
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
        //tableFilter
        //cleaner
        //itemsPerPageSelect
        //itemsPerPage={5}
        hover
        sorter
        //pagination
        //loading
        // onRowClick={(item,index,col,e) => console.log(item,index,col,e)}
        // onPageChange={(val) => console.log('new page:', val)}
        // onPagesChange={(val) => console.log('new pages:', val)}
        // onPaginationChange={(val) => console.log('new pagination:', val)}
        // onFilteredItemsChange={(val) => console.log('new filtered items:', val)}
        // onSorterValueChange={(val) => console.log('new sorter value:', val)}
        // onTableFilterChange={(val) => console.log('new table filter:', val)}
        // onColumnFilterChange={(val) => console.log('new column filter:', val)}
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
            <AsyncSelect
              styles={customStyles}
              name="form-field-name2"
              cacheOptions
              defaultOptions={defaultSymbolOptions}
              loadOptions={promiseOptions}
              onChange={setSymbolFilters}
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
          paginate()
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
    brands: 'symbolMap1' in state.firebase.data ? state.firebase.data.symbolMap1.A : [],
    blockListData: state.charts.blockListData
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    updateProperty: (property) => dispatch(updateProperty(property)),
    SearchSymbol: (searchInput) => dispatch(SearchSymbol(searchInput))
  }
}

export default compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  ),
  firebaseConnect((props) => ([
      `scansTest#limitToLast=1`,
      `symbolMap1/A#limitToFirst=100`
  ]))
)(Blocks)