const multer = require("multer");

const classifyUploadError = (err) => {
  if (err instanceof multer.MulterError) {
    const tooLarge = ["LIMIT_FILE_SIZE", "LIMIT_FILE_COUNT", "LIMIT_PART_COUNT"].includes(err.code);
    const messages = {
      LIMIT_FILE_SIZE: "The uploaded file is too large.",
      LIMIT_FILE_COUNT: "Too many files were uploaded.",
      LIMIT_UNEXPECTED_FILE: "An unexpected file field was uploaded.",
      LIMIT_PART_COUNT: "Too many form parts were submitted.",
      LIMIT_FIELD_VALUE: "A form field is too large.",
    };
    return { statusCode: tooLarge ? 413 : 400, message: messages[err.code] || "The upload could not be accepted." };
  }
  if (err?.code === "UNSUPPORTED_IMAGE_TYPE") {
    return { statusCode: 400, message: "Only JPG, PNG, and WEBP images are allowed." };
  }
  if (err?.code === "INVALID_IMAGE_DATA") {
    return { statusCode: 400, message: err.message || "The uploaded image is invalid or corrupt." };
  }
  return null;
};

const notFound = (req, res, next) => {
  const error = new Error(`Route not found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

const errorHandler = (err, _req, res, _next) => {
  const uploadError = classifyUploadError(err);
  if (uploadError) {
    return res.status(uploadError.statusCode).json({ success: false, message: uploadError.message });
  }

  if (Number.isInteger(err?.statusCode) && err.statusCode >= 400 && err.statusCode < 500) {
    return res.status(err.statusCode).json({ success: false, message: err.message || "The request could not be accepted." });
  }

  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  if (statusCode >= 500) console.error(err);
  const message =
    process.env.NODE_ENV === "production" && statusCode >= 500
      ? "Something went wrong on the server. Please try again."
      : err.message || "Server error";
  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
};

module.exports = { classifyUploadError, notFound, errorHandler };
