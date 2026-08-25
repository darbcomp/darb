const express = require("express");

const {
  previewOrder,
  createOrder,
  getMyOrders,
  getMyOrderById,
  getAdminOrders,
  getAdminOrderById,
  updateAdminOrderStatus,
} = require("../controllers/order.controller");

const { protect, optionalAuth } = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/admin.middleware");

const router = express.Router();

router.post("/preview", optionalAuth, previewOrder);
router.post("/", optionalAuth, createOrder);

router.get("/mine", protect, getMyOrders);
router.get("/mine/:id", protect, getMyOrderById);

router.get("/admin", protect, requireAdmin, getAdminOrders);
router.get("/admin/:id", protect, requireAdmin, getAdminOrderById);
router.patch("/admin/:id/status", protect, requireAdmin, updateAdminOrderStatus);

module.exports = router;