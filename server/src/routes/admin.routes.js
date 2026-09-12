const express = require("express");

const { getAdminDashboard } = require("../controllers/admin.controller");
const { getAdminCustomer, getAdminCustomers } = require("../controllers/customer.controller");
const { protect } = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/admin.middleware");

const router = express.Router();

router.get("/", protect, requireAdmin, getAdminDashboard);
router.get("/dashboard", protect, requireAdmin, getAdminDashboard);
router.get("/analytics", protect, requireAdmin, getAdminDashboard);
router.get("/customers", protect, requireAdmin, getAdminCustomers);
router.get("/customers/:key", protect, requireAdmin, getAdminCustomer);

module.exports = router;
