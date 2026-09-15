const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const { parseOrderBirthday } = require("../utils/orderBirthday");
const { getAdminDashboard } = require("../controllers/admin.controller");
const { getAdminCustomers, getAdminCustomer, buildCustomerPipeline } = require("../controllers/customer.controller");
const { getAdminProducts, getAdminProductById } = require("../controllers/product.controller");
const { getAdminCategories, getAdminCategoryById } = require("../controllers/category.controller");
const { getAdminBundles, getAdminBundleById } = require("../controllers/bundle.controller");
const { getAdminOffers, getAdminOfferById } = require("../controllers/offer.controller");
const { getAdminCoupons, getAdminCouponById } = require("../controllers/coupon.controller");
const { getAdminWaitlist, getAdminWaitlistRequestById } = require("../controllers/waitlist.controller");
const { getAdminReviews } = require("../controllers/review.controller");
const { getAdminOrders, getAdminOrderById } = require("../controllers/order.controller");
const { getAdminSettings } = require("../controllers/settings.controller");

const makeResponse = () => {
  const res = {
    statusCode: 200,
    body: null,
  };

  res.status = (statusCode) => {
    res.statusCode = statusCode;
    return res;
  };

  res.json = (body) => {
    res.body = body;
    return res;
  };

  return res;
};

test("birthday parsing accepts real dates and rejects malformed or future values", () => {
  const now = new Date("2026-09-15T20:00:00.000Z");

  assert.equal(
    parseOrderBirthday("2000-02-29", now).toISOString(),
    "2000-02-29T00:00:00.000Z"
  );
  assert.equal(parseOrderBirthday("", now), null);
  assert.throws(() => parseOrderBirthday("2001-02-29", now), /valid birthday/i);
  assert.throws(() => parseOrderBirthday("not-a-date", now), /valid birthday/i);
  assert.throws(() => parseOrderBirthday("2026-09-16", now), /not in the future/i);
});

test("admin read endpoints return 503 instead of fake empty/default data when Mongo is unavailable", async () => {
  assert.notEqual(mongoose.connection.readyState, 1);

  const listHandlers = [
    ["dashboard", getAdminDashboard],
    ["customers", getAdminCustomers],
    ["products", getAdminProducts],
    ["categories", getAdminCategories],
    ["bundles", getAdminBundles],
    ["offers", getAdminOffers],
    ["coupons", getAdminCoupons],
    ["waitlist", getAdminWaitlist],
    ["reviews", getAdminReviews],
    ["orders", getAdminOrders],
    ["settings", getAdminSettings],
  ];

  for (const [name, handler] of listHandlers) {
    const res = makeResponse();
    await handler({ query: {}, params: {} }, res);

    assert.equal(res.statusCode, 503, `${name} should return 503`);
    assert.equal(res.body?.success, false, `${name} should report success=false`);
  }

  const detailHandlers = [
    ["customer", getAdminCustomer],
    ["product", getAdminProductById],
    ["category", getAdminCategoryById],
    ["bundle", getAdminBundleById],
    ["offer", getAdminOfferById],
    ["coupon", getAdminCouponById],
    ["waitlist request", getAdminWaitlistRequestById],
    ["order", getAdminOrderById],
  ];

  for (const [name, handler] of detailHandlers) {
    const res = makeResponse();
    await handler({ query: {}, params: { id: "507f1f77bcf86cd799439011", key: "user:test" } }, res);

    assert.equal(res.statusCode, 503, `${name} should return 503`);
    assert.equal(res.body?.success, false, `${name} should report success=false`);
  }
});

test("admin customer consent uses current registered consent or the latest guest order", () => {
  const pipeline = buildCustomerPipeline();
  const stage = pipeline.find((entry) => entry.$set?.marketingConsent);

  assert.deepEqual(stage?.$set?.marketingConsent, {
    $cond: [
      { $ne: ["$registeredUser", null] },
      { $eq: ["$registeredUser.marketingConsent.granted", true] },
      { $eq: ["$latestOrder.marketingConsent.granted", true] },
    ],
  });
});
