const express = require("express");
const {
  getPublicReviews,
  getReviewEligibility,
  createCustomerReview,
  getMyReview,
  getAdminReviews,
  createAdminReview,
  updateAdminReview,
  deleteAdminReview,
} = require("../controllers/review.controller");
const { protect } = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/admin.middleware");
const { uploadReviewImage } = require("../middleware/upload.middleware");

const router = express.Router();
router.get("/", getPublicReviews);
router.get("/eligibility", protect, getReviewEligibility);
router.get("/mine", protect, getMyReview);
router.post("/", protect, uploadReviewImage, createCustomerReview);
router.get("/admin", protect, requireAdmin, getAdminReviews);
// Admin review creation/editing is text-only by design. Launch videos are
// imported through a controlled development path after optimization.
router.post("/admin", protect, requireAdmin, createAdminReview);
router.patch("/admin/:id", protect, requireAdmin, updateAdminReview);
router.delete("/admin/:id", protect, requireAdmin, deleteAdminReview);
module.exports = router;
