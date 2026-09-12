const test = require("node:test");
const assert = require("node:assert/strict");

const {
  aggregateCustomerRecords,
  getCustomerIdentityKey,
} = require("../services/customerAggregation.service");
const {
  applyManualReviewVerification,
  assertCustomerReviewUpdateAllowed,
  assertNoCustomerVerificationFlag,
  assertNoDirectVerificationFlag,
  getCustomerReviewVerification,
  parseManualVerifiedPurchase,
} = require("../services/reviewVerification.service");

test("customer aggregation treats local and +20 Egyptian phone forms as one identity", () => {
  assert.equal(
    getCustomerIdentityKey({ phone: "010 9958 9674" }),
    getCustomerIdentityKey({ phone: "+20 10 9958 9674" })
  );
});

test("registered customer and matching guest orders deduplicate by normalized phone", () => {
  const customers = aggregateCustomerRecords([
    { kind: "user", userId: "user-1", phone: "01099589674", name: "Registered" },
    { kind: "order", phone: "+201099589674", orderNumber: "DARB-1001" },
  ]);

  assert.equal(customers.length, 1);
  assert.equal(customers[0].registered, true);
  assert.equal(customers[0].orders.length, 1);
});

test("different normalized phones remain different customers", () => {
  const customers = aggregateCustomerRecords([
    { kind: "user", userId: "user-1", phone: "01099589674" },
    { kind: "order", phone: "01111111111", orderNumber: "DARB-1002" },
  ]);

  assert.equal(customers.length, 2);
});

test("request bodies cannot directly force Verified Purchase", () => {
  assert.throws(
    () => assertNoDirectVerificationFlag({ isVerifiedPurchase: true }),
    /cannot be set directly/
  );
});

test("manual admin review defaults unverified", () => {
  const review = { source: "admin", order: null, customer: null };
  applyManualReviewVerification(review, {}, { isCreate: true });
  assert.equal(review.isVerifiedPurchase, false);
});

test("admin create accepts manualVerifiedPurchase true", () => {
  const review = { source: "admin", order: null, customer: null };
  applyManualReviewVerification(review, { manualVerifiedPurchase: true }, { isCreate: true });
  assert.equal(review.isVerifiedPurchase, true);
});

test("admin create treats false or missing manual verification as unverified", () => {
  for (const value of [false, "false", 1, "1", null, undefined]) {
    assert.equal(parseManualVerifiedPurchase(value), false);
  }
  const review = { source: "admin" };
  applyManualReviewVerification(review, { manualVerifiedPurchase: false }, { isCreate: true });
  assert.equal(review.isVerifiedPurchase, false);
});

test("admin can check manual verification later", () => {
  const review = { source: "admin", isVerifiedPurchase: false };
  applyManualReviewVerification(review, { manualVerifiedPurchase: "true" });
  assert.equal(review.isVerifiedPurchase, true);
});

test("admin can uncheck manual verification later", () => {
  const review = { source: "admin", isVerifiedPurchase: true };
  applyManualReviewVerification(review, { manualVerifiedPurchase: "false" });
  assert.equal(review.isVerifiedPurchase, false);
});

test("admin edit without manual verification preserves its current value", () => {
  const review = { source: "admin", isVerifiedPurchase: true };
  applyManualReviewVerification(review, { text: "Updated review text" });
  assert.equal(review.isVerifiedPurchase, true);
});

test("customer requests cannot set isVerifiedPurchase", () => {
  assert.throws(
    () => assertNoCustomerVerificationFlag({ isVerifiedPurchase: true }),
    /cannot be set directly/
  );
});

test("customer requests cannot set manualVerifiedPurchase", () => {
  assert.throws(
    () => assertNoCustomerVerificationFlag({ manualVerifiedPurchase: true }),
    /only available for admin reviews/
  );
});

test("validated customer order verification remains automatic", () => {
  assert.deepEqual(
    getCustomerReviewVerification({
      eligibleOrder: { _id: "order-1" },
      customerId: "customer-1",
    }),
    {
      customer: "customer-1",
      order: "order-1",
      isVerifiedPurchase: true,
    }
  );
});

test("customer review product relationship mutations are rejected", () => {
  const review = { source: "customer" };
  assert.throws(
    () => assertCustomerReviewUpdateAllowed({ review, body: { productId: "product-2" } }),
    /purchase links and media cannot be changed/
  );
  assert.throws(
    () => assertCustomerReviewUpdateAllowed({ review, body: { product: "product-2" } }),
    /purchase links and media cannot be changed/
  );
});

test("customer review order relationship mutations are rejected", () => {
  const review = { source: "customer" };
  assert.throws(
    () => assertCustomerReviewUpdateAllowed({ review, body: { orderId: "order-2" } }),
    /purchase links and media cannot be changed/
  );
  assert.throws(
    () => assertCustomerReviewUpdateAllowed({ review, body: { order: "" } }),
    /purchase links and media cannot be changed/
  );
});

test("customer review media mutations are rejected", () => {
  const review = { source: "customer" };
  assert.throws(
    () => assertCustomerReviewUpdateAllowed({ review, body: {}, file: { mimetype: "image/png" } }),
    /purchase links and media cannot be changed/
  );
  assert.throws(
    () => assertCustomerReviewUpdateAllowed({ review, body: { removeImage: "true" } }),
    /purchase links and media cannot be changed/
  );
});

test("unrelated customer review moderation and content edits preserve immutable fields", () => {
  const review = {
    source: "customer",
    product: "product-1",
    order: "order-1",
    customer: "customer-1",
    isVerifiedPurchase: true,
    media: { type: "image", url: "https://cdn.example/customer-review.webp" },
  };
  const before = structuredClone(review);

  assert.doesNotThrow(() => assertCustomerReviewUpdateAllowed({
    review,
    body: { status: "approved", text: "Updated customer review text" },
  }));
  assert.deepEqual(review, before);
});

test("manual reviews allow product and media editing independently", () => {
  const review = { source: "admin" };
  assert.doesNotThrow(() => assertCustomerReviewUpdateAllowed({
    review,
    body: { productId: "product-1", removeImage: "true" },
    file: { mimetype: "image/webp" },
  }));
});

test("editing a customer review cannot manually alter verification", () => {
  const review = {
    source: "customer",
    isVerifiedPurchase: true,
  };
  assert.throws(
    () => assertCustomerReviewUpdateAllowed({ review, body: { manualVerifiedPurchase: false } }),
    /purchase links and media cannot be changed/
  );
  applyManualReviewVerification(review, { manualVerifiedPurchase: false });
  assert.equal(review.isVerifiedPurchase, true);
});

test("manual admin review does not require an order or customer relationship", () => {
  const review = {
    source: "admin",
    order: null,
    customer: null,
  };
  applyManualReviewVerification(review, { manualVerifiedPurchase: true }, { isCreate: true });
  assert.equal(review.order, null);
  assert.equal(review.customer, null);
  assert.equal(review.isVerifiedPurchase, true);
});

test("manual product selection is independent from verification", () => {
  const review = {
    source: "admin",
    product: "product-1",
    isVerifiedPurchase: false,
  };
  applyManualReviewVerification(review, { manualVerifiedPurchase: true });
  assert.equal(review.product, "product-1");
  assert.equal(review.isVerifiedPurchase, true);
});
