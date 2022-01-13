export const EditProfile = (propertyUpdate) => {
  return (dispatch, getState, {getFirebase}) => {
    dispatch({ type: 'UPDATE_RESET' })
    const firebase = getFirebase()
    const authorId = getState().firebase.auth.uid
    const profileData = getState().firebase.profile

    firebase
        .database()
        .ref('users/' + authorId)
        .set({
            ...profileData,
            ...propertyUpdate
        })
        .then(() => {
            
        }).catch((err) => {
          dispatch({ type: 'UPDATE_ERROR', err })
        })
  }
}

export const UpdateTwitterExclusions = (twitterExclusions) => {
  return (dispatch, getState, {getFirebase}) => {
    dispatch({ type: 'UPDATE_RESET' })
    const firebase = getFirebase()
    const authorId = getState().firebase.auth.uid

    firebase
        .database()
        .ref('users/' + authorId)
        .update({
          twitterExclusions
        })
        .then(() => {

        }).catch((err) => {
          dispatch({ type: 'UPDATE_ERROR', err })
        })
  }
}