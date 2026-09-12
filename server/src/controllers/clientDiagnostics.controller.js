const { logUploadPhase, validateClientUploadDiagnostic } = require("../services/uploadDiagnostics.service");

const recordUploadDiagnostic = (req, res) => {
  const diagnostic = validateClientUploadDiagnostic(req.body);
  if (!diagnostic) {
    return res.status(400).json({ success: false, message: "Invalid upload diagnostic." });
  }
  logUploadPhase(diagnostic, { client: true });
  return res.status(202).json({ success: true });
};

module.exports = { recordUploadDiagnostic };
