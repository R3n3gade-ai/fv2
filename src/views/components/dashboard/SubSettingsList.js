import React, { useState, useEffect, useReducer } from "react";
import { connect } from 'react-redux'
import { updateProperty } from '../../../store/actions/StylesActions'
import { SetChartSettings } from '../../../store/actions/ChartActions'

import { SketchPicker } from 'react-color'
import {
  CListGroupItem,

  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
  CDropdownItem,

  CSwitch
} from '@coreui/react'
import CIcon from '@coreui/icons-react'

const SubSettingsList = props => {
    const {
        settingType,
        settingTitle,
        settingId,
        settingAttribute,
        settingApplyToAll,

        currentChartSettings,
        settingsModelShow,
        charts,
        updateTheCharts,
        applyToAllChart,
        updateProperty,
        SetChartSettings
    } = props;

    const [showColorPicker, setShowColorPicker] = useState([])

    const [ignored, forceUpdate] = useReducer(x => x + 1, 0)

    useEffect(() => {
      let showColorPickerObject = []
      settingAttribute.map((setting, i) => {
        if (setting.colors) {
          showColorPickerObject[i] = false
        }
      })

      setShowColorPicker(showColorPickerObject)
    }, [])

    const changeCurrentSetting = (setting, closeModal, theSettingId, synchronizeSetting = true) => {
      let chartSetting = [];
      const editedCharts = applyToAllChart ? charts.length : 1;

      if (applyToAllChart) {
        charts.map(chartSet => {
            chartSetting.push(chartSet);
        })
      } else {
        chartSetting = charts.filter(chartSet => {
            return chartSet.chartSymbol === currentChartSettings.chartSymbol
        })
      }

      for (var j = 0; j < editedCharts; j++) {
        let loopChartSymbol = applyToAllChart ? chartSetting[j].chartUid : currentChartSettings.chartUid
        if (typeof setting.id === 'object') {
          SetChartSettings({
              ...setting.id,
              ...{
                chartSymbol: loopChartSymbol
              }
          }, loopChartSymbol, false, synchronizeSetting, false, applyToAllChart)
        } else {
          SetChartSettings({
              ...{
                [theSettingId]: setting.id
              },
              ...{
                chartSymbol: loopChartSymbol
              }
          }, loopChartSymbol, false, synchronizeSetting, false, applyToAllChart)
        }
      }

      if (closeModal) {
        updateProperty({settingsModelShow: !settingsModelShow})
      }
    }

    return (
        <>
          <CListGroupItem className='h5 mb-0 d-flex flex-direction-row align-items-center justify-content-between'>
            <div>
              {settingTitle}
            </div>
            {/* { settingApplyToAll && 
              <div>
                <CSwitch
                  className=""
                  color="info"
                  checked={applyToAllChart || false}
                  shape="pill"
                  variant="opposite"
                  labelOn="ALL"
                  labelOff="ONE"
                  onChange={() => updateProperty({applyToAllChart: !applyToAllChart})}
                />
              </div>} */}
          </CListGroupItem>
          {settingType == 'multiple' &&
            settingAttribute.map((setting, i) => {
              return <CListGroupItem key={i} action active={(currentChartSettings[settingId] == setting.id)} className='pl-5 custom-active mb-0'
                  onClick={() => changeCurrentSetting(setting, false, settingId)}>
                  {setting.name} <i className='cis-check-alt'></i></CListGroupItem>
            })
          }
          {settingType == 'simple' && 
            settingAttribute.map((setting, i) => {
              return <CListGroupItem key={i} action className='h5 mb-0 d-flex flex-direction-row align-items-center justify-content-between'>
                  <div onClick={() => {
                    setting.onClick ? changeCurrentSetting(setting, true, settingId, false) : undefined
                  }} style={{
                    cursor: setting.onClick ? 'pointer' : 'default'
                  }}>
                    {setting.icon && 
                    <CIcon
                        className='pr-2'
                        src={React.icons.Tools[setting.icon]}
                        height={25}
                    />}
                    {setting.name}
                    {setting.shortCode &&
                      <small className='font-italic text-muted'>{' ( ' + setting.shortCode + ' )'}</small>
                    }
                  </div>
                  { setting.options &&
                    <div>
                      <CDropdown className="btn-group card-header-action pl-1 pr-1">
                        <CDropdownToggle color="primary" size="sm" className='font-weight-bold'>
                          {setting.value}
                        </CDropdownToggle>
                        <CDropdownMenu placement="right">
                          {
                            setting.options.map((option, u) => {
                              return <CDropdownItem key={u} onClick={() => changeCurrentSetting(
                                option, false, setting.id
                              )} active={option.id == setting.value}>{option.name}</CDropdownItem>
                            })
                          }
                        </CDropdownMenu>
                      </CDropdown>
                    </div>
                  }
                  { setting.switch &&
                    <div className="card-header-action pl-1 pr-1">
                      <CSwitch
                        className=""
                        color="info"
                        checked={setting.value || false}
                        shape="pill"
                        variant="3d"
                        onChange={() => {
                          changeCurrentSetting(
                            {
                              id: !setting.value
                            }, false, setting.id
                          )
                        }}
                      />
                    </div>
                  }
                  { setting.colors &&
                    <div>
                      <div style={ {
                        padding: '5px',
                        background: '#fff',
                        borderRadius: '1px',
                        boxShadow: '0 0 0 1px rgba(0,0,0,.1)',
                        display: 'inline-block',
                        cursor: 'pointer',
                      } } onClick={ () => {
                          let currentShowColorPicker = showColorPicker
                          currentShowColorPicker[i] = !showColorPicker[i]
                          setShowColorPicker(currentShowColorPicker)
                          forceUpdate()
                      } }>
                        <div style={ {
                          width: '36px',
                          height: '14px',
                          borderRadius: '2px',
                          background: setting.value
                        } } />
                      </div>
                      { showColorPicker[i] && 
                        <div style={ {
                          position: 'absolute',
                          zIndex: '2',
                        } }>
                          <div style={ {
                            position: 'fixed',
                            top: '0px',
                            right: '0px',
                            bottom: '0px',
                            left: '0px',
                          } } onClick={ () => {
                            let currentShowColorPicker = showColorPicker
                            currentShowColorPicker[i] = !showColorPicker[i]
                            setShowColorPicker(currentShowColorPicker)
                            forceUpdate()
                          } }/>
                          <SketchPicker color={ setting.value } onChange={ (color) => changeCurrentSetting(
                              {
                                id: color.hex
                              }, false, ( 'colorId' in setting ) ? setting.colorId : setting.id
                            ) } />
                        </div>
                      }
                    </div>
                  }
                  </CListGroupItem>
            })
          }
        </>
    );
}

const mapStateToProps = (state) => {
  return {
    currentChartSettings: state.charts.currentChartSettings,
    settingsModelShow: state.charts.settingsModelShow,
    charts: state.charts.charts,
    updateTheCharts: state.charts.updateTheCharts,
    applyToAllChart: state.charts.applyToAllChart
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    updateProperty: (property) => dispatch(updateProperty(property)),
    SetChartSettings: (
          newChartSettings, chartUid, resetChartData, synchronizeChart, synchronizeChartOnly, saveDefault
        ) => dispatch(SetChartSettings(newChartSettings, chartUid, resetChartData, synchronizeChart, synchronizeChartOnly, saveDefault))
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(SubSettingsList);