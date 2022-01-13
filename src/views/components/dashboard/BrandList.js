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
    const [showRipple, setShowRipple] = useState(false)

    const [ignored, forceUpdate] = useReducer(x => x + 1, 0)

    useEffect(() => {
        window.addEventListener("keyup", onKeyPress)

        if (searchInputRef.current != null && brandsModelShow) {
            setTimeout(function() { 
                document.querySelector('#searchSymbols').focus()
             }, 500)
        }

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
            setShowRipple(true)
            const getSymbolValue = new Promise(async(resolve, reject) => {
                let searchInputValue = searchInputRef.current.value.toUpperCase(),
                    searchSymbolExists = Object.keys(searchBrands).includes(searchInputValue),
                    finalSymbol = !searchSymbolExists ? false : (
                        searchInputValue == '' ? Object.keys(searchBrands)[0] : searchInputValue
                    )

                if (!finalSymbol) {
                    let finalSymbolExists = await checkDataSymbol(searchInputValue)
                    resolve(finalSymbolExists ? searchInputValue : Object.keys(searchBrands)[0])
                } else {
                    resolve(finalSymbol)
                }
            })

            const finalSymbol = await getSymbolValue
            EditMarket(finalSymbol, 0, false)
            setShowRipple(false)
        }
	}

	const checkDataSymbol = (chartKey) => {
		return new Promise((resolve, reject) => {
			let symbolDatabase = getDatabase(chartKey)
            React.firebase.firebase.database(React.firebase[symbolDatabase])
                .ref(`nanex/e${chartKey}`)
                .limitToLast(1)
                .once('value', (snapshot) => {
                    resolve(snapshot.exists())
            })
		})
	}

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
                            onChange={async(e) => {
                                const brandsSearch = await SearchSymbol(e.target.value)
                                setSearchBrands(
                                    typeof brandsSearch === 'object' && brandsSearch !== null ? brandsSearch : brands
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
                                onClick={() => EditMarket(brand, 0, false) }>
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
    EditMarket: (brandSymbol, brandUid, removeBrand) => dispatch(EditMarket(brandSymbol, brandUid, removeBrand)),
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