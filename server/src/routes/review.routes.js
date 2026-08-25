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

const {
  protect,
} = require("../middleware/auth.middleware");

const {
  requireAdmin,
} = require("../middleware/admin.middleware");

const router = express.Router();

/* =========================
   Public
========================= */

router.get(
  "/",
  getPublicReviews
);

/* =========================
   Customer
========================= */

router.get(
  "/eligibility",
  protect,
  getReviewEligibility
);

router.get(
  "/mine",
  protect,
  getMyReview
);

router.post(
  "/",
  protect,
  createCustomerReview
);

/* =========================
   Admin
========================= */

router.get(
  "/admin",
  protect,
  requireAdmin,
  getAdminReviews
);

router.post(
  "/admin",
  protect,
  requireAdmin,
  createAdminReview
);

router.patch(
  "/admin/:id",
  protect,
  requireAdmin,
  updateAdminReview
);

router.delete(
  "/admin/:id",
  protect,
  requireAdmin,
  deleteAdminReview
);

module.exports = router;