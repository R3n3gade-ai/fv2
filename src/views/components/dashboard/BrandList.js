import React, { useRef, useEffect, useState, useReducer } from "react";
import { compose } from 'redux'
import { connect } from 'react-redux'
import { firebaseConnect } from 'react-redux-firebase'
import { updateProperty } from '../../../store/actions/StylesActions'
import { EditMarket, SearchSymbol } from '../../../store/actions/ChartActions'
import {
  CCol,
  CCard,
  CCardBody,
  CLink,
  CInput
} from '@coreui/react'
import CIcon from '@coreui/icons-react'

const BrandList = props => {
    const {
        brands,
        brandsModelShow,
        existingCharts,
        updateProperty,
        EditMarket,
        SearchSymbol
    } = props

    const searchInputRef = useRef(null)
    const parentSearchInputRef = useRef(null)

    const [searchBrands, setSearchBrands] = useState([])

    const [ignored, forceUpdate] = useReducer(x => x + 1, 0)

    useEffect(() => {
        window.addEventListener("keyup", onKeyPress)

        if (!brandsModelShow) {
            searchInputRef.current.value = ''
            setSearchBrands(brands)
        }
        
        return () => {
            window.removeEventListener("keyup", onKeyPress)
        }
    }, [brandsModelShow, brands, searchBrands])

	const onKeyPress = async(event) => {
		const keyCode = event.which;
        if (brandsModelShow && keyCode == 13) {
            const getSymbolValue = new Promise(resolve => {
                let searchInputValue = searchInputRef.current.value.toUpperCase(),
                    searchSymbolExists = Object.keys(searchBrands).includes(searchInputValue),
                    finalSymbol = ( searchInputValue == '' || !searchSymbolExists ) ? Object.keys(searchBrands)[0] : searchInputValue

                resolve(finalSymbol)
            })

            const finalSymbol = await getSymbolValue
            EditMarket(finalSymbol, existingCharts.includes(finalSymbol))
        }
	}

    return (
        <>
            <CCol key={'searchBrandList'} xs="12" sm="12" md="12" className="p-0 mb-1">
                <CCard className="m-0">
                    <CCardBody innerRef={parentSearchInputRef} className="d-flex align-items-center p-0 justify-content-between">
                        <CInput
                            innerRef={searchInputRef}
                            type="text"
                            id="searchSymbols"
                            name="search-symbols"
                            placeholder="Search Symbol"
                            onChange={async(e) => {
                                const brandsSearch = await SearchSymbol(e.target.value)
                                setSearchBrands(
                                    brandsSearch !== false ? brandsSearch : brands
                                )
                            }}
                        />
                    </CCardBody>
                </CCard>
            </CCol>
            {Object.keys(searchBrands).map((brand, i) => {
                return <CCol key={i} xs="12" sm="12" md="12" className="p-0 mb-1">
                    <CCard className="m-0">
                        <CCardBody className="d-flex align-items-center p-0 justify-content-between">
                            <div className="d-flex align-items-center p-3">
                            <div>
                                <div className="text-value text-info">
                                    {brand}
                                </div>
                                {/* <div className="text-muted text-uppercase font-weight-bold small">
                                    {brand.brandName}
                                </div> */}
                            </div>
                            </div>
                            <div className="mr-3 text-info">
                                <CLink
                                onClick={() => EditMarket(brand, existingCharts.includes(brand)) }>
                                    <CIcon
                                        name={existingCharts.includes(brand) ? 'cis-check-circle' : 'cil-plus-circle'}
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

const mapStateToProps = (state) => {
  return {
    brands: 'symbolMap1' in state.firebase.data ? state.firebase.data.symbolMap1.A : [],
    brandsModelShow: state.charts.brandsModelShow,
    existingCharts: state.charts.existingCharts
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    updateProperty: (property) => dispatch(updateProperty(property)),
    EditMarket: (brandSymbol, removeBrand) => dispatch(EditMarket(brandSymbol, removeBrand)),
    SearchSymbol: (searchInput) => dispatch(SearchSymbol(searchInput))
  }
}

export default compose(
    connect(
        mapStateToProps,
        mapDispatchToProps
    ),
    firebaseConnect((props) => ([
        `symbolMap1/A#limitToFirst=100`
    ]))
)(BrandList)