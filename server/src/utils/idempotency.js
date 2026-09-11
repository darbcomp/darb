const { normalizeEgyptPhone } = require("./normalizePhone");

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$/;

const normalizeIdempotencyKey = (value = "") => String(value).trim();

const isValidIdempotencyKey = (value = "") =>
  IDEMPOTENCY_KEY_PATTERN.test(normalizeIdempotencyKey(value));

const isDuplicateKeyError = (error) =>
  Boolean(error && (error.code === 11000 || error?.cause?.code === 11000));

const isOrderReplayOwner = (order, { userId = null, phone = "" } = {}) => {
  if (!order) return false;

  const storedCustomerId = order.customer?._id || order.customer || null;
  if (userId) {
    return Boolean(storedCustomerId) && String(storedCustomerId) === String(userId);
  }

  if (storedCustomerId) return false;
  const submittedPhone = normalizeEgyptPhone(phone);
  const storedPhone = normalizeEgyptPhone(order.customerSnapshot?.phone);
  return Boolean(submittedPhone && storedPhone && submittedPhone === storedPhone);
};

module.exports = {
  IDEMPOTENCY_KEY_PATTERN,
  normalizeIdempotencyKey,
  isValidIdempotencyKey,
  isDuplicateKeyError,
  isOrderReplayOwner,
};
