const express = require("express");

const { getAdminDashboard } = require("../controllers/admin.controller");
const { protect } = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/admin.middleware");

const router = express.Router();

router.get("/", protect, requireAdmin, getAdminDashboard);
router.get("/dashboard", protect, requireAdmin, getAdminDashboard);
router.get("/analytics", protect, requireAdmin, getAdminDashboard);

module.exports = router;