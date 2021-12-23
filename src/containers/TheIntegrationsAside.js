import React, { useEffect, useReducer, useState } from 'react'
import { compose } from 'redux'
import { connect } from 'react-redux'
import { firebaseConnect } from 'react-redux-firebase'
import { updateProperty } from '../store/actions/StylesActions'
import {
    CSidebar,
    CSidebarClose,
    CRow,
    CCol, 
    CNav,
    CNavItem, 
    CNavLink
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import Twitter  from '../views/sidebar/Twitter'

const TheIntegrationsAside = props => {
  const {
    integrationsAsideShow,
    updateProperty,
  } = props;

  const [activeTab, setActiveTab] = useState(1)

  return (
    <CSidebar
      className='overlaid-sidebar_divergence'
      colorScheme='dark'
      size='xl'
      show={integrationsAsideShow}
      onShowChange={() => updateProperty({integrationsAsideShow: !integrationsAsideShow})}
    >
      <CSidebarClose className='z-index_it' onClick={() => updateProperty({integrationsAsideShow: false}) } />
      <CRow>
        <CCol xs='12' sm='12' md='12' className='aside-heading'>
          <div className='d-flex flex-row align-items-center position-relative'>
            <CIcon content={React.icons.cilApps} height={30} />
            <h4 className='mb-0 ml-2'>Integrations</h4>
          </div>
        </CCol>
        <CCol xs='12' sm='12' md='12'>
          <CNav variant="underline" fill className="integrations-aside-nav">
            <CNavItem>
              <CNavLink href="#" className="active">
                <CIcon
                  name="cib-twitter"
                  className="mr-2"
                />
                <span>Twitter</span>
              </CNavLink>
            </CNavItem>            
            <CNavItem>
              <CNavLink href="#">
                <span>Zoom</span>
              </CNavLink>
            </CNavItem>
          </CNav>
          <Twitter />
        </CCol>
      </CRow>
    </CSidebar>
  )
}

const mapStateToProps = (state) => {
  return {
    integrationsAsideShow: state.charts.integrationsAsideShow,
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    updateProperty: (property) => dispatch(updateProperty(property)),
  }
}

export default React.memo(compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  ),
  firebaseConnect((props) => ([]))
)(TheIntegrationsAside))
