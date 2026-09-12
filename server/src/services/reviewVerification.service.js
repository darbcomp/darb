const getPurchasedProductIds = (order = {}) => new Set(
  (order.items || []).map((item) => String(item?.product?._id || item?.product || "")).filter(Boolean)
);

const assertNoDirectVerificationFlag = (body = {}) => {
  if (Object.prototype.hasOwnProperty.call(body, "isVerifiedPurchase")) {
    throw new Error("Verified Purchase can only be set by linking a delivered order.");
  }
};

const customerReviewImmutableFields = [
  "orderId",
  "order",
  "productId",
  "product",
  "customerId",
  "customer",
  "fragranceName",
  "media",
  "image",
  "removeImage",
];

const assertCustomerReviewUpdateAllowed = ({ review, body = {}, file = null } = {}) => {
  if (review?.source === "admin") return;
  const hasForbiddenField = customerReviewImmutableFields.some((field) =>
    Object.prototype.hasOwnProperty.call(body, field)
  );
  if (file || hasForbiddenField) {
    throw new Error("Customer review purchase links and media cannot be changed from the admin editor.");
  }
};

const getReviewRelationshipIntent = (body = {}) => {
  assertNoDirectVerificationFlag(body);
  const orderProvided = body.orderId !== undefined || body.order !== undefined;
  const productProvided = body.productId !== undefined || body.product !== undefined;
  if (!orderProvided && !productProvided) return "preserve";
  if (orderProvided && !String(body.orderId || body.order || "").trim()) return "clear";
  if (orderProvided) return "verify";
  return "revalidate";
};

const clearReviewVerification = (review) => {
  review.order = null;
  review.customer = null;
  review.isVerifiedPurchase = false;
  return review;
};

const validateReviewVerification = ({ order, productId, customerId = "" } = {}) => {
  if (!order) throw new Error("Delivered order not found.");
  if (order.orderStatus !== "delivered") throw new Error("Only delivered orders can verify a purchase.");
  if (!productId || !getPurchasedProductIds(order).has(String(productId))) {
    throw new Error("Choose a product that was purchased in this order.");
  }
  if (customerId && String(order.customer || "") !== String(customerId)) {
    throw new Error("The selected customer does not match this order.");
  }
  return {
    order: order._id,
    customer: order.customer || null,
    product: productId,
    isVerifiedPurchase: true,
  };
};

module.exports = {
  assertCustomerReviewUpdateAllowed,
  assertNoDirectVerificationFlag,
  clearReviewVerification,
  customerReviewImmutableFields,
  getPurchasedProductIds,
  getReviewRelationshipIntent,
  validateReviewVerification,
};
