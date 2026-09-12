const { uploadPaymentProof } = require("./upload.middleware");
const { getRequestUploadDiagnostic, logUploadPhase } = require("../services/uploadDiagnostics.service");

const classifyMultipartError = (error) => {
  if (error?.code === "LIMIT_FILE_SIZE") return "file_too_large";
  if (error?.code === "UNSUPPORTED_IMAGE_TYPE") return "unsupported_type";
  return "multipart";
};

const paymentProofUploadWithDiagnostics = (source) => (req, res, next) => {
  const context = getRequestUploadDiagnostic(req, source);
  if (context) logUploadPhase({ ...context, phase: "request_received" });
  uploadPaymentProof(req, res, (error) => {
    if (error) {
      if (context) logUploadPhase({ ...context, phase: "failed", failureStage: "multipart", errorCategory: classifyMultipartError(error) });
      return next(error);
    }
    if (context) {
      logUploadPhase({
        ...context,
        phase: "multipart_accepted",
        reportedMime: req.file?.mimetype,
        size: req.file?.size,
      });
      req.uploadDiagnostic = context;
    }
    return next();
  });
};

module.exports = { paymentProofUploadWithDiagnostics };
