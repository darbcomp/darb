const test = require("node:test");
const assert = require("node:assert/strict");

const Entitlement = require("../models/Entitlement");
const {
  applySelectedEntitlement,
  consumeEntitlement,
  resolveEntitlementCodeForCheckout,
} = require("../services/entitlement.service");
const {
  calculateBundleDiscount,
  calculateOrderTotals,
} = require("../utils/calculateCart");

const basePricing = {
  subtotal: 1450,
  baseDeliveryFee: 135,
  deliveryFee: 135,
  discountTotal: 0,
  total: 1585,
  discounts: [],
  coupon: { code: "", status: "empty", message: "" },
};

const guestReward = {
  _id: "reward-1",
  user: null,
  ownerPhone: "201099589674",
  status: "available",
  expiresAt: null,
  type: "percentage",
  value: 10,
  minSubtotal: 0,
  label: "10% off your next order",
  code: "DARB-A1B2C3D4",
};

const withEntitlementQueries = async ({ findOne, exists = async () => null }, callback) => {
  const originalFindOne = Entitlement.findOne;
  const originalExists = Entitlement.exists;
  Entitlement.findOne = findOne;
  Entitlement.exists = exists;
  try {
    return await callback();
  } finally {
    Entitlement.findOne = originalFindOne;
    Entitlement.exists = originalExists;
  }
};

const matchingGuestLookup = (filter) => {
  if (
    filter._id === guestReward._id &&
    filter.user === null &&
    filter.ownerPhone === guestReward.ownerPhone &&
    filter.status === "available"
  ) {
    return guestReward;
  }
  return null;
};

const resolveGuestReward = (phone) => withEntitlementQueries({
  findOne: (filter) => (
    filter.code === guestReward.code &&
    filter.user === null &&
    filter.ownerPhone === guestReward.ownerPhone
      ? guestReward
      : null
  ),
}, () => resolveEntitlementCodeForCheckout({ code: guestReward.code, guestPhone: phone }));

test("guest portable reward resolves and applies with the matching local 01 phone", async () => {
  const resolved = await resolveGuestReward("010 9958 9674");
  assert.equal(resolved.reason, "owner_match");
  assert.equal(resolved.entitlement, guestReward);

  await withEntitlementQueries({ findOne: matchingGuestLookup }, async () => {
    const result = await applySelectedEntitlement({
      pricing: basePricing,
      items: [],
      entitlementId: resolved.entitlement._id,
      guestPhone: "010 9958 9674",
    });
    assert.equal(result.pricing.discountTotal, 145);
  });
});

test("guest portable reward resolves and applies with the equivalent +20 phone", async () => {
  const resolved = await resolveGuestReward("+20 10 9958 9674");
  assert.equal(resolved.reason, "owner_match");

  await withEntitlementQueries({ findOne: matchingGuestLookup }, async () => {
    const result = await applySelectedEntitlement({
      pricing: basePricing,
      items: [],
      entitlementId: resolved.entitlement._id,
      guestPhone: "+20 10 9958 9674",
    });
    assert.equal(result.pricing.total, 1440);
  });
});

test("wrong phone does not resolve as the owner's reward", async () => {
  const resolved = await withEntitlementQueries({
    findOne: async () => null,
    exists: async () => ({ _id: guestReward._id }),
  }, () => resolveEntitlementCodeForCheckout({
    code: guestReward.code,
    guestPhone: "01123456789",
  }));

  assert.equal(resolved.isEntitlementCode, true);
  assert.equal(resolved.entitlement, null);
  assert.equal(resolved.reason, "different_checkout_details");
});

test("used reward resolves for its owner but cannot apply", async () => {
  const usedReward = { ...guestReward, status: "used" };
  const resolved = await withEntitlementQueries({
    findOne: async () => usedReward,
  }, () => resolveEntitlementCodeForCheckout({
    code: usedReward.code,
    guestPhone: "01099589674",
  }));
  assert.equal(resolved.entitlement, usedReward);

  await withEntitlementQueries({ findOne: async () => null }, async () => {
    await assert.rejects(
      applySelectedEntitlement({
        pricing: basePricing,
        items: [],
        entitlementId: usedReward._id,
        guestPhone: "01099589674",
      }),
      /already used/
    );
  });
});

test("applying and pricing an entitlement does not consume it", async () => {
  const originalUpdateOne = Entitlement.updateOne;
  let consumeCalls = 0;
  Entitlement.updateOne = async () => {
    consumeCalls += 1;
    return { modifiedCount: 1 };
  };
  try {
    await withEntitlementQueries({ findOne: matchingGuestLookup }, () => applySelectedEntitlement({
      pricing: basePricing,
      items: [],
      entitlementId: guestReward._id,
      guestPhone: "01099589674",
    }));
    assert.equal(consumeCalls, 0);
  } finally {
    Entitlement.updateOne = originalUpdateOne;
  }
});

test("consumeEntitlement permits only one successful consumption", async () => {
  const original = Entitlement.updateOne;
  let calls = 0;
  Entitlement.updateOne = async () => ({ modifiedCount: calls++ === 0 ? 1 : 0 });
  try {
    await consumeEntitlement(guestReward._id, null, "order-1", null, "01099589674");
    await assert.rejects(
      consumeEntitlement(guestReward._id, null, "order-2", null, "+201099589674"),
      /already used/
    );
    assert.equal(calls, 2);
  } finally {
    Entitlement.updateOne = original;
  }
});

test("signed-in reward resolves and applies by account ownership", async () => {
  const userReward = { ...guestReward, _id: "reward-2", user: "user-1", ownerPhone: "" };
  const resolved = await withEntitlementQueries({
    findOne: (filter) => (
      filter.code === userReward.code && filter.user === "user-1" ? userReward : null
    ),
  }, () => resolveEntitlementCodeForCheckout({ code: userReward.code, userId: "user-1" }));
  assert.equal(resolved.entitlement, userReward);

  await withEntitlementQueries({
    findOne: (filter) => (
      filter._id === userReward._id && filter.user === "user-1" ? userReward : null
    ),
  }, async () => {
    const result = await applySelectedEntitlement({
      pricing: basePricing,
      items: [],
      entitlementId: userReward._id,
      userId: "user-1",
    });
    assert.equal(result.entitlement, userReward);
  });
});

test("an entitlement code for other checkout details does not fall through to coupon", async () => {
  const resolved = await withEntitlementQueries({
    findOne: async () => null,
    exists: async () => ({ _id: guestReward._id }),
  }, () => resolveEntitlementCodeForCheckout({ code: guestReward.code }));

  assert.equal(resolved.isEntitlementCode, true);
  assert.equal(resolved.entitlement, null);
  assert.equal(resolved.reason, "checkout_details_required");
});

test("a code with no entitlement record falls through to the coupon path", async () => {
  const resolved = await withEntitlementQueries({
    findOne: async () => null,
    exists: async () => null,
  }, () => resolveEntitlementCodeForCheckout({
    code: "DARB-NORMAL-COUPON",
    guestPhone: "01099589674",
  }));

  assert.equal(resolved.isEntitlementCode, false);
  assert.equal(resolved.reason, "not_found");
});

test("entitlement resolution does not depend on a DARB prefix", async () => {
  const prefixlessReward = { ...guestReward, code: "REWARD-WITHOUT-PREFIX" };
  const resolved = await withEntitlementQueries({
    findOne: (filter) => filter.code === prefixlessReward.code ? prefixlessReward : null,
  }, () => resolveEntitlementCodeForCheckout({
    code: " reward-without-prefix ",
    guestPhone: "01099589674",
  }));

  assert.equal(resolved.isEntitlementCode, true);
  assert.equal(resolved.entitlement, prefixlessReward);
});

test("15 percent bundle math preserves piastres", () => {
  const discount = calculateBundleDiscount({
    bundle: { discountType: "percentage", discountValue: 15, requiredQuantity: 2 },
    eligibleItems: [
      { unitPrice: 750, quantity: 1 },
      { unitPrice: 700, quantity: 1 },
    ],
    applications: 1,
  });
  const totals = calculateOrderTotals({ subtotal: 1450, discountTotal: discount.amount });

  assert.equal(discount.amount, 217.5);
  assert.equal(totals.total, 1232.5);
});
