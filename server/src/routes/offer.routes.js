const express = require("express");

const {
  getPublicOffers,
  getAdminOffers,
  getAdminOfferById,
  createOffer,
  updateOffer,
  deleteOffer,
} = require("../controllers/offer.controller");

const { protect } = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/admin.middleware");

const router = express.Router();

router.get("/admin", protect, requireAdmin, getAdminOffers);
router.get("/admin/:id", protect, requireAdmin, getAdminOfferById);
router.post("/admin", protect, requireAdmin, createOffer);
router.put("/admin/:id", protect, requireAdmin, updateOffer);
router.delete("/admin/:id", protect, requireAdmin, deleteOffer);

router.get("/", getPublicOffers);

module.exports = router;