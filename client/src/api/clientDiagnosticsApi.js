import { deliverUploadDiagnostic } from "../utils/uploadDiagnosticPayload.js";

const apiBaseUrl = String(import.meta.env?.VITE_API_BASE_URL || "http://localhost:5000/api").replace(/\/$/, "");

export const createDiagnosticFetchTransport = (
  fetchImplementation = globalThis.fetch,
  baseUrl = apiBaseUrl
) => async (payload) => {
  if (typeof fetchImplementation !== "function") throw new Error("Diagnostic transport is unavailable.");
  const response = await fetchImplementation(`${String(baseUrl).replace(/\/$/, "")}/client-diagnostics/upload`, {
    method: "POST",
    credentials: "omit",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response?.ok) throw new Error("Diagnostic request was not accepted.");
};

export async function sendUploadDiagnostic(value, transport = createDiagnosticFetchTransport()) {
  return deliverUploadDiagnostic(value, transport);
}

export const createSequencedUploadDiagnosticReporter = (transport, maxSessions = 50) => {
  const sequences = new Map();
  return (value) => {
    const diagnosticId = String(value?.diagnosticId || "");
    const sequence = (sequences.get(diagnosticId) || 0) + 1;
    sequences.delete(diagnosticId);
    sequences.set(diagnosticId, sequence);
    while (sequences.size > maxSessions) sequences.delete(sequences.keys().next().value);
    if (["validation_failed", "byte_read_failed"].includes(value?.phase)) {
      sequences.delete(diagnosticId);
    }
    return sendUploadDiagnostic({ ...value, sequence }, transport);
  };
};

const reportSequencedUploadDiagnostic = createSequencedUploadDiagnosticReporter(createDiagnosticFetchTransport());

export function reportUploadDiagnostic(value) {
  void reportSequencedUploadDiagnostic(value);
}
