const multer = require("multer");

const storage = multer.memoryStorage();
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/jpg"]);

const fileFilter = (_req, file, cb) => {
  if (!allowedMimeTypes.has(file.mimetype)) {
    return cb(new Error("Only JPG, PNG, and WEBP images are allowed."), false);
  }
  return cb(null, true);
};

const createImageUpload = (maxBytes) =>
  multer({ storage, fileFilter, limits: { fileSize: maxBytes } });

const upload = createImageUpload(5 * 1024 * 1024);
const paymentProofUpload = createImageUpload(10 * 1024 * 1024);

const uploadProductImages = upload.array("images", 10);
const uploadCategoryImage = upload.single("image");
const uploadPaymentProof = paymentProofUpload.single("paymentProof");
const uploadBundleImage = upload.single("image");
const uploadReviewImage = upload.single("image");

module.exports = {
  upload,
  uploadProductImages,
  uploadCategoryImage,
  uploadPaymentProof,
  uploadBundleImage,
  uploadReviewImage,
};
