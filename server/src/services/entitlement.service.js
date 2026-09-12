const Entitlement = require("../models/Entitlement");
const Order = require("../models/Order");
const { normalizeEgyptPhone } = require("../utils/normalizePhone");

const createFirstOrderEntitlement = (userId, session = null) => {
  const options = { upsert: true, returnDocument: "after", setDefaultsOnInsert: true };
  if (session) options.session = session;
  return Entitlement.findOneAndUpdate(
    { user: userId, origin: "first_order" },
    { $setOnInsert: { key: "first-order-10", type: "percentage", origin: "first_order", label: "10% off your first order", value: 10 } },
    options
  );
};

const refreshFirstOrderEntitlement = async (userId) => {
  if (!userId) return null;
  const usedOrder = await Order.exists({ customer: userId, orderStatus: { $ne: "cancelled" } });
  if (usedOrder) return null;
  return createFirstOrderEntitlement(userId);
};

const getAvailableEntitlements = async (userId, session = null) => {
  if (!userId) return [];
  await refreshFirstOrderEntitlement(userId);
  const query = Entitlement.find({
    user: userId,
    status: "available",
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  }).sort({ createdAt: 1 });
  if (session) query.session(session);
  return query;
};

const ownerFilter = (userId, guestPhone) => {
  const phone = normalizeEgyptPhone(guestPhone || "");
  const owners = [];
  if (userId) owners.push({ user: userId });
  if (phone) owners.push({ user: null, ownerPhone: phone });
  if (!owners.length) return null;
  return owners.length === 1 ? owners[0] : { $or: owners };
};

const resolveEntitlementCodeForCheckout = async ({
  userId = null,
  guestPhone = "",
  code = "",
  session = null,
} = {}) => {
  const cleanCode = String(code || "").trim().toUpperCase();
  if (!cleanCode) {
    return { isEntitlementCode: false, entitlement: null, reason: "empty" };
  }

  const owner = ownerFilter(userId, guestPhone);
  if (owner) {
    const ownerQuery = Entitlement.findOne({ ...owner, code: cleanCode });
    if (session) ownerQuery.session(session);
    const entitlement = await ownerQuery;
    if (entitlement) {
      return { isEntitlementCode: true, entitlement, reason: "owner_match" };
    }
  }

  const existenceQuery = Entitlement.exists({ code: cleanCode });
  if (session) existenceQuery.session(session);
  const entitlementExists = await existenceQuery;
  if (entitlementExists) {
    return {
      isEntitlementCode: true,
      entitlement: null,
      reason: owner ? "different_checkout_details" : "checkout_details_required",
    };
  }

  return { isEntitlementCode: false, entitlement: null, reason: "not_found" };
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

const applySelectedEntitlement = async ({ pricing, items, entitlementId, userId, guestPhone = "", session = null }) => {
  if (!entitlementId) return { pricing, entitlement: null, freeTester: false };
  const owner = ownerFilter(userId, guestPhone);
  if (!owner) throw new Error("Sign in or use the phone number tied to this guest reward.");
  const query = Entitlement.findOne({
    _id: entitlementId,
    ...owner,
    status: "available",
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  });
  if (session) query.session(session);
  const entitlement = await query;
  if (!entitlement) throw new Error("This reward is unavailable, expired, already used, or belongs to a different phone number or account.");
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

const consumeEntitlement = async (entitlementId, userId, orderId, session, guestPhone = "") => {
  if (!entitlementId) return;
  const owner = ownerFilter(userId, guestPhone);
  if (!owner) throw new Error("Reward ownership could not be verified.");
  const result = await Entitlement.updateOne(
    { _id: entitlementId, ...owner, status: "available", $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] },
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

module.exports = {
  buildEntitlementOwnerFilter: ownerFilter,
  createFirstOrderEntitlement,
  getAvailableEntitlements,
  resolveEntitlementCodeForCheckout,
  applySelectedEntitlement,
  consumeEntitlement,
  restoreEntitlement,
};
