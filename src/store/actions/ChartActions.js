import uniqid from 'uniqid'
import {
	deleteInteractiveNodes
} from "../../views/charts/Utils/InteractiveUtils"

export const EditWatchList = (brandSymbol, brandAdd = true) => {
  return (dispatch, getState, {getFirebase}) => {
    const firebase = getFirebase()
    const authorId = getState().firebase.auth.uid

    if (brandAdd) {
      firebase
        .database()
        .ref('mySymbols/' + authorId + '/' + brandSymbol)
        .set({
          name: brandSymbol,
        }).then(() => {
            // Added WatchList
            // dispatch({ type: 'set', watchListChanged:!watchListChanged })
        }).catch((err) => {
        })
    } else {
      firebase
      .database()
      .ref('mySymbols/' + authorId + '/' + brandSymbol)
      .remove()
      .then(() => {
        // Remove WatchList
          // watchListElements.splice(watchIndex, 1)
          // dispatch({ type: 'set', watchList: watchListElements, watchListChanged:!watchListChanged })
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
        fullScreenMode = getState().charts.fullScreenMode,
        sameChartSettings = {}

    if (selectedChart !== null) {
      currentOperation = 'edit'
      currentCharts.map(currentChart => {
        if (currentChart.chartUid == selectedChart) {
          currentIndice = currentChart.chartSettings.chartDbIndex
          sameChartSettings = {
            periodicity: currentChart.chartSettings.periodicity,
            flowIndex: currentChart.chartSettings.flowIndex,
            blocksLine: currentChart.chartSettings.blocksLine,
            blocktradesDates: currentChart.chartSettings.blocktradesDates || 30,
            flowIndexWidth: currentChart.chartSettings.flowIndexWidth || 1,
            showDivergence: currentChart.chartSettings.showDivergence,
            chartType: currentChart.chartSettings.chartType,
            ...additionalSettings
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
          localStorage.removeItem('scale_' + brandUid)
          localStorage.removeItem('yScale_' + brandUid)
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
          if (fullScreenMode) dispatch({type: 'set', fullScreenBrand: newBrandUid})
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
        updateTheCharts = getState().charts.updateTheCharts
        //fullScreenBrand = getState().charts.fullScreenBrand

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
          showAverage: newChartSettings.showAverage || currentCharts[chartSettingIndex].chartSettings.showAverage,
          priceBarsColor: newChartSettings.priceBarsColor || currentCharts[chartSettingIndex].chartSettings.priceBarsColor,
          flowIndexColor: newChartSettings.flowIndexColor || currentCharts[chartSettingIndex].chartSettings.flowIndexColor,
          flowIndexAvgColor: newChartSettings.flowIndexAvgColor || currentCharts[chartSettingIndex].chartSettings.flowIndexAvgColor,
          flowDarkIndexColor: newChartSettings.flowDarkIndexColor || currentCharts[chartSettingIndex].chartSettings.flowDarkIndexColor,
          flowBothIndexColor: newChartSettings.flowBothIndexColor || currentCharts[chartSettingIndex].chartSettings.flowBothIndexColor,
          blockTradesDarkPoolColor: newChartSettings.blockTradesDarkPoolColor || currentCharts[chartSettingIndex].chartSettings.blockTradesDarkPoolColor,
          blockTradesRegularPoolColor: newChartSettings.blockTradesRegularPoolColor || currentCharts[chartSettingIndex].chartSettings.blockTradesRegularPoolColor,
          backgroundColor: newChartSettings.backgroundColor || currentCharts[chartSettingIndex].chartSettings.backgroundColor,
          chartType: newChartSettings.chartType || currentCharts[chartSettingIndex].chartSettings.chartType,
          flowIndexWidth: newChartSettings.flowIndexWidth || currentCharts[chartSettingIndex].chartSettings.flowIndexWidth,
          fibonacciRetracementsColor: newChartSettings.fibonacciRetracementsColor || currentCharts[chartSettingIndex].chartSettings.fibonacciRetracementsColor,
          trendLineLineColor: newChartSettings.trendLineLineColor || currentCharts[chartSettingIndex].chartSettings.trendLineLineColor,
          trendLineRayColor: newChartSettings.trendLineRayColor || currentCharts[chartSettingIndex].chartSettings.trendLineRayColor,
          trendLineXlineColor: newChartSettings.trendLineXlineColor || currentCharts[chartSettingIndex].chartSettings.trendLineXlineColor
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
      //fullScreenBrand: currentCharts[chartSettingIndex],
      charts: currentCharts,
      updateTheCharts: !updateTheCharts
    })
  }
}

export const ResetChartSettings = () => {
  return (dispatch, getState, {getFirebase}) => {
    const firebase = getFirebase()
    const authorId = getState().firebase.auth.uid

    let updateTheCharts = getState().charts.updateTheCharts,
        chartSettings = getState().charts.chartSettings,
        syncChartSettings = getState().charts.syncChartSettings,
        singleDefaultStyle = getState().charts.singleDefaultStyle,
        defaultChartSettings = {
          ...{
            chartType: 'ohlc',
            blocktradesDates: 30,
            flowIndexWidth: 1,
            fibonacciRetracementsColor: '#2ec2ff',
            trendLineLineColor: '#2ec2ff',
            trendLineRayColor: '#2ec2ff',
            trendLineXlineColor: '#2ec2ff',
            securityType: 'stocks'
          },
          ...chartSettings,
          ...syncChartSettings,
          ...singleDefaultStyle
        }

    firebase
    .database()
    .ref('favoritesv2/' + authorId).once('value', (favoriteSnap) => {
      favoriteSnap.forEach(function(singleFavorite) {
        firebase
          .database()
          .ref('favoritesv2/' + authorId + '/' + singleFavorite.key + '/chartSettings').set(defaultChartSettings)
      })
    })

    firebase
    .database()
    .ref('defaultv2/' + authorId + '/')
    .set(null).catch((e) => {
      console.log('error saving', e)
    })

    dispatch({
      type: 'set',
      updateTheCharts: !updateTheCharts
    })
  }
}

export const SearchSymbol = (searchInput, futuresSearch = false) => {
  return (dispatch, getState, {getFirebase}) => {
    const firebase = getFirebase()

    return new Promise((resolve, reject) => {
      let searchLength = searchInput.length 
      if (searchLength == 0) {
          resolve(false)
      } else {
          let searchLetters = searchInput.toUpperCase();
          if (!futuresSearch) {
            firebase.database()
            .ref(`/polySymbols`)
            .orderByKey()
            .limitToFirst(100)
            .startAt(searchLetters)
            .endAt(searchLetters + "\uf8ff")
              .once('value', (val) => {
                  resolve(val.val())
              })
          } else {
            firebase.database()
            .ref(`/futuresSymbols`)
            .orderByKey()
            .limitToFirst(100)
            .startAt(searchLetters)
            .endAt(searchLetters + "\uf8ff")
              .once('value', (val) => {
                  resolve(val.val())
              })
          }
      }
    })
  }
}