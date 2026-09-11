const express = require("express");
const { mirrorMarketingEvent } = require("../controllers/marketing.controller");
const { marketingEventLimiter } = require("../middleware/security.middleware");

const router = express.Router();
router.post("/events", marketingEventLimiter, mirrorMarketingEvent);

module.exports = router;
