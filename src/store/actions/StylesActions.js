export const updateProperty = (property, type = 'set') => {
  return (dispatch, getState) => {
    dispatch({ type: type, ...property })
  }
};