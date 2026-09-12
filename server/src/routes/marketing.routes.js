const express = require("express");
const { mirrorMarketingEvent } = require("../controllers/marketing.controller");
const { marketingEventLimiter } = require("../middleware/security.middleware");
const { protect } = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/admin.middleware");
const { preview, sendLive, sendTest, unsubscribe } = require("../controllers/promotionEmail.controller");

const router = express.Router();
router.post("/events", marketingEventLimiter, mirrorMarketingEvent);
router.post("/admin/promotions/preview", protect, requireAdmin, preview);
router.post("/admin/promotions/test", protect, requireAdmin, sendTest);
router.post("/admin/promotions/send", protect, requireAdmin, sendLive);
router.post("/unsubscribe", unsubscribe);

module.exports = router;
