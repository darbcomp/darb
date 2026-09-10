const express = require("express");
const { getMyRewards, spin, claimGuestOrderSpin, claimPolicyReward } = require("../controllers/reward.controller");
const { protect } = require("../middleware/auth.middleware");
const { guestRewardLimiter } = require("../middleware/security.middleware");

const router = express.Router();
router.post("/guest/order-spin", guestRewardLimiter, claimGuestOrderSpin);
router.get("/mine", protect, getMyRewards);
router.post("/spin", protect, spin);
router.post("/policy", protect, claimPolicyReward);
module.exports = router;
