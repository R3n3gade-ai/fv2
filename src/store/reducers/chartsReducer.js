import storeBrands from '../../assets/json/brandsJson.json'

const initialState = {
  sidebarShow: 'responsive', // ONLINE
  sidebarMinimize: true, // ONLINE
  asideShow: false, // ONLINE
  scanAsideShow: false, // ONLINE
  watchlistAsideShow: false, // ONLINE
  integrationsAsideShow: false, // ONLINE
  darkMode: true,
  fullScreenMode: false, // ONLINE
  fullScreenBrand: {}, // ONLINE
  brandsModelShow: false,
  settingsModelShow: false,
  updateTheCharts : false,
  watchList: [], // ONLINE
  watchListChanged: false,
  newChartLoaded: false,

  brands: [],
  existingCharts: [],
  charts: [], // ONLINE
  chartSettings: {
    fibonacciRetracements: false,
    trendLine: false,
    trendLineType: 'RAY',
    blocks: null,
    zonesDivergence: null,
    replayMarket: false,
    replayMarketSettings: {
      speed: 250
    },
    takeScreenShot: false,
    fullScreenMode: false
  },
  syncChartSettings: {
    flowIndex: 'normal', // ONLINE
    showAverage: false, // ONLINE
    showGrid: true, // ONLINE
    periodicity: '1m', // ONLINE
    priceBarsColor: '#2ec2ff', // ONLINE
    flowIndexColor: '#f8e71c', // ONLINE
    flowIndexAvgColor: '#7ed321', // ONLINE
    flowDarkIndexColor: '#f5a623', // ONLINE
    flowBothIndexColor: '#2ec2ff', // ONLINE
    blockTradesDarkPoolColor: '#4a90e2', // ONLINE
    blockTradesRegularPoolColor: '#d0021b', // ONLINE
    backgroundColor: 'transparent', // ONLINE
    trends: [], // ONLINE
    retracements: [], // ONLINE
    blocksLine: false, // ONLINE
    showDivergence: false, // ONLINE
  },
  defaultChartSettings: {
    flowIndex: 'normal', // ONLINE
    showAverage: false, // ONLINE
    showGrid: true, // ONLINE
    periodicity: '1m', // ONLINE
    priceBarsColor: '#2ec2ff', // ONLINE
    flowIndexColor: '#f8e71c', // ONLINE
    flowIndexAvgColor: '#7ed321', // ONLINE
    flowDarkIndexColor: '#f5a623', // ONLINE
    flowBothIndexColor: '#2ec2ff', // ONLINE
    blockTradesDarkPoolColor: '#4a90e2', // ONLINE
    blockTradesRegularPoolColor: '#d0021b', // ONLINE
    backgroundColor: 'transparent', // ONLINE
    trends: [], // ONLINE
    retracements: [], // ONLINE
    blocksLine: false, // ONLINE
    showDivergence: false, // ONLINE,
    chartLoading: true,
    fibonacciRetracements: false,
    trendLine: false,
    trendLineType: 'RAY',
    blocks: null,
    zonesDivergence: null,
    replayMarket: false,
    replayMarketSettings: {
      speed: 250
    },
    takeScreenShot: false,
    fullScreenMode: false
  },
  selectedChart: null,
  selectedChartEvent: null,
  disableEvent: false,
  applyToAllChart: true,
  currentChartSettings: {},

  tz: null,

  whiteColor: '#ffffff',
  primaryDarkColor: '#2ec2ff',
  primaryLightColor: '#0097fc',
  darkPoolColor: '#506689',
  regularPoolColor: '#93558d',

  mainHeight: null,
  headerHeight: null,

  xEventsState: {
    start: null,
    end: null
  },

  screenShotSrc: null,
  showScreenShotModal: false,

  blockListData: [],

  chartState: 1,

  showTourSteps: false
}

const chartsReducer = (state = initialState, { type, ...rest }) => {
  switch (type) {
    case 'set':
      return {...state, ...rest }
    case 'RESET_ACTION':
      return initialState
    default:
      return state
  }
}

export default chartsReducer