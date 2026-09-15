const { randomBytes } = require("crypto");
const Entitlement = require("../models/Entitlement");
const SpinGrant = require("../models/SpinGrant");
const Order = require("../models/Order");
const { getAvailableEntitlements, getEntitlementUnlockState } = require("../services/entitlement.service");
const { sendRewardClaimEmail } = require("../services/transactionalEmail.service");
const { getPersistedGuestRewardEmail, getRewardDisplayLabel } = require("../services/rewardPresentation.service");
const {
  claimGrant,
  serializeGrant,
} = require("../services/spinGrant.service");
const { normalizeEgyptPhone, getEgyptPhoneIdentityVariants } = require("../utils/normalizePhone");

const serialize = async (item, { guestPhone = "" } = {}) => ({
  _id: item._id,
  key: item.key,
  type: item.type,
  origin: item.origin,
  label: getRewardDisplayLabel(item),
  code: item.code || "",
  value: item.value,
  categorySlug: item.categorySlug || "",
  minSubtotal: item.minSubtotal,
  status: item.status,
  expiresAt: item.expiresAt,
  locked: (await getEntitlementUnlockState({ entitlement: item, guestPhone })).locked,
});

const getMyRewards = async (req, res) => {
  const [grants, entitlements, all] = await Promise.all([
    SpinGrant.find({ ownerUser: req.user._id }).sort({ createdAt: 1 }).lean(),
    getAvailableEntitlements(req.user._id),
    Entitlement.find({ user: req.user._id }).sort({ createdAt: -1 }).lean(),
  ]);
  const availableGrants = grants.filter((grant) => grant.status === "available");
  const [serializedAvailable, serializedHistory] = await Promise.all([
    Promise.all(entitlements.map((item) => serialize(item))),
    Promise.all(all.map((item) => serialize(item))),
  ]);
  res.json({
    success: true,
    data: {
      spinAvailable: availableGrants.length > 0,
      spinAvailableCount: availableGrants.length,
      spins: grants.map(serializeGrant),
      available: serializedAvailable,
      history: serializedHistory,
    },
  });
};

const spin = async (req, res) => {
  try {
    const { entitlement } = await claimGrant({
      grantId: req.body?.grantId || null,
      userId: req.user._id,
    });
    await sendRewardClaimEmail(entitlement, { customerEmail: req.user.email || "", isGuest: false });
    return res.json({ success: true, message: "Your reward is ready.", data: await serialize(entitlement) });
  } catch (error) {
    return res.status(409).json({ success: false, message: error.message });
  }
};

const claimGuestOrderSpin = async (req, res) => {
  try {
    const phone = normalizeEgyptPhone(req.body?.phone || "");
    const orderNumber = String(req.body?.orderNumber || "").trim().toUpperCase();
    if (!/^20(1\d{9})$/.test(phone)) {
      return res.status(400).json({ success: false, message: "Enter the Egyptian phone number used for the order." });
    }
    if (!/^DARB-\d+$/.test(orderNumber)) {
      return res.status(400).json({ success: false, message: "Enter a valid Darb order number." });
    }

    const phoneVariants = getEgyptPhoneIdentityVariants(phone);
    const sourceOrder = await Order.findOne({
      orderNumber,
      orderStatus: "delivered",
      "customerSnapshot.phone": { $in: phoneVariants },
    }).select("_id customer customerSnapshot.email").lean();
    if (!sourceOrder) throw new Error("Guest order verification failed.");

    const { entitlement } = await claimGrant({
      phone,
      sourceOrderId: sourceOrder._id,
    });
    try {
      await sendRewardClaimEmail(entitlement, {
        customerEmail: getPersistedGuestRewardEmail(sourceOrder),
        isGuest: true,
      });
    } catch (emailError) {
      console.error("Guest reward email preparation failed:", emailError.message);
    }
    return res.json({
      success: true,
      message: "A verified delivered-order spin was claimed.",
      data: await serialize(entitlement, { guestPhone: phone }),
    });
  } catch (error) {
    // Deliberately do not reveal whether a specific phone/order exists.
    return res.status(409).json({ success: false, message: "No unclaimed delivered-order spin is available for those details." });
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
      data: await serialize(item),
    });
  } catch (error) {
    return res.status(409).json({ success: false, message: error.message });
  }
};

module.exports = { getMyRewards, spin, claimGuestOrderSpin, claimPolicyReward };
