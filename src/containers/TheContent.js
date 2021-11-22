import React, { Suspense, useCallback, useEffect } from 'react'
import { connect } from 'react-redux'
import { updateProperty } from '../store/actions/StylesActions'
import {
  Redirect,
  Route,
  Switch
} from 'react-router-dom'
import { CContainer, CFade } from '@coreui/react'

// routes config
import routes from '../routes'
  
const loading = (
  <div className='c-custom_loader'>
      <div className='lds-ripple'><div></div><div></div></div>
  </div>
)

const TheContent = props => {
  const {
    changedSidebarShow,
    changedSidebarMinimize,
    changedFullScreenMode,
    changedAsideDivergenceBar,
    changedAsideScansBar,
    changedAsideWatchlistBar,
    updateProperty
  } = props

  const main = useCallback(node => {
    if (node !== null) {
      if (node.target) {
        updateProperty({mainHeight: parseInt(node.target.innerHeight) - 45})
      } else {
        updateProperty({mainHeight: node.getBoundingClientRect().height})
      }      
    }
  }, []);

  useEffect(() => { 
    setTimeout( () => {
      window.dispatchEvent(new Event('resize'))
    }, 300 )

    window.addEventListener('resize', main)
    return () => {
        window.removeEventListener('resize', main)
    }
  })

  return (
    <main ref={main} className="c-main p-0">
      <CContainer fluid className="p-0">
        <Suspense fallback={loading}>
          <Switch>
            {routes.map((route, idx) => {
              return route.component && (
                <Route
                  key={idx}
                  path={route.path}
                  exact={route.exact}
                  name={route.name}
                  render={props => (
                    <CFade>
                      <route.component {...props} />
                    </CFade>
                  )} />
              )
            })}
            <Redirect from="/" to="/dashboard" />
          </Switch>
        </Suspense>
      </CContainer>
    </main>
  )
}

const mapStateToProps = (state) => {
  return {
      changedSidebarShow: state.charts.sidebarShow,
      changedSidebarMinimize: state.charts.sidebarMinimize,
      changedFullScreenMode: state.charts.fullScreenMode,
      changedAsideDivergenceBar : state.charts.asideShow,
      changedAsideScansBar : state.charts.scanAsideShow,
      changedAsideWatchlistBar : state.charts.watchlistAsideShow
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    updateProperty: (property) => dispatch(updateProperty(property))
  }
}

export default React.memo(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )(TheContent)
)
