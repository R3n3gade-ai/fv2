export const signIn = (credentials) => {
  return (dispatch, getState, {getFirebase}) => {
    const firebase = getFirebase();
    dispatch({ type: 'RESET' })
    dispatch({ type: 'PROGRESS_IN' })

    firebase.auth().signInWithEmailAndPassword(
      credentials.email,
      credentials.password
    ).then(() => {
      dispatch({ type: 'LOGIN_SUCCESS' })
    }).catch((err) => {
      dispatch({ type: 'LOGIN_ERROR', err })
    }).finally(() => {
      dispatch({ type: 'PROGRESS_OUT' })
    })
  }
}

export const signUp = (credentials, userData) => {
  return (dispatch, getState, {getFirebase}) => {
    const firebase = getFirebase();
    dispatch({ type: 'RESET' })
    dispatch({ type: 'SIGNUP_PROGRESS_IN' })

    firebase.auth().createUserWithEmailAndPassword(
      credentials.email,
      credentials.password
    ).then(async(userCredential) => {
      delete userData.password
      delete userData.verification
      delete userData.signupComplete
      delete userData.createdUser
      delete userData.progress
      delete userData.validUserName

      await firebase
        .database()
        .ref(`users/${userCredential.user.uid}`)
        .set(userData)

      if (userData.utmSource !== '') {
        firebase.analytics().logEvent('utm_purchase')
      }

      dispatch({ type: 'SIGNUP_SUCCESS', userCredential })
    }).catch((err) => {
      dispatch({ type: 'SIGNUP_ERROR', err })
    }).finally(() => {
      dispatch({ type: 'SIGNUP_PROGRESS_OUT' })
    })
  }
}

export const passwordReset = (email) => {
  return (dispatch, getState, {getFirebase}) => {
    const firebase = getFirebase();
    dispatch({ type: 'RESET' })
    dispatch({ type: 'RESET_PROGRESS_IN' })

    firebase.auth().sendPasswordResetEmail(
      email
    ).then(() => {
      dispatch({ type: 'RESET_SUCCESS' })
    }).catch((err) => {
      dispatch({ type: 'RESET_ERROR', err })
    }).finally(() => {
      dispatch({ type: 'RESET_PROGRESS_OUT' })
    })
  }
}


export const signOut = () => {
  return (dispatch, getState, {getFirebase}) => {
    const firebase = getFirebase();
    dispatch({ type: 'PROGRESS_IN' })

    firebase.auth().signOut().then(() => {
      dispatch({ type: 'USER_LOGGEDOUT' })
      firebase.logout()
    }).finally(() => {
      dispatch({ type: 'PROGRESS_OUT' })
      dispatch({ type: 'RESET_ACTION' })
    })
  }
}

export const resubscribeUser = (checkoutSession ) => {
  return async(dispatch, getState, {getFirebase}) => {
    const firebase = getFirebase();
    const firestore = firebase.firestore();
    const authorId = getState().firebase.auth.uid

    let userStripeId

    dispatch({ type: 'RESUBSCRIBE_DONE' })
    dispatch({ type: 'RESUBSCRIBE_PROGRESS' })

    const customerStripeRef = await firestore
    .collection('customers')
    .doc(authorId)
    .get('stripeId');

    if (!customerStripeRef.exists) {
      dispatch({ type: 'RESUBSCRIBE_ERROR' })
      return
    } else {
      userStripeId = customerStripeRef.data().stripeId
      checkoutSession.customer = userStripeId
    }

    const docRef = await firestore
      .collection('customers')
      .doc(authorId)
      .collection('checkout_sessions')
      .add(checkoutSession);

    const unsubscribe = docRef.onSnapshot(
      {
          // Listen for document metadata changes
          includeMetadataChanges: true
      },
      (snap) => {
        const { error, url } = snap.data();
        if (error) {
          dispatch({ type: 'RESUBSCRIBE_ERROR', error })
        }
        if (url) {
          dispatch({ type: 'RESUBSCRIBE_SUCESS', url })
        }

        
      },
      (error) => {
        dispatch({ type: 'RESUBSCRIBE_ERROR', error })
      },
      () => {
        dispatch({ type: 'RESUBSCRIBE_DONE' })
      }
    )
  }
}

export const processPayment = (stripe, elements, userPayload) => {
  return async(dispatch, getState, {getFirebase}) => {
    dispatch({ type: 'PAYMENT_PROGRESS_IN' })

    const firebase = getFirebase();
    const credentials = getState().auth.signedUpCredentials;

    let cardHolderName = userPayload.firstName + ' ' + userPayload.lastName,
        email = userPayload.email

    try {
      firebase
        .database()
        .ref(`users/${credentials.user.uid}/checkoutClicked`)
        .push(true)
    } catch (ex) {}


    try {
      stripe.createToken(elements.getElement('card'), {
        name: cardHolderName
      }).then((result) => {
        if (result.token) {
          stripe.createPaymentMethod({
            type: 'card',
            card: elements.getElement('card'),
              billing_details: {
                email:email,
                name:cardHolderName
              }
          }).then((presult) => {
            if (presult.paymentMethod) {
              let user = credentials.user

              try {
                window
                .fetch('https://us-central1-tradingproject19-f513b.cloudfunctions.net/CreatePaymentMethodB', {
                  method: 'POST',
                  mode: 'cors',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    token:result.token,
                    plan:'Trial',
                    email:email,
                    name:cardHolderName,
                    payment_method_id:presult.paymentMethod.id,
                    uid:user.uid,
                    isTestCard:true,
                    user: userPayload
                  }),
                }).then(res => {
                  if (res.status === 200) {
                    return res.json()
                  } else {
                    firebase
                      .database()
                      .ref(`CheckoutErrors/${user.uid}`)
                      .push(res.status)

                    dispatch({ type: 'PAYMENT_ERROR' })
                    return null
                  }
                }).then(data => {
                  if (data && data.err) {
                    let err = data.err

                    firebase
                      .database()
                      .ref(`CheckoutErrors/${user.uid}`)
                      .push(err)

                    dispatch({ type: 'PAYMENT_ERROR', err })
                  } else {
                    if (userPayload.fromCancel == true) {
                      firebase
                        .database()
                        .ref(`users/${user.uid}/futureCancel`)
                        .remove()
                      firebase
                        .database()
                        .ref(`users/${user.uid}/billingFailed`)
                        .remove()
                      firebase
                        .database()
                        .ref(`users/${user.uid}/cancelTime`)
                        .remove()
                      firebase
                        .database()
                        .ref(`users/${user.uid}/cancelling`)
                        .remove()
                      firebase
                        .database()
                        .ref(`users/${user.uid}/paypalBA`)
                        .remove()
                      firebase
                        .database()
                        .ref(`users/${user.uid}/paypal`)
                        .remove()
                      firebase
                        .database()
                        .ref(`users/${user.uid}/paypalSub`)
                        .remove()
                    }

                    firebase
                      .database()
                      .ref(`users/${user.uid}/cancelTime`)
                      .remove()
                    firebase
                      .database()
                      .ref(`users/${user.uid}/cancelling`)
                      .remove()

                    firebase
                      .database()
                      .ref(`users/${user.uid}/paymentDate`)
                      .set(new Date().getTime())
                    firebase
                      .database()
                      .ref(`users/${user.uid}/stripe`)
                      .set(true)
                    firebase
                      .database()
                      .ref(`users/${user.uid}/paymentStatus`)
                      .set('Paid')

                    try {
                      window
                        .fetch('https://us-central1-vwo-flowtrade.cloudfunctions.net/AddLeadActiveCampaign', {
                          method: 'POST',
                          mode: 'cors',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            fname: userPayload.firstName || '',
                            lname: userPayload.lastName || '',
                            phone: userPayload.phoneNumber || '',
                            address: userPayload.address || '',
                            city: userPayload.city || '',
                            state: userPayload.state || '',
                            zip: userPayload.zip || '',
                            country: userPayload.country || '',
                            email: userPayload.email || '',
                            listID: userPayload.utmList || 19,
                            tags: 'Free-Trial',
                          }),
                        }).then(res => {
                          if (res.status === 200) {
                            return res.json()
                          } else {
                            return null
                          }
                        }).then(data => {
                          let subscriber_id;
                          if (typeof data['response'][0] !== 'undefined') {
                            subscriber_id = data['response'][0]['id'];
                          } else {
                            subscriber_id = data['response']['subscriber_id'];
                          }
                        })
                    } catch (err) {}

                    const sendSubscribeSuccess = firebase
                      .functions()
                      .httpsCallable('sendSubscribeSuccess')

                    dispatch({ type: 'PAYMENT_SUCCESS' })
                  }
                })
              } catch (err) {
                dispatch({ type: 'PAYMENT_ERROR', err })
              }
            } else {
              dispatch({ type: 'PAYMENT_ERROR' })                          
            }
          })
        } else {
          dispatch({ type: 'PAYMENT_ERROR' })
        }
      })
    } catch (err) {
      dispatch({ type: 'PAYMENT_ERROR', err })
    }

  }
}