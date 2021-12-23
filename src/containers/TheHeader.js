import React, { useEffect } from 'react'
import { connect } from 'react-redux'
import { updateProperty } from '../store/actions/StylesActions'
import {
  CHeader,
  CToggler,
  CHeaderBrand,
  CHeaderNav,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'

// routes config
import routes from '../routes'

import TheHeaderDropdown from './TheHeaderDropdown'
import TheHeaderDropdownMssg from './TheHeaderDropdownMssg'
import TheHeaderDropdownNotif from './TheHeaderDropdownNotif'
import TheHeaderDropdownTasks from './TheHeaderDropdownTasks'

const TheHeader = props => {
  const {
    asideShow,
    scanAsideShow,
    watchlistAsideShow,
    integrationsAsideShow,
    darkMode,
    sidebarShow,
    updateProperty
  } = props;

  const toggleSidebar = () => {
    const val = [true, 'responsive'].includes(sidebarShow) ? false : 'responsive'
      updateProperty({sidebarShow: val})
  }

  const toggleSidebarMobile = () => {
    const val = [false, 'responsive'].includes(sidebarShow) ? true : 'responsive'
      updateProperty({sidebarShow: val})
  }

  return (
    <CHeader withSubheader>
      <CToggler
        inHeader
        className="ml-md-3 d-lg-none"
        onClick={toggleSidebarMobile}
      />
      <CToggler
        inHeader
        className="ml-3 d-md-down-none"
        onClick={toggleSidebar}
      />
      <CHeaderBrand className="mx-auto d-lg-none" to="/">
        <CIcon content={React.icons.flowtradeDarkLogo} height="48" alt="Flowtrade"/>
      </CHeaderBrand>

      <CHeaderNav className="d-md-down-none mr-auto ft-left-nav">
        <CToggler
          inHeader
          className="d-md-down-none mr-3 second-step"
          onClick={() => updateProperty({scanAsideShow: false, watchlistAsideShow: false, integrationsAsideShow: false, asideShow: !asideShow})}
        >
          { asideShow && 
            <>
              <CIcon name="cis-call-split" alt="Dashboard" />
              <span className='font-weight-bold'>&nbsp;Divergence</span>
            </>
          }
          { !asideShow && 
            <>
              <CIcon name="cil-call-split" alt="Dashboard" />
              <span>&nbsp;Divergence</span>
            </>
          }
        </CToggler>
        <CToggler
          inHeader
          className="d-md-down-none mr-3 third-step"
          onClick={() => updateProperty({asideShow: false, watchlistAsideShow: false, integrationsAsideShow: false, scanAsideShow: !scanAsideShow})}
        >
          { scanAsideShow && 
            <>
              <CIcon name="cis-search" alt="Dashboard" />
              <span className='font-weight-bold'>&nbsp;Scan</span>
            </>
          }
          { !scanAsideShow && 
            <>
              <CIcon name="cil-search" alt="Dashboard" />
              <span>&nbsp;Scan</span>
            </>
          }
        </CToggler>
        <CToggler
          inHeader
          className="d-md-down-none mr-3 fourth-step"
          onClick={() => updateProperty({
            asideShow: false, scanAsideShow: false, integrationsAsideShow: false, watchlistAsideShow: !watchlistAsideShow})}
        >
          { watchlistAsideShow && 
            <>
              <CIcon name="cis-queue" alt="Dashboard" />
              <span className='font-weight-bold'>&nbsp;Watchlist</span>
            </>
          }
          { !watchlistAsideShow && 
            <>
              <CIcon name="cil-queue" alt="Dashboard" />
              <span>&nbsp;Watchlist</span>
            </>
          }
        </CToggler>
        <CToggler
          inHeader
          className="d-md-down-none mr-3 fourth-step"
          onClick={() => updateProperty({
            asideShow: false, scanAsideShow: false, watchlistAsideShow: false, integrationsAsideShow: !integrationsAsideShow})}
        >
          { integrationsAsideShow &&
            <>
              <CIcon content={React.icons.cilApps} alt="Integrations" />
              <span className='font-weight-bold'>&nbsp;Integrations</span>
            </>
          }
          { !integrationsAsideShow &&
            <>
              <CIcon content={React.icons.cilApps} alt="Integrations" />
              <span>&nbsp;Integrations</span>
            </>
          }
        </CToggler>
      </CHeaderNav>


      <CHeaderNav className="px-3">
        {/* <CToggler
          inHeader
          className="ml-3 d-md-down-none c-d-legacy-none"
          onClick={() => dispatch({type: 'set', darkMode: !darkMode})}
          title="Toggle Light/Dark Mode"
        >
          <CIcon name="cil-moon" className="c-d-dark-none" alt="CoreUI Icons Moon" />
          <CIcon name="cil-sun" className="c-d-default-none" alt="CoreUI Icons Sun" />
        </CToggler> */}
        {/* <TheHeaderDropdownNotif/>
        <TheHeaderDropdownTasks/>
        <TheHeaderDropdownMssg/> */}
        <TheHeaderDropdown/>
      </CHeaderNav>

    </CHeader>
  )
}

const mapStateToProps = (state) => {
  return {
    asideShow: state.charts.asideShow,
    scanAsideShow: state.charts.scanAsideShow,
    watchlistAsideShow: state.charts.watchlistAsideShow,
    darkMode: state.charts.darkMode,
    sidebarShow: state.charts.sidebarShow
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    updateProperty: (property) => dispatch(updateProperty(property))
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(TheHeader)
