const express = require("express");
const { recordUploadDiagnostic } = require("../controllers/clientDiagnostics.controller");
const { clientDiagnosticLimiter } = require("../middleware/security.middleware");

const router = express.Router();
router.post("/upload", clientDiagnosticLimiter, recordUploadDiagnostic);
module.exports = router;
