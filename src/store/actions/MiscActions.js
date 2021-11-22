export const getGeoToken = () => {
  return (dispatch, getState, {getFirebase}) => {
    fetch('https://www.universal-tutorial.com/api/getaccesstoken', {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'api-token': 'E4-0_8Afpnb7ODEbymidSWTb6JxhfUMC2-Y04STUAlmNj2BWt3dPwPxi1sA-5s_mSuE',
            'user-email': 'elmehdi.elboukili@gmail.com'
        },
      })
      .then(response => response.json())
      .then(data => {
        if (data.auth_token) {
          dispatch({type: 'misc_set', geoPullApi: data.auth_token})
        }
      })
      .catch((error) => {
      })
  }
}

export const getGeoCountry = () => {
  return (dispatch, getState, {getFirebase}) => {
    const geoPullApi = getState().misc.geoPullApi

    return new Promise((resolve, reject) => {
    fetch('https://www.universal-tutorial.com/api/countries/', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + geoPullApi,
          'Accept': 'application/json'
        },
      })
      .then(response => response.json())
      .then(data => {
        resolve(data)
      })
      .catch((error) => {
        resolve(false)
      })
    })
  }
}

export const getGeoState = (country) => {
  return (dispatch, getState, {getFirebase}) => {
    const geoPullApi = getState().misc.geoPullApi

    return new Promise((resolve, reject) => {
    fetch('https://www.universal-tutorial.com/api/states/' + country, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + geoPullApi,
          'Accept': 'application/json'
        },
      })
      .then(response => response.json())
      .then(data => {
        resolve(data)
      })
      .catch((error) => {
        resolve(false)
      })
    })
  }
}

export const getGeoCity = (state) => {
  return (dispatch, getState, {getFirebase}) => {
    const geoPullApi = getState().misc.geoPullApi

    return new Promise((resolve, reject) => {
    fetch('https://www.universal-tutorial.com/api/cities/' + state, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + geoPullApi,
          'Accept': 'application/json'
        },
      })
      .then(response => response.json())
      .then(data => {
        resolve(data)
      })
      .catch((error) => {
        resolve(false)
      })
    })
  }
}