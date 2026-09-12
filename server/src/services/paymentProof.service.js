const { randomUUID } = require("crypto");
const { processPaymentProof } = require("../utils/imageProcessor");
const {
  putPrivateObject,
  deletePrivateMedia,
  getPrivateMediaUrl,
} = require("./mediaStorage.service");

const PAYMENT_PROOF_URL_TTL_SECONDS = 5 * 60;

const buildPaymentProofKey = ({ now = new Date(), id = randomUUID() } = {}) =>
  `payment-proofs/${now.toISOString().slice(0, 10)}/proof-${now.getTime()}-${id}.webp`;

const uploadPaymentProofToR2 = async (file) => {
  if (!file?.buffer) throw new Error("Payment proof image is required.");
  const processed = await processPaymentProof(file.buffer);
  const key = buildPaymentProofKey();
  const stored = await putPrivateObject({
    buffer: processed.buffer,
    key,
    contentType: processed.mimeType,
  });
  return {
    status: "submitted",
    publicId: stored.publicId,
    assetId: "",
    resourceType: "image",
    deliveryType: "private-r2",
    format: "webp",
    originalName: file.originalname || "payment-proof",
    bytes: processed.size || 0,
    width: processed.width || 0,
    height: processed.height || 0,
    uploadedAt: new Date(),
    reviewedAt: null,
    reviewedBy: null,
    rejectionReason: "",
  };
};

const deletePaymentProofFromR2 = async (proof) => {
  const key = proof?.publicId || proof?.storageKey;
  if (!key) return;
  try {
    await deletePrivateMedia(key);
  } catch (error) {
    console.error("R2 payment-proof cleanup failed:", error.message);
  }
};

const getPaymentProofTemporaryUrl = (proof, ttlSeconds = PAYMENT_PROOF_URL_TTL_SECONDS) => {
  const key = proof?.publicId || proof?.storageKey;
  if (!key) throw new Error("Payment proof file is unavailable.");
  return getPrivateMediaUrl(key, ttlSeconds);
};

module.exports = {
  PAYMENT_PROOF_URL_TTL_SECONDS,
  buildPaymentProofKey,
  uploadPaymentProofToR2,
  deletePaymentProofFromR2,
  getPaymentProofTemporaryUrl,
};
