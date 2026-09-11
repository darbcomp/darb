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
const { trackOrder } = require("../controllers/trackOrder.controller");
const { protect, optionalAuth } = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/admin.middleware");
const { uploadPaymentProof } = require("../middleware/upload.middleware");
const { orderPreviewLimiter } = require("../middleware/security.middleware");
const { trackingLimiter, orderCreateLimiter } = require("../middleware/security.middleware");

const router = express.Router();
router.post("/track/payment-proof/status", trackingLimiter, getGuestPaymentProofStatus);
router.post("/track/payment-proof", trackingLimiter, uploadPaymentProof, resubmitGuestPaymentProof);
router.post("/track", trackingLimiter, trackOrder);
router.post("/preview", orderPreviewLimiter, optionalAuth, previewOrder);
router.post("/", orderCreateLimiter, optionalAuth, uploadPaymentProof, createOrder);
router.get("/mine", protect, getMyOrders);
router.post("/mine/:id/payment-proof", protect, uploadPaymentProof, resubmitMyPaymentProof);
router.get("/mine/:id", protect, getMyOrderById);
router.get("/admin", protect, requireAdmin, getAdminOrders);
router.get("/admin/:id/payment-proof", protect, requireAdmin, getAdminPaymentProofUrl);
router.patch("/admin/:id/payment-proof", protect, requireAdmin, reviewAdminPaymentProof);
router.patch("/admin/:id/status", protect, requireAdmin, updateAdminOrderStatus);
router.get("/admin/:id", protect, requireAdmin, getAdminOrderById);
module.exports = router;
