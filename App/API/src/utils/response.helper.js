const sendSuccess = (res, statusCode, data = null) => {
  return res.status(statusCode).json({
    success: true,
    data,
    error: null,
  });
};

const sendError = (res, statusCode, code, message) => {
  return res.status(statusCode).json({
    success: false,
    data: null,
    error: { code, message },
  });
};

module.exports = { sendSuccess, sendError };
