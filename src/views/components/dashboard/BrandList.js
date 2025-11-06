import React, { useRef, useEffect, useState } from "react";
import { connect } from 'react-redux'

import SubBrandList from './SubBrandList'

import {
  CCol,
  CCard,
  CCardBody,
  CLink,
  CInput,

  CNav,
  CNavLink
} from '@coreui/react'
import CIcon from '@coreui/icons-react'

const BrandList = props => {
    const {
        brandsModelShow,
        existingCharts
    } = props

    const searchInputRef = useRef(null)
    const parentSearchInputRef = useRef(null)

    const [showRipple, setShowRipple] = useState(false)

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSecurity, setSelectedSecurity] = useState('stocks');

    useEffect(() => {
        if (searchInputRef.current != null && brandsModelShow) {
            setTimeout(function() { 
                document.querySelector('#searchSymbols').focus()
             }, 500)
        }

        if (!brandsModelShow) {
            searchInputRef.current.value = ''
            // setSearchBrands(brands)
        }
    }, [brandsModelShow])

    return (
        <>
            {showRipple && <div className='c-custom_loader'>
                <div className='lds-ripple'><div></div><div></div></div>
            </div>}
            <CCol key={'searchBrandList'} xs="12" sm="12" md="12" className="p-0 mb-1">
                <CCard className="m-0">
                    <CCardBody innerRef={parentSearchInputRef} className="d-flex align-items-center p-0 justify-content-between">
                        <CInput
                            innerRef={searchInputRef}
                            type="text"
                            id="searchSymbols"
                            name="search-symbols"
                            placeholder="Search Symbol"
                            onChange={(e) => {
                                setSearchQuery(e.target.value)
                            }}
                        />
                    </CCardBody>
                </CCard>
            </CCol>
            <CCol key={'securityType'} xs="12" sm="12" md="12" className="p-0 mb-1">
                <CCard className="m-0">
                    <CCardBody className="d-flex align-items-center pr-0 pl-0 pb-1 pt-1 justify-content-between">
                        <CNav component="nav" variant="pills" className="flex-column flex-sm-row">
                            <CNavLink 
                                className='security-type_navlink font-weight-bold'
                                href='#' 
                                active={selectedSecurity === 'stocks'}
                                onClick={() => {
                                    searchInputRef.current.value = ''
                                    setSearchQuery('')
                                    setSelectedSecurity('stocks')
                                    document.querySelector('#searchSymbols').focus()
                                }}>
                                Equities
                            </CNavLink>
                            <CNavLink 
                               className='security-type_navlink font-weight-bold'
                               href='#' 
                                active={selectedSecurity === 'futures'}
                                onClick={() => {
                                    searchInputRef.current.value = ''
                                    setSearchQuery('')
                                    setSelectedSecurity('futures')
                                    document.querySelector('#searchSymbols').focus()
                                }}>
                                Futures
                            </CNavLink>
                        </CNav>
                    </CCardBody>
                </CCard>
            </CCol>
            <SubBrandList searchQuery={searchQuery} selectedSecurity={selectedSecurity} />
        </>
    );
}

const mapStateToProps = (state) => {
  return {
    brandsModelShow: state.charts.brandsModelShow,
    existingCharts: state.charts.existingCharts
  }
}

export default connect(
    mapStateToProps,
    null
)(BrandList)