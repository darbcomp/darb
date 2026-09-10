const mongoose = require("mongoose");
const { randomInt, randomBytes } = require("crypto");
const User = require("../models/User");
const Entitlement = require("../models/Entitlement");
const { getAvailableEntitlements } = require("../services/entitlement.service");
const { sendEmail } = require("../config/mailer");

const SPIN_REWARDS = [
  { key: "spin-5", type: "percentage", label: "5% off an order", value: 5 },
  { key: "spin-musk-20", type: "category_percentage", label: "20% off Musk", value: 20, categorySlug: "musk" },
  { key: "spin-free-shipping-1800", type: "free_shipping", label: "Free shipping over 1,800 EGP", minSubtotal: 1800 },
  { key: "spin-extra-tester", type: "free_tester", label: "A free extra tester", value: 0 },
  { key: "spin-next-10", type: "percentage", label: "10% off your next order", value: 10, issueCode: true },
];

const serialize = (item) => ({
  _id: item._id, key: item.key, type: item.type, origin: item.origin, label: item.label,
  code: item.code || "", value: item.value, categorySlug: item.categorySlug || "",
  minSubtotal: item.minSubtotal, status: item.status, expiresAt: item.expiresAt,
});

const getMyRewards = async (req, res) => {
  const [user, entitlements] = await Promise.all([
    User.findById(req.user._id).select("spin"),
    getAvailableEntitlements(req.user._id),
  ]);
  const all = await Entitlement.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json({ success: true, data: { spinAvailable: Boolean(user?.spin?.available && !user?.spin?.claimedAt), available: entitlements.map(serialize), history: all.map(serialize) } });
};

const spin = async (req, res) => {
  const session = await mongoose.startSession();
  let entitlement;
  try {
    await session.withTransaction(async () => {
      const user = await User.findOneAndUpdate(
        { _id: req.user._id, "spin.available": true, "spin.claimedAt": null },
        { $set: { "spin.available": false, "spin.claimedAt": new Date() } },
        { new: true, session }
      );
      if (!user) throw new Error("Your Darb spin has already been used.");
      const reward = SPIN_REWARDS[randomInt(SPIN_REWARDS.length)];
      const code = reward.issueCode ? `DARB-${randomBytes(4).toString("hex").toUpperCase()}` : "";
      [entitlement] = await Entitlement.create([{ user: user._id, origin: "spin", ...reward, code }], { session });
      user.spin.entitlement = entitlement._id;
      await user.save({ session });
    });
    if (entitlement.code && req.user.email) {
      sendEmail({
        to: req.user.email,
        subject: "Your Darb reward",
        text: `Your Darb reward is ${entitlement.label}. Code: ${entitlement.code}`,
        html: `<div style="font-family:Arial;background:#F7F1E6;padding:32px;color:#0F3D2E"><h1>Your path revealed a reward.</h1><p>${entitlement.label}</p><p><strong>${entitlement.code}</strong></p></div>`,
      }).catch((error) => console.error("Reward email failed:", error.message));
    }
    res.json({ success: true, message: "Your reward is ready.", data: serialize(entitlement) });
  } catch (error) {
    res.status(409).json({ success: false, message: error.message });
  } finally { await session.endSession(); }
};

const claimPolicyReward = async (req, res) => {
  try {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const item = await Entitlement.findOneAndUpdate(
      { user: req.user._id, key: "policy-10" },
      { $setOnInsert: { type: "percentage", origin: "policy", label: "Hidden Darb 10% reward", value: 10, expiresAt, code: `PATH-${randomBytes(3).toString("hex").toUpperCase()}` } },
      { upsert: true, new: true }
    );
    if (item.status !== "available" || (item.expiresAt && item.expiresAt <= new Date())) throw new Error("This hidden reward was already claimed.");
    res.json({ success: true, message: "You found a hidden Darb path. Your reward is valid for 7 days.", data: serialize(item) });
  } catch (error) {
    res.status(409).json({ success: false, message: error.message });
  }
};

module.exports = { getMyRewards, spin, claimPolicyReward };
