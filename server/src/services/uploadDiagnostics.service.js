const CLIENT_PHASES = new Set([
  "picker_opened",
  "file_selected",
  "validation_started",
  "validation_failed",
  "byte_read_started",
  "byte_read_arraybuffer_failed",
  "byte_read_filereader_started",
  "byte_read_success",
  "byte_read_failed",
  "snapshot_success",
  "preview_created",
  "preview_failed",
  "order_submit_started",
  "order_network_error",
]);
const SERVER_PHASES = new Set([
  "request_received",
  "multipart_accepted",
  "proof_validation_started",
  "proof_processed",
  "r2_uploaded",
  "order_persisted",
  "failed",
]);
const CLIENT_SOURCES = new Set([
  "checkout_initial",
  "checkout_change",
  "checkout_drop",
  "track_order_resubmission",
  "account_order_resubmission",
]);
const SERVER_SOURCES = new Set(["order_create", "guest_proof_resubmission", "account_proof_resubmission"]);
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UPLOAD_FALLBACK_ID = /^upload_[0-9a-z]{8,10}_[0-9a-z]{12}$/;
const ORDER_FALLBACK_ID = /^darb-[0-9a-z]{8,10}-[0-9a-z]{1,16}-[0-9a-z]{1,16}$/;
const REPORTED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/octet-stream",
]);
const NORMALIZED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const CLIENT_KEYS = new Set([
  "diagnosticId", "source", "phase", "extension", "reportedMime", "normalizedMime",
  "size", "durationMs", "errorCategory", "platform", "authenticated", "requestId", "httpStatus", "sequence",
]);
const ERROR_CATEGORIES = new Set([
  "not_readable", "aborted", "security", "unknown", "file_too_large", "unsupported_type",
  "multipart", "image_validation", "storage", "database",
]);

const isUploadDiagnosticId = (value) => UUID_V4.test(String(value || "")) || UPLOAD_FALLBACK_ID.test(String(value || ""));
const isDiagnosticOrderRequestId = (value) => UUID_V4.test(String(value || "")) || ORDER_FALLBACK_ID.test(String(value || ""));

const sanitizeCommon = (value, { client = false } = {}) => {
  const diagnosticId = String(value?.diagnosticId || "");
  const source = String(value?.source || "");
  const phase = String(value?.phase || "");
  const allowedPhases = client ? CLIENT_PHASES : SERVER_PHASES;
  const allowedSources = client ? CLIENT_SOURCES : SERVER_SOURCES;
  if (!isUploadDiagnosticId(diagnosticId) || !allowedPhases.has(phase) || !allowedSources.has(source)) return null;
  if (client && (!Number.isInteger(value.sequence) || value.sequence < 1 || value.sequence > 100)) return null;

  const result = { diagnosticId, source, phase };
  if (Number.isInteger(value.sequence) && value.sequence >= 1 && value.sequence <= 100) result.sequence = value.sequence;
  if (["jpg", "jpeg", "png", "webp", "other"].includes(value.extension)) result.extension = value.extension;
  const reportedMime = String(value.reportedMime || "").trim().toLowerCase();
  const normalizedMime = String(value.normalizedMime || "").trim().toLowerCase();
  if (REPORTED_MIME_TYPES.has(reportedMime)) result.reportedMime = reportedMime;
  if (NORMALIZED_MIME_TYPES.has(normalizedMime)) result.normalizedMime = normalizedMime;
  if (Number.isFinite(value.size)) result.size = Math.max(0, Math.min(Math.round(value.size), 15 * 1024 * 1024));
  if (Number.isFinite(value.durationMs)) result.durationMs = Math.max(0, Math.min(Math.round(value.durationMs), 120000));
  if (ERROR_CATEGORIES.has(value.errorCategory)) result.errorCategory = value.errorCategory;
  if (["android", "ios", "other"].includes(value.platform)) result.platform = value.platform;
  if (typeof value.authenticated === "boolean") result.authenticated = value.authenticated;
  const requestId = String(value.requestId || "");
  if (isDiagnosticOrderRequestId(requestId)) result.requestId = requestId;
  if (Number.isInteger(value.httpStatus) && value.httpStatus >= 0 && value.httpStatus <= 599) result.httpStatus = value.httpStatus;
  if (["multipart", "processing", "storage", "database"].includes(value.failureStage)) result.failureStage = value.failureStage;
  return result;
};

const validateClientUploadDiagnostic = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const keys = Object.keys(value);
  if (keys.length > CLIENT_KEYS.size || keys.some((key) => !CLIENT_KEYS.has(key))) return null;
  if (Buffer.byteLength(JSON.stringify(value), "utf8") > 2048) return null;
  return sanitizeCommon(value, { client: true });
};

const getRequestUploadDiagnostic = (req, source) => {
  const diagnosticId = String(req.get("x-darb-upload-diagnostic-id") || "");
  if (!isUploadDiagnosticId(diagnosticId) || !SERVER_SOURCES.has(source)) return null;
  const requestId = String(req.get("x-darb-order-request-id") || "");
  return {
    diagnosticId,
    source,
    authenticated: Boolean(req.user),
    ...(isDiagnosticOrderRequestId(requestId) ? { requestId } : {}),
  };
};

const logUploadPhase = (value, { client = false } = {}) => {
  const safe = client ? validateClientUploadDiagnostic(value) : sanitizeCommon(value);
  if (!safe) return false;
  console.info(JSON.stringify({ uploadEvent: "darb_upload_phase", origin: client ? "client" : "server", ...safe }));
  return true;
};

module.exports = {
  CLIENT_PHASES,
  getRequestUploadDiagnostic,
  isDiagnosticOrderRequestId,
  isUploadDiagnosticId,
  logUploadPhase,
  sanitizeCommon,
  validateClientUploadDiagnostic,
};
