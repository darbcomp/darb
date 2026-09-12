const multer = require("multer");

const storage = multer.memoryStorage();
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/jpg"]);
const PUBLIC_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const PAYMENT_PROOF_MAX_BYTES = 10 * 1024 * 1024;

const fileFilter = (_req, file, cb) => {
  if (!allowedMimeTypes.has(file.mimetype)) {
    const error = new Error("Only JPG, PNG, and WEBP images are allowed.");
    error.code = "UNSUPPORTED_IMAGE_TYPE";
    error.statusCode = 400;
    return cb(error, false);
  }
  return cb(null, true);
};

const createImageUpload = (maxBytes) =>
  multer({
    storage,
    fileFilter,
    limits: { fileSize: maxBytes, fieldSize: 256 * 1024, fields: 100, parts: 115 },
  });

const upload = createImageUpload(PUBLIC_IMAGE_MAX_BYTES);
const paymentProofUpload = createImageUpload(PAYMENT_PROOF_MAX_BYTES);

const uploadProductImages = upload.array("images", 10);
const uploadCategoryImage = upload.single("image");
const uploadPaymentProof = paymentProofUpload.single("paymentProof");
const uploadBundleImage = upload.single("image");
const uploadReviewImage = upload.single("image");

module.exports = {
  allowedMimeTypes,
  PUBLIC_IMAGE_MAX_BYTES,
  PAYMENT_PROOF_MAX_BYTES,
  fileFilter,
  upload,
  uploadProductImages,
  uploadCategoryImage,
  uploadPaymentProof,
  uploadBundleImage,
  uploadReviewImage,
};
