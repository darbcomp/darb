const { randomUUID } = require("crypto");

const { cloudinary } = require("../config/cloudinary");
const { processPaymentProof } = require("../utils/imageProcessor");

const PAYMENT_PROOF_FOLDER = "darb/payment-proofs";
const PAYMENT_PROOF_DELIVERY_TYPE = "authenticated";
const PAYMENT_PROOF_URL_TTL_SECONDS = 5 * 60;

const isCloudinaryReady = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );

const uploadBufferToCloudinary = (buffer, options = {}) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || PAYMENT_PROOF_FOLDER,
        public_id: options.publicId || randomUUID(),
        resource_type: "image",
        type: PAYMENT_PROOF_DELIVERY_TYPE,
        format: "webp",
        overwrite: false,
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        return resolve(result);
      }
    );

    stream.end(buffer);
  });

const uploadPaymentProofToCloudinary = async (file) => {
  if (!file?.buffer) {
    throw new Error("Payment proof image is required.");
  }

  if (!isCloudinaryReady()) {
    throw new Error(
      "Cloudinary credentials are missing. Payment proof upload is unavailable."
    );
  }

  const processed = await processPaymentProof(file.buffer);

  const result = await uploadBufferToCloudinary(processed.buffer, {
    folder: PAYMENT_PROOF_FOLDER,
    publicId: `proof-${Date.now()}-${randomUUID()}`,
  });

  return {
    status: "submitted",
    publicId: result.public_id,
    assetId: result.asset_id || "",
    resourceType: result.resource_type || "image",
    deliveryType: result.type || PAYMENT_PROOF_DELIVERY_TYPE,
    format: result.format || "webp",
    originalName: file.originalname || "payment-proof",
    bytes: Number(result.bytes) || processed.size || 0,
    width: Number(result.width) || processed.width || 0,
    height: Number(result.height) || processed.height || 0,
    uploadedAt: new Date(),
    reviewedAt: null,
    reviewedBy: null,
    rejectionReason: "",
  };
};

const deletePaymentProofFromCloudinary = async (proof) => {
  const publicId = proof?.publicId;

  if (!publicId || !isCloudinaryReady()) {
    return;
  }

  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: proof.resourceType || "image",
      type: proof.deliveryType || PAYMENT_PROOF_DELIVERY_TYPE,
      invalidate: true,
    });
  } catch (error) {
    console.error(
      `Cloudinary payment-proof cleanup failed for ${publicId}:`,
      error.message
    );
  }
};

const getPaymentProofTemporaryUrl = (proof, ttlSeconds = PAYMENT_PROOF_URL_TTL_SECONDS) => {
  if (!proof?.publicId) {
    throw new Error("Payment proof file is unavailable.");
  }

  if (!isCloudinaryReady()) {
    throw new Error("Cloudinary is unavailable.");
  }

  const expiresAt =
    Math.floor(Date.now() / 1000) + Math.max(Number(ttlSeconds) || 0, 60);

  return cloudinary.utils.private_download_url(
    proof.publicId,
    proof.format || "webp",
    {
      resource_type: proof.resourceType || "image",
      type: proof.deliveryType || PAYMENT_PROOF_DELIVERY_TYPE,
      expires_at: expiresAt,
      attachment: false,
    }
  );
};

module.exports = {
  PAYMENT_PROOF_URL_TTL_SECONDS,
  uploadPaymentProofToCloudinary,
  deletePaymentProofFromCloudinary,
  getPaymentProofTemporaryUrl,
};
