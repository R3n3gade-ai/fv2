import React from 'react'
import { connect } from 'react-redux'
import { updateProperty } from '../store/actions/StylesActions'
import {
  CCreateElement,
  CSidebar,
  CSidebarBrand,
  CSidebarNav,
  CSidebarNavDivider,
  CSidebarNavTitle,
  CSidebarMinimizer,
  CSidebarNavDropdown,
  CSidebarNavItem,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'

// sidebar nav config
import navigation from './_nav'

const TheSidebar = props => {
  const {
    show,
    minimize,
    updateProperty
  } = props;

  return (
    <CSidebar
      show={show}
      unfoldable
      minimize={minimize}
      onShowChange={(val) => updateProperty({sidebarShow: !show})}
      onMinimizeChange={(val) => updateProperty({sidebarMinimize: !minimize})}
    >
      <CSidebarBrand className="d-md-down-none" to="/">
        <CIcon
          className="c-sidebar-brand-full"
          content={React.icons.flowtradeLogo}
          height={35}
        />
        <CIcon
          className="c-sidebar-brand-minimized"
          name="sygnet"
          height={35}
        />
      </CSidebarBrand>
      <CSidebarNav>

        <CCreateElement
          items={navigation}
          components={{
            CSidebarNavDivider,
            CSidebarNavDropdown,
            CSidebarNavItem,
            CSidebarNavTitle
          }}
        />

        <CSidebarNavDivider />
      </CSidebarNav>
      <CSidebarMinimizer className="c-d-md-down-none"/>
    </CSidebar>
  )
}

const mapStateToProps = (state) => {
  return {
    show: state.charts.sidebarShow,
    minimize: state.charts.sidebarMinimize
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    updateProperty: (property) => dispatch(updateProperty(property))
  }
}

export default React.memo(connect(
  mapStateToProps,
  mapDispatchToProps
)(TheSidebar))
