const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const Entitlement = require("../models/Entitlement");
const Order = require("../models/Order");
const {
  DEFERRED_REWARD_LOCKED_MESSAGE,
  applySelectedEntitlement,
  consumeEntitlement,
  getEntitlementUnlockState,
  resolveEntitlementCodeForCheckout,
  restoreEntitlement,
} = require("../services/entitlement.service");
const {
  calculateBundleDiscount,
  calculateOrderTotals,
  serializeAppliedDiscount,
} = require("../utils/calculateCart");

test("applied offer serialization preserves internal and customer titles", () => {
  const discount = serializeAppliedDiscount({
    sourceType: "offer",
    sourceId: "offer-1",
    name: "Internal September offer",
    title: "A September path",
    arabicTitle: "درب سبتمبر",
    discountType: "percentage",
    amount: 100,
  });

  assert.equal(discount.name, "Internal September offer");
  assert.equal(discount.title, "A September path");
  assert.equal(discount.arabicTitle, "درب سبتمبر");
  assert.equal(discount.amount, 100);
});

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
  key: "spin-5",
  status: "available",
  expiresAt: null,
  type: "percentage",
  value: 10,
  minSubtotal: 0,
  label: "5% off an order",
  code: "DARB-A1B2C3D4",
};

const deferredGuestReward = {
  ...guestReward,
  _id: "deferred-guest-reward",
  key: "spin-next-10",
  label: "10% off after your next order",
  createdAt: new Date("2026-09-15T10:00:00.000Z"),
  code: "DARB-DEFERRED-GUEST",
};

const deferredAccountReward = {
  ...deferredGuestReward,
  _id: "deferred-account-reward",
  user: "user-1",
  ownerPhone: "",
  code: "DARB-DEFERRED-ACCOUNT",
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

const withOrderExists = async (exists, callback) => {
  const originalExists = Order.exists;
  Order.exists = exists;
  try {
    return await callback();
  } finally {
    Order.exists = originalExists;
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
  let firstUpdate = null;
  Entitlement.updateOne = async (filter, changes) => {
    if (!firstUpdate) firstUpdate = { filter, changes };
    return { modifiedCount: calls++ === 0 ? 1 : 0 };
  };
  try {
    await consumeEntitlement(guestReward._id, null, "order-1", null, "01099589674");
    await assert.rejects(
      consumeEntitlement(guestReward._id, null, "order-2", null, "+201099589674"),
      /already used/
    );
    assert.equal(calls, 2);
    assert.equal(firstUpdate.filter.status, "available");
    assert.equal(firstUpdate.changes.$set.status, "used");
    assert.equal(firstUpdate.changes.$set.usedOrder, "order-1");
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

test("spin-next-10 is locked immediately and its source order cannot count", async () => {
  await withOrderExists((filter) => {
    assert.deepEqual(filter.createdAt, { $gt: deferredAccountReward.createdAt });
    assert.deepEqual(filter.orderStatus, { $ne: "cancelled" });
    assert.equal(filter.customer, deferredAccountReward.user);
    return null;
  }, async () => {
    assert.deepEqual(
      await getEntitlementUnlockState({ entitlement: deferredAccountReward }),
      { locked: true }
    );
  });
});

test("the first later order cannot use spin-next-10 before it is persisted", async () => {
  await withEntitlementQueries({ findOne: async () => deferredAccountReward }, () =>
    withOrderExists(async () => null, () => assert.rejects(
      applySelectedEntitlement({
        pricing: basePricing,
        items: [],
        entitlementId: deferredAccountReward._id,
        userId: deferredAccountReward.user,
      }),
      (error) => error.message === DEFERRED_REWARD_LOCKED_MESSAGE
    ))
  );
});

test("spin-next-10 applies on the following order after a later order is persisted", async () => {
  await withEntitlementQueries({ findOne: async () => deferredAccountReward }, () =>
    withOrderExists(async () => ({ _id: "unlocking-order" }), async () => {
      const result = await applySelectedEntitlement({
        pricing: basePricing,
        items: [],
        entitlementId: deferredAccountReward._id,
        userId: deferredAccountReward.user,
      });
      assert.equal(result.pricing.discountTotal, 145);
      assert.equal(result.pricing.discounts[0].title, "10% off after your next order");
      assert.equal(result.entitlement.status, "available");
    })
  );
});

test("cancelled later orders do not unlock spin-next-10", async () => {
  await withOrderExists((filter) => {
    assert.deepEqual(filter.orderStatus, { $ne: "cancelled" });
    return null;
  }, async () => {
    const state = await getEntitlementUnlockState({ entitlement: deferredAccountReward });
    assert.equal(state.locked, true);
  });
});

test("signed-in deferred eligibility uses account ownership", async () => {
  await withOrderExists((filter) => {
    assert.equal(filter.customer, "user-1");
    assert.equal(filter["customerSnapshot.phone"], undefined);
    return { _id: "account-order" };
  }, async () => {
    const state = await getEntitlementUnlockState({ entitlement: deferredAccountReward });
    assert.equal(state.locked, false);
  });
});

test("guest deferred eligibility uses normalized Egyptian phone variants", async () => {
  const entitlementWithoutSelectedPhone = { ...deferredGuestReward, ownerPhone: undefined };
  await withOrderExists((filter) => {
    assert.deepEqual(filter["customerSnapshot.phone"], {
      $in: ["201099589674", "01099589674"],
    });
    assert.equal(filter.customer, undefined);
    return { _id: "guest-order" };
  }, async () => {
    const state = await getEntitlementUnlockState({
      entitlement: entitlementWithoutSelectedPhone,
      guestPhone: "+20 10 9958 9674",
    });
    assert.equal(state.locked, false);
  });
});

test("guest deferred eligibility explicitly loads ownerPhone when it was not selected", async () => {
  const originalFindById = Entitlement.findById;
  let selectedField = "";
  Entitlement.findById = (id) => {
    assert.equal(id, deferredGuestReward._id);
    return {
      select: async (field) => {
        selectedField = field;
        return { ownerPhone: "201099589674" };
      },
    };
  };
  try {
    await withOrderExists(async () => ({ _id: "guest-order" }), async () => {
      const state = await getEntitlementUnlockState({
        entitlement: { ...deferredGuestReward, ownerPhone: undefined },
      });
      assert.equal(state.locked, false);
      assert.equal(selectedField, "+ownerPhone");
    });
  } finally {
    Entitlement.findById = originalFindById;
  }
});

test("guest reward code cannot bypass the deferred lock", async () => {
  const resolved = await withEntitlementQueries({
    findOne: async () => deferredGuestReward,
  }, () => resolveEntitlementCodeForCheckout({
    code: deferredGuestReward.code,
    guestPhone: "01099589674",
  }));

  await withEntitlementQueries({ findOne: async () => deferredGuestReward }, () =>
    withOrderExists(async () => null, () => assert.rejects(
      applySelectedEntitlement({
        pricing: basePricing,
        items: [],
        entitlementId: resolved.entitlement._id,
        guestPhone: "01099589674",
      }),
      /unlocks after you place one order/
    ))
  );
});

test("entitlementId cannot bypass the deferred lock", async () => {
  await withEntitlementQueries({ findOne: async () => deferredAccountReward }, () =>
    withOrderExists(async () => null, () => assert.rejects(
      applySelectedEntitlement({
        pricing: basePricing,
        items: [],
        entitlementId: deferredAccountReward._id,
        userId: "user-1",
      }),
      /following order/
    ))
  );
});

test("other spin rewards and the first-order signup reward remain immediately usable", async () => {
  let orderChecks = 0;
  await withOrderExists(async () => {
    orderChecks += 1;
    return null;
  }, async () => {
    assert.deepEqual(await getEntitlementUnlockState({ entitlement: guestReward }), { locked: false });
    assert.deepEqual(await getEntitlementUnlockState({
      entitlement: { ...deferredAccountReward, key: "first-order-10", origin: "first_order" },
    }), { locked: false });
    assert.equal(orderChecks, 0);
  });
});

test("restoring a consumed entitlement on cancellation preserves existing behavior", async () => {
  const originalUpdateOne = Entitlement.updateOne;
  let update = null;
  Entitlement.updateOne = async (filter, changes) => {
    update = { filter, changes };
    return { modifiedCount: 1 };
  };
  try {
    await restoreEntitlement({
      _id: "cancelled-order",
      promotion: { entitlement: deferredAccountReward._id },
    });
    assert.equal(update.filter.status, "used");
    assert.equal(update.filter.usedOrder, "cancelled-order");
    assert.deepEqual(update.changes.$set, { status: "available", usedAt: null, usedOrder: null });
  } finally {
    Entitlement.updateOne = originalUpdateOne;
  }
});

test("reward UI wires locked state, dialog focus, scroll cleanup, and signup CTA", () => {
  const clientRoot = join(__dirname, "../../../client/src");
  const wheelSource = readFileSync(join(clientRoot, "components/rewards/SpinWheel.jsx"), "utf8");
  const accountSource = readFileSync(join(clientRoot, "pages/account/Account.jsx"), "utf8");
  const checkoutSource = readFileSync(join(clientRoot, "pages/public/Checkout.jsx"), "utf8");

  assert.match(wheelSource, /tabIndex=\{-1\}/);
  assert.match(wheelSource, /dialogRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
  assert.doesNotMatch(wheelSource, /closeRef\.current\?\.focus/);
  assert.match(wheelSource, /position: "fixed"/);
  assert.match(wheelSource, /window\.scrollTo\(scrollX, scrollY\)/);
  assert.match(wheelSource, /overscroll-contain/);
  assert.match(wheelSource, /navigate\("\/register"\)/);
  assert.match(accountSource, /reward\.locked \? "Unlocks after your next order"/);
  assert.match(checkoutSource, /disabled=\{reward\.locked\}/);
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
