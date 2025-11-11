import React, { useEffect } from "react";
import { connect } from 'react-redux'
import { SearchSymbol } from '../../../store/actions/ChartActions'

import AsyncSelect  from 'react-select/async'

import CIcon from '@coreui/icons-react'

const FtAsyncSelect = props => {
    const {
        onChangeProps,
        onInputChangeProps,
        onKeyDownProps,
        placeholderProps,
        refProps,
        isMultiProps,
        defaultMenuIsOpenProps,
        onFocusProps,
        onBlurProps,
        futuresAsync,

        defaultOptions,
        defaultFuturesOptions,
        SearchSymbol
    } = props

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
        }
    }

    const promiseOptions = (inputValue) => {
        return new Promise(async(resolve) => {
            if (inputValue == '/') resolve(defaultFuturesOptions)

            let filteredInputValue = inputValue.replace('/', '')
            const brandsSearch = await SearchSymbol(filteredInputValue, futuresAsync)
            if (brandsSearch != null) {
                let resolveValues = Object.keys(brandsSearch).map((brand, i) => {
                    return {
                        'value': brand,
                        'label': brand
                    }
                })
                resolve(resolveValues)
            } else {
                resolve([])
            }
        })
    }

    return (
        <AsyncSelect
            placeholder={placeholderProps}
            styles={customStyles}
            ref={refProps}
            name="form-field-name2"
            cacheOptions
            defaultOptions={futuresAsync ? defaultFuturesOptions : defaultOptions}
            loadOptions={promiseOptions}
            onChange={onChangeProps}
            onInputChange={onInputChangeProps}
            onKeyDown={onKeyDownProps}
            defaultMenuIsOpen={defaultMenuIsOpenProps}
            onBlur={onBlurProps}
            onFocus={onFocusProps}
            isMulti={isMultiProps}
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
    );
}

const mapStateToProps = (state) => {
    return {
        defaultOptions: 'polySymbols' in state.firebase.data ? (
            state.firebase.data.polySymbols != null ? (
                typeof state.firebase.data.polySymbols !== typeof undefined ? (
                    Object.keys(state.firebase.data.polySymbols).map(brandKey => {
                        return {
                            'value': brandKey,
                            'label': brandKey
                        }
                    })
                ) : []
            ) : []
        ) : [],
        defaultFuturesOptions: 'futuresSymbols' in state.firebase.data ? (
            state.firebase.data.futuresSymbols != null ? (
                typeof state.firebase.data.futuresSymbols !== typeof undefined ? (
                    Object.keys(state.firebase.data.futuresSymbols).map(brandKey => {
                        return {
                            'value': brandKey,
                            'label': brandKey
                        }
                    })
                ) : []
            ) : []
        ) : [],
    }
  }

const mapDispatchToProps = (dispatch) => {
  return {
    SearchSymbol: (searchInput, futuresSearch) => dispatch(SearchSymbol(searchInput, futuresSearch))
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(FtAsyncSelect)
