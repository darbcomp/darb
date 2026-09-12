const INTERNAL_ERROR_MESSAGE =
  "Something went wrong on the server. Please try again.";

const logInternalError = (error, context = "Internal request failed") => {
  if (process.env.NODE_ENV === "production") console.error(`${context}.`);
  else console.error(`${context}:`, error);
};

const getSafeInternalMessage = (error, fallback = INTERNAL_ERROR_MESSAGE, context) => {
  logInternalError(error, context);
  return process.env.NODE_ENV === "production"
    ? fallback
    : error?.message || fallback;
};

const sendInternalError = (res, error, context, fallback) => {
  if (Number.isInteger(error?.statusCode) && error.statusCode >= 400 && error.statusCode < 500) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message || "The request could not be accepted.",
    });
  }

  return res.status(500).json({
    success: false,
    message: getSafeInternalMessage(error, fallback, context),
  });
};

module.exports = {
  INTERNAL_ERROR_MESSAGE,
  logInternalError,
  getSafeInternalMessage,
  sendInternalError,
};
