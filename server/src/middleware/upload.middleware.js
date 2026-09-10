const multer = require("multer");

const storage = multer.memoryStorage();

const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/jpg",
];

const fileFilter = (req, file, cb) => {
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(
      new Error("Only JPG, PNG, and WEBP images are allowed."),
      false
    );
  }

  return cb(null, true);
};

const createImageUpload = (maxBytes) =>
  multer({
    storage,
    fileFilter,
    limits: {
      fileSize: maxBytes,
    },
  });

// Product/category images stay at the existing 5 MB source limit.
const upload = createImageUpload(5 * 1024 * 1024);

// Payment screenshots may be larger on modern phones, so allow up to 10 MB.
const paymentProofUpload = createImageUpload(10 * 1024 * 1024);

const uploadProductImages = upload.array("images", 3);
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
