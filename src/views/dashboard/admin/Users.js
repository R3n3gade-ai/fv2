import React, { useEffect, useState, useRef } from 'react'
import { compose } from 'redux'
import { connect } from 'react-redux'
import { firebaseConnect } from 'react-redux-firebase'
import { updateProperty } from '../../../store/actions/StylesActions'
import { SearchSymbol } from '../../../store/actions/ChartActions'
import PerfectScrollbar from 'perfect-scrollbar'
import {
  CButton,
  CCardBody,
  CBadge,
  CDataTable,
  CSelect,
  CInput
} from '@coreui/react'

import moment from 'moment'
import AsyncSelect  from 'react-select/async'
import Slider from 'react-rangeslider'
import 'react-rangeslider/lib/index.css'

let usersPs = null
const AdminUsers = props => {
  const {
    blockListData,
    usersList,
    updateProperty,
    SearchSymbol
  } = props;

  const [symbolFilters, setSymbolFilters] = useState([])
  const [sizeFilter, setSizeFilter] = useState(100)
  const [poolFilter, setPoolFilter] = useState('combo')

  const [usersDataList, setUsersDataList] = useState([])

  const [usersLoading, setUsersLoading] = useState(true)

  const usersListTableWrapperRef  = useRef(null)

  useEffect(() => {
    // setUsersDataList(usersList)
    if (Object.keys(usersList).length > 0 && usersDataList.length == 0) {
        let mapUsersObject = []
        Object.keys(usersList).map(function(key, index) {
            if ( 
                key != 0 &&
                typeof usersList[key]['mainStatus'] != 'undefined' &&
                typeof usersList[key]['email'] != 'undefined'
            ) {
                mapUsersObject.push({
                    first_name: usersList[key]['firstName'],
                    last_name: usersList[key]['lastName'],
                    email: usersList[key]['email'],
                    status: usersList[key]['mainStatus'],
                    signup: usersList[key]['signUpTime'],
                    action: key
                })
            }
        });

        setUsersDataList(mapUsersObject)
        setUsersLoading(false)
    }

    if (usersListTableWrapperRef .current) {
      usersPs = new PerfectScrollbar('.users-list_table')
    }
  }, [usersList])

  const fields = [
    { key: 'first_name', label: 'First Name', _style: {} },
    { key: 'last_name', label: 'Last Name', _style: {} },
    { key: 'email', label: 'Email', _style: {} },
    { key: 'status', label: 'Status', _style: {} },
    { key: 'signup', label: 'SignUp', _style: {} },
    { key: 'action', label: 'Action', _style: {} }
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

  const getBadge = (status)=>{
    switch (status) {
      case 'cancelled': return 'danger'
      case 'bailed': return 'warning'
      case 'paid': return 'success'
      default: return 'primary'
    }
  }

  return (
    <CCardBody innerRef={usersListTableWrapperRef} className='users-list_table'>
      <CDataTable
        items={usersDataList}
        fields={fields}
        // columnFilter
        striped
        //tableFilter
        //cleaner
        //itemsPerPageSelect
        //itemsPerPage={5}
        hover
        sorter
        //pagination
        loading={usersLoading}
        // onRowClick={(item,index,col,e) => console.log(item,index,col,e)}
        // onPageChange={(val) => console.log('new page:', val)}
        // onPagesChange={(val) => console.log('new pages:', val)}
        // onPaginationChange={(val) => console.log('new pagination:', val)}
        // onFilteredItemsChange={(val) => console.log('new filtered items:', val)}
        // onSorterValueChange={(val) => console.log('new sorter value:', val)}
        // onTableFilterChange={(val) => console.log('new table filter:', val)}
        // onColumnFilterChange={(val) => console.log('new column filter:', val)}
        scopedSlots = {{
          'first_name':
            (item, index)=> {
              return (
                <td style={{fontWeight: 'bolder'}}>
                  {item.first_name}
                </td>
              )
            },
          'last_name':
            (item, index)=> {
              return (
                <td style={{fontWeight: 'bolder'}}>
                  {item.last_name}
                </td>
              )
            },
          'email':
            (item, index)=> {
              return (
                <td style={{fontWeight: 'bolder'}}>
                  {item.email}
                </td>
              )
            },
          'status':
            (item, index)=> {
              return (
                <td>
                  <CBadge color={getBadge(item.status.toLowerCase())}>
                    {item.status}
                  </CBadge> 
                </td>
              )
            },
          'signup':
            (item, index)=> {
              return (
                <td style={{fontWeight: 'bolder'}}>
                  {moment(item.signup).format('M/D/YYYY')}
                </td>
              )
            },
          'action':
            (item, index)=> {
              return (
                <td>
                    { item.status.toLowerCase() == 'paid' && 
                        <CButton type='button' color='danger' className='btn btn-pill btn-sm font-weight-bold mr-3' 
                        >{'Cancel'}</CButton>
                    }
                    <CButton type='button' color='primary' className='btn btn-pill btn-sm font-weight-bold mr-3' 
                    >{'Payments'}</CButton>
                </td>
              )
            },
        }}
      />
    </CCardBody>
  )
}

const mapStateToProps = (state) => {
  return {
    usersList: state.firebase.data.users || {}
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
      `users#limitToLast=100`
  ]))
)(AdminUsers)