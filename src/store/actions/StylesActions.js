export const updateProperty = (property) => {
  return (dispatch, getState) => {
    dispatch({ type: 'set', ...property })
  }
};