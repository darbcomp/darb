const express = require("express");

const {
  createWaitlistRequest,
  getAdminWaitlist,
  getAdminWaitlistRequestById,
  updateAdminWaitlistRequest,
  deleteAdminWaitlistRequest,
} = require("../controllers/waitlist.controller");

const { protect } = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/admin.middleware");

const router = express.Router();

router.post("/", createWaitlistRequest);

router.get("/admin", protect, requireAdmin, getAdminWaitlist);
router.get("/admin/:id", protect, requireAdmin, getAdminWaitlistRequestById);
router.patch("/admin/:id", protect, requireAdmin, updateAdminWaitlistRequest);
router.delete("/admin/:id", protect, requireAdmin, deleteAdminWaitlistRequest);

module.exports = router;