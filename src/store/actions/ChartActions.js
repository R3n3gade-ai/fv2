import uniqid from 'uniqid'
import {
	deleteInteractiveNodes
} from "../../views/charts/Utils/InteractiveUtils"

export const EditWatchList = (brandSymbol) => {
  return (dispatch, getState, {getFirebase}) => {
    const firebase = getFirebase()
    const authorId = getState().firebase.auth.uid
    const watchListElements = getState().charts.watchList
    const watchListChanged = getState().charts.watchListChanged
    const watchIndex = watchListElements.findIndex((watchedElement) => {
      return watchedElement.symbol == brandSymbol
    })

    if (watchIndex >= 0) {
        firebase
            .database()
            .ref('mySymbols/' + authorId + '/' + brandSymbol)
            .remove()
            .then(() => {
                watchListElements.splice(watchIndex, 1)
                dispatch({ type: 'set', watchList: watchListElements, watchListChanged:!watchListChanged })
            }).catch((err) => {

            })
    } else {
      firebase
        .database()
        .ref('mySymbols/' + authorId + '/' + brandSymbol)
        .set({
          name: brandSymbol,
        }).then(() => {
            dispatch({ type: 'set', watchListChanged:!watchListChanged })
        }).catch((err) => {

        })
    }
  }
}

export const EditMarket = (brandSymbol, brandUid, removeBrand, additionalSettings = {}) => {
  return (dispatch, getState, {getFirebase}) => {
    const firebase = getFirebase()
    const authorId = getState().firebase.auth.uid

    let currentCharts = getState().charts.charts,
        currentIndice = currentCharts.length < 4 ? 0 : 10000,
        currentOperation = currentIndice == 0 ? 'push' : 'edit',
        syncChartSettings = getState().charts.syncChartSettings,
        brandsModelShow = getState().charts.brandsModelShow,
        updateTheCharts = getState().charts.updateTheCharts,
        currentExistingCharts = getState().charts.existingCharts,
        selectedChart = getState().charts.selectedChart,
        sameChartSettings = {}

    if (selectedChart !== null) {
      currentOperation = 'edit'
      currentCharts.map(currentChart => {
        if (currentChart.chartUid == selectedChart) {
          currentIndice = currentChart.chartSettings.chartDbIndex
          sameChartSettings = {
            periodicity: currentChart.chartSettings.periodicity,
            flowIndex: currentChart.chartSettings.flowIndex
          }
        }
      })
    } else {
      if (currentIndice == 0) {
        currentCharts.map(currentChart => {
          if (currentChart.chartSettings.chartDbIndex > currentIndice) {
            currentIndice = currentChart.chartSettings.chartDbIndex
          }
        })
      } else {
        currentCharts.map(currentChart => {
          if (currentChart.chartSettings.chartDbIndex < currentIndice) {
            currentIndice = currentChart.chartSettings.chartDbIndex
          }
        })
      }
    }

    if (removeBrand) {
      let chartSettingIndex = currentCharts.findIndex(chartSet => {
            return chartSet.chartUid === brandUid
          })

      firebase
        .database()
        .ref('favoritesv2/' + authorId + '/' + currentCharts[chartSettingIndex].chartSettings.chartDbIndex)
        .remove()
        .then(() => {
          currentCharts = currentCharts.filter((item) => item.chartUid !== brandUid)
          currentExistingCharts = currentExistingCharts.filter((item) => item !== brandUid)

          dispatch({type: 'set', charts: currentCharts, existingCharts: currentExistingCharts, updateTheCharts: !updateTheCharts})
          if (selectedChart !== null)  dispatch({type: 'set', selectedChart: null})
          deleteInteractiveNodes(brandUid)
          localStorage.removeItem(brandUid)
        }).catch((err) => {

        })
    } else {
      let addChartSettings = {
            ...syncChartSettings,
            ...additionalSettings
          },
          newBrandUid = uniqid()

      if (Object.keys(sameChartSettings).length > 0) {
        addChartSettings = {
          ...addChartSettings,
          ...sameChartSettings
        }
      }
      firebase
        .database()
        .ref('favoritesv2/' + authorId + '/' + ( currentOperation == 'push' ? currentIndice + 1 : currentIndice))
        .set({
            barSize: 1,
            gain: 0,
            vol: 0,
            value: 0,
            name: brandSymbol,
            uid: newBrandUid,
            chartSettings: addChartSettings
        }).then(() => {
          dispatch({type: 'set', brandsModelShow: false})
          if (selectedChart !== null)  dispatch({type: 'set', selectedChart: newBrandUid})
        }).catch((err) => {

        })
    }
  }
}

export const SetChartSettings = (
  newChartSettings, 
  chartUid, 
  resetChartData,
  synchronizeChart,
  synchronizeChartOnly = false,
  saveDefault = false
) => {
  return (dispatch, getState, {getFirebase}) => {
    const firebase = getFirebase()
    const authorId = getState().firebase.auth.uid

    if (typeof chartUid == typeof undefined) return
    
    let charts = getState().charts.charts,
        currentCharts = charts,
        chartSettingIndex = currentCharts.findIndex(chartSet => {
          return chartSet.chartUid === chartUid
        }),
        currentChartSettings = getState().charts.currentChartSettings,
        updateTheCharts = getState().charts.updateTheCharts,
        fullScreenBrand = getState().charts.fullScreenBrand

    currentCharts[chartSettingIndex].chartSettings = {
      ...currentCharts[chartSettingIndex].chartSettings,
      ...newChartSettings        
    }

    if (resetChartData) {
      currentCharts[chartSettingIndex] = {
        ...currentCharts[chartSettingIndex],
        ...{
          chartData: [],
          chartSettings: {
            ...currentCharts[chartSettingIndex].chartSettings,
            ...{
              blocks: null,
              zonesDivergence: null
            }
          }
        }
      }
    }

    if (saveDefault) {
      firebase
        .database()
        .ref('defaultv2/' + authorId + '/')
        .set({
          showGrid: newChartSettings.showGrid || currentCharts[chartSettingIndex].chartSettings.showGrid,
          priceBarsColor: newChartSettings.priceBarsColor || currentCharts[chartSettingIndex].chartSettings.priceBarsColor,
          flowIndexColor: newChartSettings.flowIndexColor || currentCharts[chartSettingIndex].chartSettings.flowIndexColor,
          flowIndexAvgColor: newChartSettings.flowIndexAvgColor || currentCharts[chartSettingIndex].chartSettings.flowIndexAvgColor,
          flowDarkIndexColor: newChartSettings.flowDarkIndexColor || currentCharts[chartSettingIndex].chartSettings.flowDarkIndexColor,
          flowBothIndexColor: newChartSettings.flowBothIndexColor || currentCharts[chartSettingIndex].chartSettings.flowBothIndexColor,
          blockTradesDarkPoolColor: newChartSettings.blockTradesDarkPoolColor || currentCharts[chartSettingIndex].chartSettings.blockTradesDarkPoolColor,
          blockTradesRegularPoolColor: newChartSettings.blockTradesRegularPoolColor || currentCharts[chartSettingIndex].chartSettings.blockTradesRegularPoolColor,
          backgroundColor: newChartSettings.backgroundColor || currentCharts[chartSettingIndex].chartSettings.backgroundColor,
          chartType: newChartSettings.chartType || currentCharts[chartSettingIndex].chartSettings.chartType,
        }).catch((e) => {
          console.log('error saving', e)
        })
    }

    if (synchronizeChart) {
      const favoritesRef = firebase
        .database()
        .ref('favoritesv2/' + authorId + '/' + currentCharts[chartSettingIndex].chartSettings.chartDbIndex + '/chartSettings')
      
        favoritesRef.once('value', (val) => {
          favoritesRef.set({
                ...val.val(),
                ...newChartSettings
            }).catch((err) => {
              
            })
        })

        if (synchronizeChartOnly) {
          return
        }
    }

    dispatch({
      type: 'set',
      currentChartSettings: currentCharts[chartSettingIndex].chartSettings, 
      fullScreenBrand: currentCharts[chartSettingIndex],
      charts: currentCharts,
      updateTheCharts: !updateTheCharts
    })
  }
}

export const SearchSymbol = (searchInput) => {
  return (dispatch, getState, {getFirebase}) => {
    const firebase = getFirebase()

    return new Promise((resolve, reject) => {
      let searchLength = searchInput.length 
      if (searchLength == 0) {
          resolve(false)
      } else {
          let searchLetters = searchInput.toUpperCase(),
              firstSearchLetter = searchLetters.substring(0,3),
              searchMap = (searchLength > 3) ? 3 : searchLength,
              firstSearchLetterObject = firstSearchLetter.split(''),
              searchDbPath = searchLength == 1 ? firstSearchLetter : firstSearchLetterObject.join('/')

          firebase.database()
              .ref(`/symbolMap${searchMap}/${searchDbPath}`)
              .limitToFirst(100)
              .once('value', (val) => {
                  resolve(val.val())
              })
      }
    })
  }
}