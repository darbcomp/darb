const test = require("node:test");
const assert = require("node:assert/strict");

const {
  isDiagnosticOrderRequestId,
  isUploadDiagnosticId,
  sanitizeCommon,
  validateClientUploadDiagnostic,
} = require("../services/uploadDiagnostics.service");
const { recordUploadDiagnostic } = require("../controllers/clientDiagnostics.controller");

const base = {
  diagnosticId: "upload_lxyz1234_abcdef123456",
  source: "checkout_initial",
  phase: "file_selected",
  sequence: 1,
};

test("client upload diagnostics accept only allowlisted fields and phases", () => {
  assert.deepEqual(validateClientUploadDiagnostic({ ...base, extension: "jpg", size: 770000 }), {
    ...base,
    extension: "jpg",
    size: 770000,
  });
  assert.equal(validateClientUploadDiagnostic({ ...base, phase: "made_up" }), null);
  assert.equal(validateClientUploadDiagnostic({ ...base, filename: "private-proof.jpg" }), null);
  assert.equal(validateClientUploadDiagnostic({ ...base, phone: "01000000000" }), null);
  assert.equal(validateClientUploadDiagnostic({ ...base, privateKey: "payment-proofs/key" }), null);
});

test("server upload diagnostics allow only fixed phases and redact arbitrary values", () => {
  const safe = sanitizeCommon({
    diagnosticId: "upload_lxyz1234_abcdef123456",
    source: "order_create",
    phase: "failed",
    failureStage: "storage",
    errorCategory: "storage",
    reportedMime: "image/jpeg",
    rawError: "provider filesystem details",
  });
  assert.deepEqual(safe, {
    diagnosticId: "upload_lxyz1234_abcdef123456",
    source: "order_create",
    phase: "failed",
    reportedMime: "image/jpeg",
    errorCategory: "storage",
    failureStage: "storage",
  });
});

test("server accepts only generated diagnostic and order request ID formats", () => {
  const uuid = "123e4567-e89b-42d3-a456-426614174000";
  assert.equal(isUploadDiagnosticId(uuid), true);
  assert.equal(isUploadDiagnosticId("upload_lxyz1234_abcdef123456"), true);
  assert.equal(isUploadDiagnosticId("01012345678"), false);
  assert.equal(isUploadDiagnosticId("arbitraryIdentifier123"), false);
  assert.equal(isDiagnosticOrderRequestId(uuid), true);
  assert.equal(isDiagnosticOrderRequestId("darb-lxyz1234-abc123-def456"), true);
  assert.equal(validateClientUploadDiagnostic({ ...base, requestId: uuid }).requestId, uuid);
  assert.equal(validateClientUploadDiagnostic({ ...base, requestId: "darb-lxyz1234-abc123-def456" }).requestId, "darb-lxyz1234-abc123-def456");

  assert.equal(validateClientUploadDiagnostic({ ...base, requestId: "01012345678" }).requestId, undefined);
  assert.equal(validateClientUploadDiagnostic({ ...base, requestId: "arbitraryIdentifier123" }).requestId, undefined);
});

test("server MIME and sequence sanitizers are strict", () => {
  for (const reportedMime of ["image/jpeg", "image/jpg", "image/png", "image/webp"]) {
    assert.equal(validateClientUploadDiagnostic({ ...base, reportedMime }).reportedMime, reportedMime);
  }
  const known = validateClientUploadDiagnostic({
    ...base,
    sequence: 7,
    reportedMime: "application/octet-stream",
    normalizedMime: "image/jpeg",
  });
  assert.equal(known.sequence, 7);
  assert.equal(known.reportedMime, "application/octet-stream");
  assert.equal(known.normalizedMime, "image/jpeg");

  const arbitrary = validateClientUploadDiagnostic({
    ...base,
    reportedMime: "application/customer-secret",
    normalizedMime: "application/octet-stream",
  });
  assert.equal(arbitrary.reportedMime, undefined);
  assert.equal(arbitrary.normalizedMime, undefined);
  assert.equal(validateClientUploadDiagnostic({ ...base, sequence: 0 }), null);
  assert.equal(validateClientUploadDiagnostic({ ...base, sequence: 101 }), null);
  assert.equal(validateClientUploadDiagnostic({ ...base, sequence: 1.5 }), null);
});

test("client diagnostic endpoint rejects an unknown field without logging it", () => {
  let statusCode = 200;
  let responseBody;
  const response = {
    status(value) { statusCode = value; return this; },
    json(value) { responseBody = value; return this; },
  };
  recordUploadDiagnostic({ body: { ...base, filename: "private-proof.jpg" } }, response);
  assert.equal(statusCode, 400);
  assert.deepEqual(responseBody, { success: false, message: "Invalid upload diagnostic." });
});
