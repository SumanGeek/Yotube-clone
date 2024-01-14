const asyncHandle = (fn) => async (req, res, next) => {
  //this is higher order function
  try {
    await fn(res, req, next);
  } catch (error) {
    res.status(error.code || 500).json({
      messege: error.messege,
      success: false,
    });
  }
};
