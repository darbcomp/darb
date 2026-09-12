import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  getSelectedImageMimeType,
  prepareImagePickerInput,
  snapshotSelectedImageFile,
} from "../src/utils/selectedImageFile.js";
import {
  isDiagnosticOrderRequestId,
  isUploadDiagnosticId,
  createUploadDiagnosticId,
  deliverUploadDiagnostic,
  sanitizeUploadDiagnosticPayload,
} from "../src/utils/uploadDiagnosticPayload.js";
import {
  createDiagnosticFetchTransport,
  createSequencedUploadDiagnosticReporter,
} from "../src/api/clientDiagnosticsApi.js";

const diagnosticBase = () => ({
  diagnosticId: createUploadDiagnosticId(),
  source: "checkout_initial",
  phase: "file_selected",
  sequence: 1,
});

test("all customer payment-proof inputs intentionally omit accept", async () => {
  for (const path of [
    "src/pages/public/Checkout.jsx",
    "src/pages/public/TrackOrder.jsx",
    "src/pages/account/MyOrders.jsx",
  ]) {
    const source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
    assert.equal(/\baccept\s*=/.test(source), false, path);
  }
});

test("generic picker rejects PDF but snapshots supported image types", async () => {
  assert.equal(getSelectedImageMimeType({ name: "proof.pdf", type: "application/pdf" }), "");
  for (const [name, type] of [["proof.jpg", "image/jpeg"], ["proof.png", "image/png"], ["proof.webp", "image/webp"]]) {
    const original = new File(["bytes"], name, { type });
    const stable = await snapshotSelectedImageFile(original);
    assert.notEqual(stable.blob, original);
    assert.equal(stable.type, type);
  }
});

test("picker value is prepared before each opening and same file can be read twice", async () => {
  const input = { value: "previous-native-selection" };
  const selected = new File(["proof"], "same.jpg", { type: "image/jpeg" });
  prepareImagePickerInput(input);
  assert.equal(input.value, "");
  const first = await snapshotSelectedImageFile(selected);
  input.value = "same-native-selection";
  prepareImagePickerInput(input);
  assert.equal(input.value, "");
  const second = await snapshotSelectedImageFile(selected);
  assert.equal(await first.blob.text(), await second.blob.text());
});

test("async preparation retains the picker file throughout byte reading", async () => {
  let release;
  const selected = {
    name: "proof.jpg",
    type: "image/jpeg",
    size: 5,
    arrayBuffer: () => new Promise((resolve) => { release = () => resolve(new TextEncoder().encode("proof").buffer); }),
  };
  const preparing = snapshotSelectedImageFile(selected);
  assert.equal(selected.name, "proof.jpg");
  release();
  assert.equal((await preparing).name, "proof.jpg");
});

test("byte-read failures emit only safe diagnostic categories", async () => {
  const phases = [];
  const selected = {
    name: "proof.jpg",
    type: "image/jpeg",
    arrayBuffer: async () => { const error = new Error("private/provider/path"); error.name = "NotReadableError"; throw error; },
  };
  await assert.rejects(snapshotSelectedImageFile(selected, { onPhase: (phase, details) => phases.push({ phase, ...details }) }));
  assert.ok(phases.some(({ phase, errorCategory }) => phase === "byte_read_arraybuffer_failed" && errorCategory === "not_readable"));
  assert.ok(phases.some(({ phase }) => phase === "byte_read_failed"));
  assert.equal(JSON.stringify(phases).includes("private/provider/path"), false);
});

test("diagnostic payload rejects filename, PII, private keys, and unknown phases", () => {
  assert.equal(sanitizeUploadDiagnosticPayload({ ...diagnosticBase(), filename: "proof.jpg" }), null);
  assert.equal(sanitizeUploadDiagnosticPayload({ ...diagnosticBase(), email: "customer@example.com" }), null);
  assert.equal(sanitizeUploadDiagnosticPayload({ ...diagnosticBase(), privateKey: "payment-proofs/key" }), null);
  assert.equal(sanitizeUploadDiagnosticPayload({ ...diagnosticBase(), phase: "arbitrary_phase" }), null);
});

test("diagnostic and order request IDs accept only Darb-generated formats", () => {
  const uuid = "123e4567-e89b-42d3-a456-426614174000";
  assert.equal(isUploadDiagnosticId(uuid), true);
  assert.equal(isUploadDiagnosticId("upload_lxyz1234_abcdef123456"), true);
  assert.equal(isUploadDiagnosticId("01012345678"), false);
  assert.equal(isUploadDiagnosticId("arbitraryIdentifier123"), false);
  assert.equal(isDiagnosticOrderRequestId(uuid), true);
  assert.equal(isDiagnosticOrderRequestId("darb-lxyz1234-abc123-def456"), true);
  assert.equal(sanitizeUploadDiagnosticPayload({ ...diagnosticBase(), requestId: uuid }).requestId, uuid);
  assert.equal(sanitizeUploadDiagnosticPayload({ ...diagnosticBase(), requestId: "darb-lxyz1234-abc123-def456" }).requestId, "darb-lxyz1234-abc123-def456");

  assert.equal(sanitizeUploadDiagnosticPayload({ ...diagnosticBase(), requestId: "01012345678" }).requestId, undefined);
  assert.equal(sanitizeUploadDiagnosticPayload({ ...diagnosticBase(), requestId: "arbitraryIdentifier123" }).requestId, undefined);
});

test("diagnostic MIME logging is enum-based", () => {
  for (const reportedMime of ["image/jpeg", "image/jpg", "image/png", "image/webp"]) {
    assert.equal(sanitizeUploadDiagnosticPayload({ ...diagnosticBase(), reportedMime }).reportedMime, reportedMime);
  }
  const reported = sanitizeUploadDiagnosticPayload({
    ...diagnosticBase(),
    reportedMime: "application/octet-stream",
    normalizedMime: "application/octet-stream",
  });
  assert.equal(reported.reportedMime, "application/octet-stream");
  assert.equal(reported.normalizedMime, undefined);

  const arbitrary = sanitizeUploadDiagnosticPayload({
    ...diagnosticBase(),
    reportedMime: "application/customer-secret",
    normalizedMime: "application/customer-secret",
  });
  assert.equal(arbitrary.reportedMime, undefined);
  assert.equal(arbitrary.normalizedMime, undefined);
  assert.equal(sanitizeUploadDiagnosticPayload({ ...diagnosticBase(), reportedMime: "image/jpg", normalizedMime: "image/jpeg" }).normalizedMime, "image/jpeg");
});

test("network-error retry continues the same diagnostic sequence while unreadable selections reset", async () => {
  const received = [];
  const report = createSequencedUploadDiagnosticReporter(async (payload) => { received.push(payload); });
  const diagnosticId = "upload_lxyz1234_abcdef123456";
  await Promise.all([
    report({ diagnosticId, source: "checkout_initial", phase: "picker_opened" }),
    report({ diagnosticId, source: "checkout_initial", phase: "order_submit_started" }),
    report({ diagnosticId, source: "checkout_initial", phase: "order_network_error" }),
    report({ diagnosticId, source: "checkout_initial", phase: "order_submit_started" }),
  ]);
  assert.deepEqual(received.slice(0, 4).map(({ sequence }) => sequence), [1, 2, 3, 4]);

  const validationId = "upload_lxyz1235_abcdef123456";
  await report({ diagnosticId: validationId, source: "checkout_initial", phase: "picker_opened" });
  await report({ diagnosticId: validationId, source: "checkout_initial", phase: "validation_failed" });
  await report({ diagnosticId: validationId, source: "checkout_initial", phase: "picker_opened" });
  assert.deepEqual(received.slice(4, 7).map(({ sequence }) => sequence), [1, 2, 1]);

  const readFailureId = "upload_lxyz1236_abcdef123456";
  await report({ diagnosticId: readFailureId, source: "checkout_initial", phase: "picker_opened" });
  await report({ diagnosticId: readFailureId, source: "checkout_initial", phase: "byte_read_failed" });
  await report({ diagnosticId: readFailureId, source: "checkout_initial", phase: "picker_opened" });
  assert.deepEqual(received.slice(7).map(({ sequence }) => sequence), [1, 2, 1]);
});

test("dedicated diagnostic transport omits credentials and auth headers", async () => {
  let request;
  const transport = createDiagnosticFetchTransport(async (url, options) => {
    request = { url, options };
    return { ok: true };
  }, "https://api.example.test/api/");
  await transport(diagnosticBase());
  assert.equal(request.url, "https://api.example.test/api/client-diagnostics/upload");
  assert.equal(request.options.credentials, "omit");
  assert.deepEqual(request.options.headers, { "Content-Type": "application/json" });
  assert.equal("Authorization" in request.options.headers, false);
  assert.equal("X-CSRF-Token" in request.options.headers, false);
});

test("diagnostic delivery failure cannot break checkout behavior", async () => {
  const sent = await deliverUploadDiagnostic(diagnosticBase(), async () => { throw new Error("offline"); });
  assert.equal(sent, false);
});

test("product hover and rewards launcher use capability-aware mobile styles", async () => {
  const css = await readFile(new URL("../src/index.css", import.meta.url), "utf8");
  const product = await readFile(new URL("../src/components/product/ProductCard.jsx", import.meta.url), "utf8");
  const rewards = await readFile(new URL("../src/components/rewards/RewardLauncher.jsx", import.meta.url), "utf8");
  assert.match(css, /@media \(hover: hover\) and \(pointer: fine\)/);
  assert.match(css, /\.product-card-add-button:not\(:disabled\):hover/);
  assert.doesNotMatch(product, /hover:bg-darb-gold hover:text-darb-green/);
  assert.match(rewards, /h-12 w-12/);
  assert.match(rewards, /pathname === "\/checkout"/);
});
