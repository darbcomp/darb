const jwt = require("jsonwebtoken");
const User = require("../models/User");
const MarketingSuppression = require("../models/MarketingSuppression");
const { normalizeMarketingEmail } = require("./marketingRecipient.service");

const TOKEN_PURPOSE = "marketing_unsubscribe";

const createUnsubscribeToken = ({ email, userId = null }) => {
  const normalizedEmail = normalizeMarketingEmail(email);
  if (!normalizedEmail || !process.env.JWT_SECRET) return "";
  return jwt.sign({ purpose: TOKEN_PURPOSE, email: normalizedEmail, userId: userId ? String(userId) : "" }, process.env.JWT_SECRET, { expiresIn: "180d" });
};

const verifyUnsubscribeToken = (token) => {
  if (!token || !process.env.JWT_SECRET) throw new Error("invalid_unsubscribe_token");
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const email = normalizeMarketingEmail(decoded.email);
  if (decoded.purpose !== TOKEN_PURPOSE || !email) throw new Error("invalid_unsubscribe_token");
  return { email, userId: decoded.userId || "" };
};

const unsubscribeMarketingToken = async (token) => {
  const { email, userId } = verifyUnsubscribeToken(token);
  await MarketingSuppression.updateOne(
    { normalizedEmail: email },
    { $setOnInsert: { normalizedEmail: email }, $set: { reason: "unsubscribe", ...(userId ? { user: userId } : {}) } },
    { upsert: true }
  );
  if (userId) {
    await User.updateOne(
      { _id: userId, email },
      { $set: { "marketingConsent.granted": false, "marketingConsent.grantedAt": null, "marketingConsent.source": "unsubscribe" } }
    );
  }
  return { success: true };
};

module.exports = { createUnsubscribeToken, unsubscribeMarketingToken, verifyUnsubscribeToken };
