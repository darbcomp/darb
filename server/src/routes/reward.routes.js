const router = require("express").Router();
const { protect } = require("../middleware/auth.middleware");
const { getMyRewards, spin, claimPolicyReward } = require("../controllers/reward.controller");
router.get("/mine", protect, getMyRewards);
router.post("/spin", protect, spin);
router.post("/policy", protect, claimPolicyReward);
module.exports = router;
