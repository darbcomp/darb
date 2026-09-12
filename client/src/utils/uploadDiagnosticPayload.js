export const CLIENT_UPLOAD_PHASES = Object.freeze([
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

const PHASES = new Set(CLIENT_UPLOAD_PHASES);
const SOURCES = new Set([
  "checkout_initial",
  "checkout_change",
  "checkout_drop",
  "track_order_resubmission",
  "account_order_resubmission",
]);
const ERROR_CATEGORIES = new Set(["not_readable", "aborted", "security", "unknown"]);
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
const PAYLOAD_KEYS = new Set([
  "diagnosticId", "phase", "source", "extension", "reportedMime", "normalizedMime",
  "size", "durationMs", "errorCategory", "platform", "authenticated", "requestId", "httpStatus", "sequence",
]);

export const isUploadDiagnosticId = (value) => UUID_V4.test(String(value || "")) || UPLOAD_FALLBACK_ID.test(String(value || ""));
export const isDiagnosticOrderRequestId = (value) => UUID_V4.test(String(value || "")) || ORDER_FALLBACK_ID.test(String(value || ""));

export const createUploadDiagnosticId = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const random = `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`
    .slice(0, 12)
    .padEnd(12, "0");
  return `upload_${Date.now().toString(36)}_${random}`;
};

export const getSafeFileExtension = (name) => {
  const extension = String(name || "").toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] || "";
  return ["jpg", "jpeg", "png", "webp"].includes(extension) ? extension : "other";
};

export const getPlatformCategory = () => {
  const platform = String(globalThis.navigator?.userAgentData?.platform || globalThis.navigator?.platform || "").toLowerCase();
  const userAgent = String(globalThis.navigator?.userAgent || "").toLowerCase();
  if (platform.includes("android") || userAgent.includes("android")) return "android";
  if (/iphone|ipad|ipod/.test(platform) || /iphone|ipad|ipod/.test(userAgent)) return "ios";
  return "other";
};

export function sanitizeUploadDiagnosticPayload(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const keys = Object.keys(value);
  if (keys.length > PAYLOAD_KEYS.size || keys.some((key) => !PAYLOAD_KEYS.has(key))) return null;
  const diagnosticId = String(value.diagnosticId || "");
  const phase = String(value.phase || "");
  const source = String(value.source || "");
  if (!isUploadDiagnosticId(diagnosticId) || !PHASES.has(phase) || !SOURCES.has(source)) return null;
  if (!Number.isInteger(value.sequence) || value.sequence < 1 || value.sequence > 100) return null;

  const payload = { diagnosticId, phase, source, sequence: value.sequence };
  if (["jpg", "jpeg", "png", "webp", "other"].includes(value.extension)) payload.extension = value.extension;
  const reportedMime = String(value.reportedMime || "").trim().toLowerCase();
  const normalizedMime = String(value.normalizedMime || "").trim().toLowerCase();
  if (REPORTED_MIME_TYPES.has(reportedMime)) payload.reportedMime = reportedMime;
  if (NORMALIZED_MIME_TYPES.has(normalizedMime)) payload.normalizedMime = normalizedMime;
  if (Number.isFinite(value.size)) payload.size = Math.max(0, Math.min(Math.round(value.size), 15 * 1024 * 1024));
  if (Number.isFinite(value.durationMs)) payload.durationMs = Math.max(0, Math.min(Math.round(value.durationMs), 120000));
  if (ERROR_CATEGORIES.has(value.errorCategory)) payload.errorCategory = value.errorCategory;
  if (["android", "ios", "other"].includes(value.platform)) payload.platform = value.platform;
  if (typeof value.authenticated === "boolean") payload.authenticated = value.authenticated;
  if (isDiagnosticOrderRequestId(value.requestId)) payload.requestId = String(value.requestId);
  if (Number.isInteger(value.httpStatus) && value.httpStatus >= 0 && value.httpStatus <= 599) payload.httpStatus = value.httpStatus;
  return payload;
}

export async function deliverUploadDiagnostic(value, transport) {
  const payload = sanitizeUploadDiagnosticPayload(value);
  if (!payload || typeof transport !== "function") return false;
  try {
    await transport(payload);
    return true;
  } catch {
    return false;
  }
}
