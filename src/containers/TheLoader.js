import React, { useEffect } from 'react'
import { connect } from 'react-redux'
import { updateProperty } from '../store/actions/StylesActions'

const TheLoader = props => {
  const {
  } = props

  return (
    <div className='c-custom_loader'>
        <div className='lds-ripple'><div></div><div></div></div>
    </div>
  )
}

const mapStateToProps = (state) => {
  return {
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
)(TheLoader)