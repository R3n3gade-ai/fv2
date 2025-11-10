import React, { useEffect, useRef } from "react";
import { connect } from 'react-redux'

import { EditMarket } from '../../../store/actions/ChartActions'
import { updateProperty } from '../../../store/actions/StylesActions'

import {
  CCol,
  CCard,
  CCardBody,
  CLink
} from '@coreui/react'
import CIcon from '@coreui/icons-react'

const SubBrandList = props => {
    const {
        brands,
        searchQuery,
        selectedSecurity,

        EditMarket,
        updateProperty
    } = props

    const addedEventRef = useRef(false)
    const searchQueryRef = useRef(null)
    const selectedSecurityRef = useRef('stocks')
    const brandsRef = useRef([])

    useEffect(() => {
        if (!addedEventRef.current) {
            addedEventRef.current = true
            window.addEventListener('keyup', onKeyPress)
        }

        selectedSecurityRef.current = selectedSecurity
        searchQueryRef.current = searchQuery
    }, [searchQuery, selectedSecurity])

    useEffect(() => {
        brandsRef.current = brands
    }, [brands])

    useEffect(() => {
        return () => {
            updateProperty({disableEvent: false})

            window.removeEventListener('keyup', onKeyPress)
            addedEventRef.current = false
        }
    }, [])

    const onKeyPress = async(event) => {
		const keyCode = event.which
        if (keyCode == 13) {
            if (searchQueryRef.current !== null) {
                let searchInputValue = searchQueryRef.current.toUpperCase()
                if (searchInputValue in brandsRef.current) {
                    EditMarket(searchInputValue, 0, false, {
                        securityType: selectedSecurityRef.current
                    })
                }
            }
        }
	}

    return (
        <>
            {Object.keys(brands).map((brandKey, i) => {
                return <CCol key={i} xs="12" sm="12" md="12" className="p-0 mb-1">
                    <CCard className="m-0">
                        <CCardBody className="d-flex align-items-center p-0 justify-content-between">
                            <div className="d-flex align-items-center p-3">
                            <div>
                                <div className="text-value text-info">
                                    {brandKey}
                                </div>
                                <div className="text-muted text-uppercase font-italic small">
                                    {brands[brandKey]}
                                </div>
                            </div>
                            </div>
                            <div className="mr-3 text-info">
                                <CLink
                                onClick={() => EditMarket(brandKey, 0, false, {
                                    securityType: selectedSecurityRef.current
                                }) }>
                                    <CIcon
                                        name={'cil-plus-circle'}
                                        size={'2xl'}
                                    />
                                </CLink>
                            </div>
                        </CCardBody>
                    </CCard>
                </CCol>
            })}
        </>
    );
}

const mapStateToProps = (state, mapProps) => {
    let brandSymbols = []
    if (mapProps.selectedSecurity == 'stocks') {
        brandSymbols = 'polySymbols' in state.firebase.data ? (
            state.firebase.data.polySymbols != null ? state.firebase.data.polySymbols : []
        ) : []
    } else {
        brandSymbols = 'futuresSymbols' in state.firebase.data ? (
            state.firebase.data.futuresSymbols != null ? state.firebase.data.futuresSymbols : []
        ) : []
    }

    return {
        brands: brandSymbols
    }
  }

const mapDispatchToProps = (dispatch) => {
  return {
    updateProperty: (property) => dispatch(updateProperty(property)),
    EditMarket: (brandSymbol, brandUid, removeBrand, additionalSettings) => dispatch(EditMarket(brandSymbol, brandUid, removeBrand, additionalSettings))
  }
}

export default compose(
    connect(
        mapStateToProps,
        mapDispatchToProps
    ),
    firebaseConnect((props) => {
        if (props.searchQuery != '') {
            if (props.selectedSecurity == 'stocks') {
                return ([
                    { path: '/polySymbols', queryParams: [
                        'orderByKey',
                        'limitToFirst=100',
                        'startAt=' + (props.searchQuery).toUpperCase(),
                        'endAt=' + (props.searchQuery).toUpperCase() + "\uf8ff"
                    ] }
                ])
            } else {
                return ([
                    { path: '/futuresSymbols', queryParams: [
                        'orderByKey',
                        'limitToFirst=100',
                        'startAt=' + (props.searchQuery).toUpperCase(),
                        'endAt=' + (props.searchQuery).toUpperCase() + "\uf8ff"
                    ] }
                ])
            }
        } else {
            if (props.selectedSecurity == 'stocks') {
                return ([
                    { path: '/polySymbols', queryParams: [
                        'orderByKey',
                        'limitToFirst=100'
                    ] }
                ])
            } else {
                return ([
                    { path: '/futuresSymbols', queryParams: [
                        'orderByKey',
                        'limitToFirst=100'
                    ] }
                ])
            }
        }
    })
)(SubBrandList)