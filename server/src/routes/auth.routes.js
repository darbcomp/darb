const express = require("express");

const {
  registerCustomer,
  loginCustomer,
  loginAdmin,
  getMe,
  logout,
} = require("../controllers/auth.controller");

const { protect } = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/admin.middleware");

const router = express.Router();

router.post("/register", registerCustomer);
router.post("/login", loginCustomer);
router.post("/admin/login", loginAdmin);
router.post("/logout", logout);

router.get("/me", protect, getMe);
router.get("/admin/me", protect, requireAdmin, getMe);

module.exports = router;