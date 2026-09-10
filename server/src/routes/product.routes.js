const express = require("express");
const {
  getProducts,
  getFeaturedProducts,
  getProductBySlug,
  getAdminProducts,
  getAdminProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  deleteProductImage,
  getSearchSuggestions,
} = require("../controllers/product.controller");
const { protect } = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/admin.middleware");
const { uploadProductImages } = require("../middleware/upload.middleware");
const { validateProductRequest } = require("../validators/product.validator");

const router = express.Router();
router.get("/admin", protect, requireAdmin, getAdminProducts);
router.get("/admin/:id", protect, requireAdmin, getAdminProductById);
router.post("/admin", protect, requireAdmin, uploadProductImages, validateProductRequest, createProduct);
router.put("/admin/:id", protect, requireAdmin, uploadProductImages, validateProductRequest, updateProduct);
router.delete("/admin/:id", protect, requireAdmin, deleteProduct);
router.delete("/admin/:id/image", protect, requireAdmin, deleteProductImage);
router.get("/featured", getFeaturedProducts);
router.get("/search/suggestions", getSearchSuggestions);
router.get("/", getProducts);
router.get("/:slug", getProductBySlug);
module.exports = router;
