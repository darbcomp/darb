const assertNoDirectVerificationFlag = (body = {}) => {
  if (Object.prototype.hasOwnProperty.call(body, "isVerifiedPurchase")) {
    throw new Error("Verified Purchase cannot be set directly.");
  }
};

const assertNoCustomerVerificationFlag = (body = {}) => {
  let message = "";
  if (Object.prototype.hasOwnProperty.call(body, "isVerifiedPurchase")) {
    message = "Verified Purchase cannot be set directly.";
  } else if (Object.prototype.hasOwnProperty.call(body, "manualVerifiedPurchase")) {
    message = "Manual Verified Purchase is only available for admin reviews.";
  }
  if (!message) return;

  const error = new Error(message);
  error.code = "CUSTOMER_REVIEW_VALIDATION";
  throw error;
};

const parseManualVerifiedPurchase = (value) => value === true || value === "true";

const applyManualReviewVerification = (review, body = {}, { isCreate = false } = {}) => {
  if (review?.source !== "admin") return review;

  const provided = Object.prototype.hasOwnProperty.call(body, "manualVerifiedPurchase");
  if (isCreate || provided) {
    review.isVerifiedPurchase = provided
      ? parseManualVerifiedPurchase(body.manualVerifiedPurchase)
      : false;
  }

  return review;
};

const getCustomerReviewVerification = ({ eligibleOrder, customerId } = {}) => {
  if (!eligibleOrder?._id || !customerId) {
    throw new Error("A validated customer order is required to verify a purchase.");
  }

  return {
    customer: customerId,
    order: eligibleOrder._id,
    isVerifiedPurchase: true,
  };
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
  "manualVerifiedPurchase",
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

module.exports = {
  applyManualReviewVerification,
  assertCustomerReviewUpdateAllowed,
  assertNoCustomerVerificationFlag,
  assertNoDirectVerificationFlag,
  customerReviewImmutableFields,
  getCustomerReviewVerification,
  parseManualVerifiedPurchase,
};
