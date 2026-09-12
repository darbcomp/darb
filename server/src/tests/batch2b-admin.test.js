const test = require("node:test");
const assert = require("node:assert/strict");

const {
  aggregateCustomerRecords,
  getCustomerIdentityKey,
} = require("../services/customerAggregation.service");
const {
  assertCustomerReviewUpdateAllowed,
  assertNoDirectVerificationFlag,
  clearReviewVerification,
  getReviewRelationshipIntent,
  validateReviewVerification,
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

const deliveredOrder = {
  _id: "order-1",
  customer: "customer-1",
  orderStatus: "delivered",
  items: [{ product: "product-1" }],
};

test("delivered order and purchased product create a verified relationship", () => {
  assert.deepEqual(
    validateReviewVerification({ order: deliveredOrder, productId: "product-1" }),
    {
      order: "order-1",
      customer: "customer-1",
      product: "product-1",
      isVerifiedPurchase: true,
    }
  );
});

test("non-delivered orders cannot verify a review", () => {
  assert.throws(
    () => validateReviewVerification({
      order: { ...deliveredOrder, orderStatus: "shipped" },
      productId: "product-1",
    }),
    /Only delivered orders/
  );
});

test("a product outside the selected order cannot verify a review", () => {
  assert.throws(
    () => validateReviewVerification({ order: deliveredOrder, productId: "product-2" }),
    /product that was purchased/
  );
});

test("request bodies cannot directly force Verified Purchase", () => {
  assert.throws(
    () => assertNoDirectVerificationFlag({ isVerifiedPurchase: true }),
    /linking a delivered order/
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

test("manual reviews still allow secure order, product, and media editing inputs", () => {
  const review = { source: "admin" };
  assert.doesNotThrow(() => assertCustomerReviewUpdateAllowed({
    review,
    body: { orderId: "order-1", productId: "product-1", removeImage: "true" },
    file: { mimetype: "image/webp" },
  }));
  assert.equal(
    validateReviewVerification({ order: deliveredOrder, productId: "product-1" }).isVerifiedPurchase,
    true
  );
});

test("an unrelated admin review edit preserves media and purchase relationship fields", () => {
  const review = {
    media: { type: "image", url: "https://cdn.example/review.webp" },
    order: "order-1",
    product: "product-1",
    customer: "customer-1",
    isVerifiedPurchase: true,
  };

  assert.equal(getReviewRelationshipIntent({ text: "Updated review text" }), "preserve");
  assert.equal(review.media.url, "https://cdn.example/review.webp");
  assert.equal(review.order, "order-1");
  assert.equal(review.isVerifiedPurchase, true);
});

test("explicitly removing a purchase relationship clears verification", () => {
  const review = {
    order: "order-1",
    product: "product-1",
    customer: "customer-1",
    isVerifiedPurchase: true,
  };

  assert.equal(getReviewRelationshipIntent({ orderId: "" }), "clear");
  clearReviewVerification(review);
  assert.equal(review.order, null);
  assert.equal(review.customer, null);
  assert.equal(review.isVerifiedPurchase, false);
  assert.equal(review.product, "product-1");
});

test("changing a verified review to an unpurchased product fails revalidation", () => {
  assert.equal(getReviewRelationshipIntent({ productId: "product-2" }), "revalidate");
  assert.throws(
    () => validateReviewVerification({ order: deliveredOrder, productId: "product-2" }),
    /product that was purchased/
  );
});
