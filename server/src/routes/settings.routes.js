const express = require("express");

const {
  getPublicSettings,
  getAdminSettings,
  updateAdminSettings,
} = require("../controllers/settings.controller");

const { protect } = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/admin.middleware");

const router = express.Router();

router.get("/public", getPublicSettings);

router.get("/admin", protect, requireAdmin, getAdminSettings);
router.put("/admin", protect, requireAdmin, updateAdminSettings);
router.patch("/admin", protect, requireAdmin, updateAdminSettings);

module.exports = router;