export const EditProfile = (propertyUpdate, requireAction = false) => {
  return (dispatch, getState, {getFirebase}) => {
    dispatch({ type: 'UPDATE_RESET' })
    dispatch({ type: 'UPDATE_IN_PROGRESS' })
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
            if (requireAction) {
              requireAction()
            }

            dispatch({ type: 'UPDATE_SUCESS'})
        }).catch((err) => {
          dispatch({ type: 'UPDATE_ERROR', err })
        }).finally(() => {
          dispatch({ type: 'UPDATE_DONE' })
        })
  }
}

export const ShareDiscord = (pictureShare) => {
  return (dispatch, getState, {getFirebase}) => {
    dispatch({ type: 'UPDATE_RESET' })
    dispatch({ type: 'UPDATE_IN_PROGRESS' })
    const firebase = getFirebase()
    const authorId = getState().firebase.auth.uid

    firebase
        .database()
        .ref('discordShares/' + authorId)
        .set(pictureShare)
        .then(() => {
            dispatch({ type: 'UPDATE_SUCESS'})
        }).catch((err) => {
          dispatch({ type: 'UPDATE_ERROR', err })
        }).finally(() => {
          dispatch({ type: 'UPDATE_DONE' })
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