const { randomBytes } = require("crypto");
const Entitlement = require("../models/Entitlement");
const SpinGrant = require("../models/SpinGrant");
const { getAvailableEntitlements } = require("../services/entitlement.service");
const { sendEmail } = require("../config/mailer");
const {
  claimGrant,
  serializeGrant,
} = require("../services/spinGrant.service");
const { normalizeEgyptPhone } = require("../utils/normalizePhone");

const serialize = (item) => ({
  _id: item._id,
  key: item.key,
  type: item.type,
  origin: item.origin,
  label: item.label,
  code: item.code || "",
  value: item.value,
  categorySlug: item.categorySlug || "",
  minSubtotal: item.minSubtotal,
  status: item.status,
  expiresAt: item.expiresAt,
});

const sendRewardEmailIfUseful = async (entitlement, email) => {
  if (!email || !entitlement) return;
  const codeLine = entitlement.code ? ` Code: ${entitlement.code}` : "";
  await sendEmail({
    to: email,
    subject: "Your Darb reward",
    text: `Your Darb reward is ${entitlement.label}.${codeLine}`,
    html: `<div style="font-family:Arial;background:#F7F1E6;padding:32px;color:#0F3D2E"><h1>Your path revealed a reward.</h1><p>${entitlement.label}</p>${entitlement.code ? `<p><strong>${entitlement.code}</strong></p>` : ""}</div>`,
  });
};

const getMyRewards = async (req, res) => {
  const [grants, entitlements, all] = await Promise.all([
    SpinGrant.find({ ownerUser: req.user._id }).sort({ createdAt: 1 }).lean(),
    getAvailableEntitlements(req.user._id),
    Entitlement.find({ user: req.user._id }).sort({ createdAt: -1 }).lean(),
  ]);
  const availableGrants = grants.filter((grant) => grant.status === "available");
  res.json({
    success: true,
    data: {
      spinAvailable: availableGrants.length > 0,
      spinAvailableCount: availableGrants.length,
      spins: grants.map(serializeGrant),
      available: entitlements.map(serialize),
      history: all.map(serialize),
    },
  });
};

const spin = async (req, res) => {
  try {
    const { entitlement } = await claimGrant({
      grantId: req.body?.grantId || null,
      userId: req.user._id,
    });
    sendRewardEmailIfUseful(entitlement, req.user.email).catch((error) =>
      console.error("Reward email failed:", error.message)
    );
    return res.json({ success: true, message: "Your reward is ready.", data: serialize(entitlement) });
  } catch (error) {
    return res.status(409).json({ success: false, message: error.message });
  }
};

const claimGuestOrderSpin = async (req, res) => {
  try {
    const phone = normalizeEgyptPhone(req.body?.phone || "");
    if (!/^20(1\d{9})$/.test(phone)) {
      return res.status(400).json({ success: false, message: "Enter the Egyptian phone number used for the order." });
    }
    const { entitlement } = await claimGrant({ phone });
    return res.json({
      success: true,
      message: "A verified-order spin was claimed.",
      data: serialize(entitlement),
    });
  } catch (error) {
    // Deliberately do not reveal whether a specific phone/order exists.
    return res.status(409).json({ success: false, message: "No unclaimed confirmed-order spin is available for those details." });
  }
};

const claimPolicyReward = async (req, res) => {
  try {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const item = await Entitlement.findOneAndUpdate(
      { user: req.user._id, origin: "policy" },
      { $setOnInsert: {
        key: "policy-10",
        type: "percentage",
        origin: "policy",
        label: "Hidden Darb 10% reward",
        value: 10,
        expiresAt,
        code: `PATH-${randomBytes(3).toString("hex").toUpperCase()}`,
      } },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
    if (item.status !== "available" || (item.expiresAt && item.expiresAt <= new Date())) {
      throw new Error("This hidden reward was already claimed.");
    }
    return res.json({
      success: true,
      message: "You found a hidden Darb path. Your reward is valid for 7 days.",
      data: serialize(item),
    });
  } catch (error) {
    return res.status(409).json({ success: false, message: error.message });
  }
};

module.exports = { getMyRewards, spin, claimGuestOrderSpin, claimPolicyReward };
