const express = require("express");
const { registerCustomer, loginCustomer, loginAdmin, getMe, logout } = require("../controllers/auth.controller");
const { protect } = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/admin.middleware");
const { authLimiter, adminAuthLimiter } = require("../middleware/security.middleware");

const router = express.Router();
router.post("/register", authLimiter, registerCustomer);
router.post("/login", authLimiter, loginCustomer);
router.post("/admin/login", adminAuthLimiter, loginAdmin);
router.post("/logout", logout);
router.get("/me", protect, getMe);
router.get("/admin/me", protect, requireAdmin, getMe);
module.exports = router;
