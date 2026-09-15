const mongoose = require("mongoose");
const { randomInt, randomBytes } = require("crypto");
const SpinGrant = require("../models/SpinGrant");
const Entitlement = require("../models/Entitlement");
const { normalizeEgyptPhone } = require("../utils/normalizePhone");

const SPIN_REWARDS = [
  { key: "spin-5", type: "percentage", label: "5% off an order", value: 5 },
  { key: "spin-musk-20", type: "category_percentage", label: "20% off Musk", value: 20, categorySlug: "musk" },
  { key: "spin-free-shipping-1800", type: "free_shipping", label: "Free shipping over 1,800 EGP", minSubtotal: 1800 },
  { key: "spin-extra-tester", type: "free_tester", label: "A free extra tester", value: 0 },
  { key: "spin-next-10", type: "percentage", label: "10% off after your next order", value: 10 },
];

const last4 = (phone) => String(phone || "").slice(-4);

const ensureSignupSpinGrant = async (userId, session = null) => {
  if (!userId) return null;
  const options = { upsert: true, returnDocument: "after", setDefaultsOnInsert: true };
  if (session) options.session = session;
  return SpinGrant.findOneAndUpdate(
    { ownerUser: userId, source: "signup" },
    { $setOnInsert: { ownerUser: userId, source: "signup", status: "available" } },
    options
  );
};

const ensureOrderSpinGrant = async (order, session = null) => {
  if (!order?._id || order.orderStatus !== "confirmed") return null;
  const phone = normalizeEgyptPhone(order.customerSnapshot?.phone || "");
  const options = { upsert: true, returnDocument: "after", setDefaultsOnInsert: true };
  if (session) options.session = session;
  return SpinGrant.findOneAndUpdate(
    { sourceOrder: order._id },
    {
      $setOnInsert: {
        source: "order",
        sourceOrder: order._id,
        ownerUser: order.customer || null,
        ownerPhone: phone,
        ownerPhoneLast4: last4(phone),
        status: "available",
      },
    },
    options
  );
};

const getUserAvailableSpinCount = (userId) =>
  userId ? SpinGrant.countDocuments({ ownerUser: userId, status: "available" }) : Promise.resolve(0);

const serializeGrant = (grant) => ({
  _id: grant._id,
  source: grant.source,
  sourceOrder: grant.sourceOrder || null,
  status: grant.status,
  ownerPhoneLast4: grant.ownerPhoneLast4 || "",
  createdAt: grant.createdAt,
  claimedAt: grant.claimedAt || null,
});

const buildReward = () => {
  const reward = SPIN_REWARDS[randomInt(SPIN_REWARDS.length)];
  return { ...reward };
};

const makeRewardCode = () => `DARB-${randomBytes(4).toString("hex").toUpperCase()}`;

const claimGrant = async ({ grantId = null, userId = null, phone = "" } = {}) => {
  const normalizedPhone = normalizeEgyptPhone(phone);
  const session = await mongoose.startSession();
  let entitlement = null;
  let grant = null;
  try {
    await session.withTransaction(async () => {
      const filter = { status: "available" };
      if (grantId) filter._id = grantId;
      if (userId) filter.ownerUser = userId;
      else if (normalizedPhone) {
        filter.ownerUser = null;
        filter.ownerPhone = normalizedPhone;
        filter.source = "order";
      } else {
        throw new Error("A signed-in account or eligible guest-order phone number is required.");
      }

      grant = await SpinGrant.findOne(filter).sort({ createdAt: 1 }).select("+ownerPhone").session(session);
      if (!grant) throw new Error("No unclaimed Darb spin was found.");

      const reward = buildReward();
      // Guest rewards always receive a code so the reward remains portable into
      // the later checkout UX without exposing the guest's order.
      const code = !userId || reward.key === "spin-next-10" ? makeRewardCode() : "";
      [entitlement] = await Entitlement.create([{
        user: userId || null,
        ownerPhone: userId ? "" : normalizedPhone,
        sourceGrant: grant._id,
        origin: "spin",
        ...reward,
        code,
      }], { session });

      grant.status = "claimed";
      grant.claimedAt = new Date();
      grant.claimedByUser = userId || null;
      grant.entitlement = entitlement._id;
      await grant.save({ session });
    });
    return { grant, entitlement };
  } finally {
    await session.endSession();
  }
};

module.exports = {
  SPIN_REWARDS,
  normalizeEgyptPhone,
  ensureSignupSpinGrant,
  ensureOrderSpinGrant,
  getUserAvailableSpinCount,
  serializeGrant,
  claimGrant,
};
