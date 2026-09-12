const User = require("../models/User");
const Order = require("../models/Order");
const MarketingSuppression = require("../models/MarketingSuppression");
const { normalizeEgyptPhone } = require("../utils/normalizePhone");

const normalizeMarketingEmail = (value = "") => {
  const email = String(value).trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
};

const resolveMarketingRecipients = ({ users = [], orders = [], suppressedEmails = [] }) => {
  const suppressed = new Set(suppressedEmails.map(normalizeMarketingEmail).filter(Boolean));
  const registeredPhones = new Map();
  const registeredEmails = new Map();
  const candidates = [];

  users.forEach((user) => {
    if (user.role && user.role !== "customer") return;
    const phone = normalizeEgyptPhone(user.phone);
    const email = normalizeMarketingEmail(user.email);
    const eligible = user.isActive !== false && user.marketingConsent?.granted === true && Boolean(email);
    if (phone) registeredPhones.set(phone, { eligible, email });
    if (email) registeredEmails.set(email, eligible);
    if (eligible) candidates.push({ email, userId: user._id || null, identityKey: phone ? `phone:${phone}` : `user:${user._id}` });
  });

  const latestGuestByPhone = new Map();
  [...orders]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .forEach((order) => {
      if (order.customer) return;
      const phone = normalizeEgyptPhone(order.customerSnapshot?.phone);
      if (!phone || latestGuestByPhone.has(phone) || registeredPhones.has(phone)) return;
      latestGuestByPhone.set(phone, order);
    });

  latestGuestByPhone.forEach((order, phone) => {
    const email = normalizeMarketingEmail(order.customerSnapshot?.email);
    if (order.marketingConsent?.granted === true && email && registeredEmails.get(email) !== false) {
      candidates.push({ email, identityKey: `phone:${phone}` });
    }
  });

  const seenEmails = new Set();
  return candidates.filter(({ email }) => {
    if (!email || suppressed.has(email) || seenEmails.has(email)) return false;
    seenEmails.add(email);
    return true;
  });
};

const getEligibleMarketingRecipients = async () => {
  const [users, orders, suppressions] = await Promise.all([
    User.find({ role: "customer" }).select("_id email phone role isActive marketingConsent").lean(),
    Order.find({}).select("customer customerSnapshot marketingConsent createdAt").sort({ createdAt: -1 }).lean(),
    MarketingSuppression.find({}).select("normalizedEmail -_id").lean(),
  ]);
  return resolveMarketingRecipients({
    users,
    orders,
    suppressedEmails: suppressions.map((item) => item.normalizedEmail),
  });
};

module.exports = { getEligibleMarketingRecipients, normalizeMarketingEmail, resolveMarketingRecipients };
