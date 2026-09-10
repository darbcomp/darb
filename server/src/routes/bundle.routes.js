const express = require("express");

const {
  getPublicBundles,
  getAdminBundles,
  getAdminBundleById,
  createBundle,
  updateBundle,
  deleteBundle,
} = require("../controllers/bundle.controller");

const { protect } = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/admin.middleware");
const { uploadBundleImage } = require("../middleware/upload.middleware");

const router = express.Router();

router.get("/admin", protect, requireAdmin, getAdminBundles);
router.get("/admin/:id", protect, requireAdmin, getAdminBundleById);
router.post("/admin", protect, requireAdmin, uploadBundleImage, createBundle);
router.put("/admin/:id", protect, requireAdmin, uploadBundleImage, updateBundle);
router.delete("/admin/:id", protect, requireAdmin, deleteBundle);

router.get("/", getPublicBundles);

module.exports = router;
