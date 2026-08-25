const express = require("express");

const {
  validateCoupon,
  getAdminCoupons,
  getAdminCouponById,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} = require("../controllers/coupon.controller");

const { protect } = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/admin.middleware");

const router = express.Router();

router.post("/validate", validateCoupon);

router.get("/admin", protect, requireAdmin, getAdminCoupons);
router.get("/admin/:id", protect, requireAdmin, getAdminCouponById);
router.post("/admin", protect, requireAdmin, createCoupon);
router.put("/admin/:id", protect, requireAdmin, updateCoupon);
router.delete("/admin/:id", protect, requireAdmin, deleteCoupon);

module.exports = router;