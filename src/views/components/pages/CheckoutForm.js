import React, { useState } from 'react'
import { connect } from 'react-redux'
import {useStripe, useElements, CardElement} from '@stripe/react-stripe-js'
import { processPayment } from '../../../store/actions/AuthActions'
import {
  CButton,
  CCol,
  CInput,
  CInputGroup,
  CFormGroup,
  CInputCheckbox,
  CLabel,
  CInputGroupAppend,
  CRow,
  CLink,

  CModal,
  CModalHeader,
  CModalBody
} from '@coreui/react'
import CIcon from '@coreui/icons-react'

const CheckoutForm = props => {
  const {
    userPayload,
    paymentProgress,
    processPayment
  } = props
  
  const stripe = useStripe()
  const elements = useElements()

  const [completedCard, setCompletedCard] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const [showTermsAndConditions, setShowTermsAndConditions] = useState(false)
  const [showRefundPolicy, setShowRefundPolicy] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!stripe || !elements || !acceptedTerms ) {
      return
    }

    processPayment(stripe, elements, userPayload)
  }

  const handleChange = (event) => {
    setCompletedCard(event.complete)
  }

  const handleAcceptTerms = (event) => {
    setAcceptedTerms(event.nativeEvent.target.checked)
  }

  return (  
    <>
      <table className="table table-striped">
        <thead>
          <tr>
            <th className="center">#</th>
            <th>Item</th>
            <th>Description</th>
            <th className="center">Quantity</th>
            <th className="right">Unit Cost</th>
            <th className="right">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="center">1</td>
            <td className="left">Trial Package</td>
            <td className="left">Get 7 days free trial access to FlowTrade</td>
            <td className="center">1</td>
            <td className="right">$0,00</td>
            <td className="right">$0,00</td>
          </tr>
        </tbody>
      </table>
      <CRow>
        <CCol lg='6' md='6' sm='6' xs='6' xl='6' className='order-xs-2'>
          7 Days Free Trial, then you will be <strong>billed 199$/mo on November 7,2021</strong>
        </CCol>
        <CCol lg='6' md='6' sm='6' xs='6' xl='6' className=''>
          <CInputGroup style={{
            width: '60%',
            float: 'right',
          }}>
            <CInput 
              type="text" 
              id="apply_discount" 
              name="apply_discount" 
              placeholder="Promo Code"
              size="sm"
            />
            <CInputGroupAppend>
              <CButton type="button" size="sm" color="success">Apply</CButton>
            </CInputGroupAppend>
          </CInputGroup>
          <table style={{
            width: '60%',
            float: 'right',
            textAlign: 'right'
          }} className="table table-clear">
            <tbody>
              <tr>
                <td className="left"><strong>Subtotal</strong></td>
                <td className="right">$0,00</td>
              </tr>
              {/* <tr>
                <td className="left"><strong>Discount (0%)</strong></td>
                <td className="right">$1,699,40</td>
              </tr> */}
              <tr>
                <td className="left"><strong>Total</strong></td>
                <td className="right"><strong>$0,00</strong></td>
              </tr>
            </tbody>
          </table>
        </CCol>
        <CCol lg='12' md='12' sm='12' xs='12' xl='12' className='text-align-center'>
          <CInputGroup>
            <CardElement onChange={handleChange} className='form-control' options={{
              style: {
                base: {
                  iconColor: 'rgba(255, 255, 255, 0.87)',
                  color: 'rgba(255, 255, 255, 0.87)',
                  '::placeholder': {
                    color: 'rgba(255, 255, 255, .6)',
                  },
                }
              },
              hidePostalCode: true,
              classes: {
                invalid: 'is-invalid'
              }}
            }/>
            <CInputGroupAppend>
              <CButton type="button" color="success" onClick={handleSubmit}
                disabled={!completedCard || !acceptedTerms || paymentProgress}>
                  <CIcon name="cil-dollar" /> {isProcessing ? 'Proceed to Payment' : 'Processing'}</CButton>
            </CInputGroupAppend>
          </CInputGroup>
          <CFormGroup variant="custom-checkbox" className="pt-2">
            <CInputCheckbox
              custom
              id="accept"
              required
              onChange={handleAcceptTerms}
            />
            <CLabel variant="custom-checkbox" htmlFor="accept">
            I Agree to the <CLink
              onClick={() => setShowTermsAndConditions(true)}
            >Terms and Conditions</CLink> and <CLink
              onClick={() => setShowRefundPolicy(true)}
            >Refund Policy</CLink>
            </CLabel>
          </CFormGroup>
        </CCol>
        <CCol lg='12' md='12' sm='12' xs='12' xl='12' className='mt-3 text-align-center'>
          An authorization of <strong>$1.00 will be placed on your card</strong>, it will <strong>not be charged and will be removed when your trial is complete or you cancel</strong> your membership. This is in place for Flow Trade <strong>to verify that the card being used is valid</strong>.
        </CCol>
        <CCol lg='12' md='12' sm='12' xs='12' xl='12' className=''>
          <CModal
            show={showTermsAndConditions}
            onClose={() => setShowTermsAndConditions(false)}
            closeOnBackdrop={true}
            size='lg'
            className='checkout_modal'
          >
            <CModalHeader className='h5 mb-0' closeButton>Terms And Conditions</CModalHeader>
            <CModalBody className=''>
              Your privacy is important to us. It is FlowTrade's policy to respect your privacy regarding any information we may collect from you across our website, http://flowtrade.com, and other sites we own and operate. We only ask for personal information when we truly need it to provide a service to you. We collect it by fair and lawful means, with your knowledge and consent. We also let you know why we’re collecting it and how it will be used. We only retain collected information for as long as necessary to provide you with your requested service. What data we store, we’ll protect within commercially acceptable means to prevent loss and theft, as well as unauthorized access, disclosure, copying, use or modification. We don’t share any personally identifying information publicly or with third-parties, except when required to by law. Our website may link to external sites that are not operated by us. Please be aware that we have no control over the content and practices of these sites, and cannot accept responsibility or liability for their respective privacy policies. You are free to refuse our request for your personal information, with the understanding that we may be unable to provide you with some of your desired services. Your continued use of our website will be regarded as acceptance of our practices around privacy and personal information. If you have any questions about how we handle user data and personal information, feel free to contact us. This policy is effective as of 1 January 2020.
            </CModalBody>
          </CModal>
          <CModal
            show={showRefundPolicy}
            onClose={() => setShowRefundPolicy(false)}
            closeOnBackdrop={true}
            size='lg'
            className='checkout_modal'
          >
            <CModalHeader className='h5 mb-0' closeButton>Refund Policy</CModalHeader>
            <CModalBody className=''>
              Since our Website offers non-tangible, irrevocable goods we do not provide refunds after the product is purchased, which you acknowledge prior to purchasing any product on the Website. Please make sure that you've carefully read product description before making a purchase. Contacting us If you would like to contact us concerning any matter relating to this Refund Policy, you may send an email to admin@flowtrade.com This document was last updated on January 30, 2020
            </CModalBody>
          </CModal>
        </CCol>
      </CRow>
    </>
  )
}

const mapStateToProps = (state) => {
  return{
    auth: state.firebase.auth,
    paymentProgress: state.auth.paymentProgress
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    processPayment: (stripe, elements, userPayload) => dispatch(processPayment(stripe, elements, userPayload))
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(CheckoutForm)