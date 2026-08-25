const express = require("express");

const {
  getCategories,
  getCategoryBySlug,
  getAdminCategories,
  getAdminCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/category.controller");

const { protect } = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/admin.middleware");
const { upload } = require("../middleware/upload.middleware");

const router = express.Router();

router.get("/admin", protect, requireAdmin, getAdminCategories);
router.get("/admin/:id", protect, requireAdmin, getAdminCategoryById);

router.post(
  "/admin",
  protect,
  requireAdmin,
  upload.single("image"),
  createCategory
);

router.put(
  "/admin/:id",
  protect,
  requireAdmin,
  upload.single("image"),
  updateCategory
);

router.delete("/admin/:id", protect, requireAdmin, deleteCategory);

router.get("/", getCategories);
router.get("/:slug", getCategoryBySlug);

module.exports = router;