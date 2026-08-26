const express = require("express");

const {
  previewOrder,
  createOrder,
  getMyOrders,
  getMyOrderById,
  getAdminOrders,
  getAdminOrderById,
  getAdminPaymentProofUrl,
  reviewAdminPaymentProof,
  updateAdminOrderStatus,
} = require("../controllers/order.controller");

const {
  getGuestPaymentProofStatus,
  resubmitGuestPaymentProof,
  resubmitMyPaymentProof,
} = require("../controllers/paymentProofResubmission.controller");

const {
  trackOrder,
} = require("../controllers/trackOrder.controller");

const {
  protect,
  optionalAuth,
} = require("../middleware/auth.middleware");

const {
  requireAdmin,
} = require("../middleware/admin.middleware");

const {
  uploadPaymentProof,
} = require("../middleware/upload.middleware");

const router =
  express.Router();

/* =========================
   Public
========================= */

router.post(
  "/track/payment-proof/status",
  getGuestPaymentProofStatus
);

router.post(
  "/track/payment-proof",
  uploadPaymentProof,
  resubmitGuestPaymentProof
);

router.post(
  "/track",
  trackOrder
);

router.post(
  "/preview",
  optionalAuth,
  previewOrder
);

router.post(
  "/",
  optionalAuth,
  uploadPaymentProof,
  createOrder
);

/* =========================
   Customer Account
========================= */

router.get(
  "/mine",
  protect,
  getMyOrders
);

router.post(
  "/mine/:id/payment-proof",
  protect,
  uploadPaymentProof,
  resubmitMyPaymentProof
);

router.get(
  "/mine/:id",
  protect,
  getMyOrderById
);

/* =========================
   Admin
========================= */

router.get(
  "/admin",
  protect,
  requireAdmin,
  getAdminOrders
);

router.get(
  "/admin/:id/payment-proof",
  protect,
  requireAdmin,
  getAdminPaymentProofUrl
);

router.patch(
  "/admin/:id/payment-proof",
  protect,
  requireAdmin,
  reviewAdminPaymentProof
);

router.patch(
  "/admin/:id/status",
  protect,
  requireAdmin,
  updateAdminOrderStatus
);

router.get(
  "/admin/:id",
  protect,
  requireAdmin,
  getAdminOrderById
);

module.exports =
  router;