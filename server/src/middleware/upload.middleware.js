const multer = require("multer");

const storage = multer.memoryStorage();
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/jpg"]);

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

const upload = createImageUpload(5 * 1024 * 1024);
const paymentProofUpload = createImageUpload(10 * 1024 * 1024);

const uploadProductImages = upload.array("images", 10);
const uploadCategoryImage = upload.single("image");
const uploadPaymentProof = paymentProofUpload.single("paymentProof");
const uploadBundleImage = upload.single("image");
const uploadReviewImage = upload.single("image");

module.exports = {
  allowedMimeTypes,
  fileFilter,
  upload,
  uploadProductImages,
  uploadCategoryImage,
  uploadPaymentProof,
  uploadBundleImage,
  uploadReviewImage,
};
