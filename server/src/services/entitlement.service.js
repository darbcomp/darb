const Entitlement = require("../models/Entitlement");
const Order = require("../models/Order");

const createFirstOrderEntitlement = (userId, session = null) =>
  Entitlement.findOneAndUpdate(
    { user: userId, key: "first-order-10" },
    { $setOnInsert: { type: "percentage", origin: "first_order", label: "10% off your first order", value: 10 } },
    { upsert: true, new: true, ...(session ? { session } : {}) }
  );

const refreshFirstOrderEntitlement = async (userId) => {
  const usedOrder = await Order.exists({ customer: userId, orderStatus: { $ne: "cancelled" } });
  if (usedOrder) return null;
  return createFirstOrderEntitlement(userId);
};

const getAvailableEntitlements = async (userId, session = null) => {
  await refreshFirstOrderEntitlement(userId);
  const query = Entitlement.find({
    user: userId,
    status: "available",
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  }).sort({ createdAt: 1 });
  if (session) query.session(session);
  return query;
};

const findAvailableEntitlementByCode = (userId, code, session = null) => {
  if (!userId || !String(code || "").trim()) return Promise.resolve(null);
  const query = Entitlement.findOne({
    user: userId,
    code: String(code).trim().toUpperCase(),
    status: "available",
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  });
  if (session) query.session(session);
  return query;
};

const categorySlugsForItem = (item) => [
  item.productDoc?.category?.slug,
  item.productSnapshot?.categorySlug,
  ...(item.productDoc?.categories || []).map((category) => category?.slug),
].filter(Boolean).map((value) => String(value).toLowerCase());

const priceEntitlement = (entitlement, items, subtotal, baseDeliveryFee) => {
  if (!entitlement || Number(entitlement.minSubtotal) > subtotal) return null;
  let amount = 0;
  let freeShipping = false;
  let freeTester = false;
  if (entitlement.type === "percentage") amount = subtotal * Number(entitlement.value) / 100;
  if (entitlement.type === "category_percentage") {
    const eligible = items.filter((item) => categorySlugsForItem(item).includes(entitlement.categorySlug));
    amount = eligible.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0) * Number(entitlement.value) / 100;
    if (!eligible.length) return null;
  }
  if (entitlement.type === "free_shipping") freeShipping = true;
  if (entitlement.type === "free_tester") freeTester = true;
  return {
    sourceType: "entitlement",
    sourceId: entitlement._id,
    name: entitlement.label,
    title: entitlement.label,
    code: entitlement.code || "",
    discountType: entitlement.type,
    amount: Math.min(Math.max(amount, 0), subtotal),
    freeShipping,
    freeTester,
    entitlement,
    valueIncludingShipping: Math.min(Math.max(amount, 0), subtotal) + (freeShipping ? baseDeliveryFee : 0),
  };
};

const applySelectedEntitlement = async ({ pricing, items, entitlementId, userId, session = null }) => {
  if (!entitlementId) return { pricing, entitlement: null, freeTester: false };
  if (!userId) throw new Error("Sign in to use this reward.");
  const query = Entitlement.findOne({ _id: entitlementId, user: userId, status: "available", $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] });
  if (session) query.session(session);
  const entitlement = await query;
  if (!entitlement) throw new Error("This reward is unavailable or expired.");
  const discount = priceEntitlement(entitlement, items, pricing.subtotal, pricing.baseDeliveryFee);
  if (!discount) throw new Error("This reward is not eligible for the current cart.");
  const deliveryFee = discount.freeShipping ? 0 : pricing.baseDeliveryFee;
  const discountTotal = discount.amount;
  return {
    entitlement,
    freeTester: discount.freeTester,
    pricing: {
      ...pricing,
      discountTotal,
      deliveryFee,
      total: Math.max(pricing.subtotal - discountTotal + deliveryFee, 0),
      freeShipping: discount.freeShipping,
      discounts: [{ ...discount, entitlement: undefined }],
      coupon: { code: entitlement.code || "", status: "valid", message: "One reward selected as this order's promotional benefit." },
    },
  };
};

const consumeEntitlement = async (entitlementId, userId, orderId, session) => {
  if (!entitlementId) return;
  const result = await Entitlement.updateOne(
    { _id: entitlementId, user: userId, status: "available", $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] },
    { $set: { status: "used", usedAt: new Date(), usedOrder: orderId } },
    { session }
  );
  if (result.modifiedCount !== 1) throw new Error("This reward was already used.");
};

const restoreEntitlement = (order, session) => {
  const entitlementId = order.promotion?.entitlement;
  if (!entitlementId) return Promise.resolve();
  return Entitlement.updateOne(
    { _id: entitlementId, usedOrder: order._id, status: "used", $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] },
    { $set: { status: "available", usedAt: null, usedOrder: null } },
    { session }
  );
};

module.exports = { createFirstOrderEntitlement, getAvailableEntitlements, findAvailableEntitlementByCode, applySelectedEntitlement, consumeEntitlement, restoreEntitlement };
