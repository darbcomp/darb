const test = require("node:test");
const assert = require("node:assert/strict");

const {
  normalizeMarketingEmail,
  resolveMarketingRecipients,
} = require("../services/marketingRecipient.service");
const {
  assertPromotionCanSend,
  describePromotion,
  escapeHtml,
  isDuplicateSendError,
  planPromotionRecipients,
  validatePromotionContent,
} = require("../services/promotionEmail.service");
const {
  createUnsubscribeToken,
  unsubscribeMarketingToken,
  verifyUnsubscribeToken,
} = require("../services/marketingUnsubscribe.service");
const MarketingSuppression = require("../models/MarketingSuppression");
const User = require("../models/User");
const { getRegistrationEmailPlan } = require("../services/transactionalEmailEvents.service");

const consent = (granted) => ({ granted });
const user = (overrides = {}) => ({ _id: "user-1", role: "customer", isActive: true, phone: "01012345678", email: "customer@example.com", marketingConsent: consent(true), ...overrides });
const order = (overrides = {}) => ({ customer: null, createdAt: "2026-01-01", customerSnapshot: { phone: "+201012345678", email: "guest@example.com" }, marketingConsent: consent(true), ...overrides });

test("registered consented customer with valid email is eligible", () => {
  assert.deepEqual(resolveMarketingRecipients({ users: [user()] , orders: [] }).map((item) => item.email), ["customer@example.com"]);
});

test("current registered refusal wins over matching historical guest consent", () => {
  const result = resolveMarketingRecipients({ users: [user({ marketingConsent: consent(false) })], orders: [order()] });
  assert.equal(result.length, 0);
});

test("guest latest explicit consent controls eligibility", () => {
  const granted = resolveMarketingRecipients({ users: [], orders: [order()] });
  assert.equal(granted[0].email, "guest@example.com");
  const withdrawn = resolveMarketingRecipients({ users: [], orders: [order(), order({ createdAt: "2026-02-01", marketingConsent: consent(false) })] });
  assert.equal(withdrawn.length, 0);
});

test("guest ambiguous or missing consent is excluded", () => {
  assert.equal(resolveMarketingRecipients({ users: [], orders: [order({ marketingConsent: {} })] }).length, 0);
  assert.equal(resolveMarketingRecipients({ users: [], orders: [order({ marketingConsent: undefined })] }).length, 0);
});

test("registered and guest equivalent Egyptian phone forms resolve as one identity", () => {
  const result = resolveMarketingRecipients({ users: [user()], orders: [order()] });
  assert.deepEqual(result.map((item) => item.email), ["customer@example.com"]);
});

test("normalized duplicate emails are sent once and invalid emails are excluded", () => {
  const result = resolveMarketingRecipients({ users: [user(), user({ _id: "user-2", phone: "01112345678", email: " Customer@Example.com " }), user({ _id: "user-3", phone: "01212345678", email: "invalid" })], orders: [] });
  assert.deepEqual(result.map((item) => item.email), ["customer@example.com"]);
  assert.equal(normalizeMarketingEmail("missing-at.example.com"), "");
});

test("suppressed normalized email is excluded", () => {
  assert.equal(resolveMarketingRecipients({ users: [user()], orders: [], suppressedEmails: [" CUSTOMER@example.com "] }).length, 0);
});

test("transactional registration planning remains independent of marketing consent", () => {
  const withoutConsent = getRegistrationEmailPlan({ email: "customer@example.com", marketingConsent: false });
  const withConsent = getRegistrationEmailPlan({ email: "customer@example.com", marketingConsent: true });
  assert.deepEqual(withoutConsent, withConsent);
});

test("expired, inactive, and exhausted promotions cannot send while future active promotions can", () => {
  assert.throws(() => assertPromotionCanSend({ isActive: false }), /inactive/);
  assert.throws(() => assertPromotionCanSend({ isActive: true, endAt: "2025-01-01" }, new Date("2026-01-01")), /expired/);
  assert.throws(() => assertPromotionCanSend({ isActive: true, usageLimit: 2, usedCount: 2 }), /no longer available/);
  assert.equal(assertPromotionCanSend({ isActive: true, startAt: "2030-01-01" }), true);
});

test("promotion content limits are enforced and HTML-special content is escaped", () => {
  assert.throws(() => validatePromotionContent({ subject: "x".repeat(121), message: "Valid" }), /120/);
  assert.throws(() => validatePromotionContent({ subject: "Valid", message: "x".repeat(1201) }), /1200/);
  assert.equal(escapeHtml('<script>alert("x")</script>'), "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
  assert.equal(validatePromotionContent({ subject: "Line one\r\nBcc: hidden@example.com", message: "Safe" }).subject.includes("\n"), false);
});

test("test delivery targets only admin while live delivery retains only server-planned recipients", () => {
  const eligible = [{ email: "one@example.com" }, { email: "two@example.com" }];
  assert.deepEqual(planPromotionRecipients({ mode: "test", adminEmail: "admin@example.com", eligibleRecipients: eligible }), [{ email: "admin@example.com", audience: "admin" }]);
  assert.deepEqual(planPromotionRecipients({ mode: "live", adminEmail: "admin@example.com", eligibleRecipients: eligible }).map((item) => item.email), ["one@example.com", "two@example.com"]);
});

test("duplicate database request identifiers are recognized by the send guard", () => {
  assert.equal(isDuplicateSendError({ code: 11000 }), true);
  assert.equal(isDuplicateSendError({ code: 400 }), false);
});

test("server derives customer-safe coupon details including its code", () => {
  const result = describePromotion("coupon", { isActive: true, name: "Welcome", code: "DARB10", discountType: "percentage", discountValue: 10 });
  assert.match(result.summary, /10% off/);
  assert.match(result.summary, /DARB10/);
  assert.doesNotMatch(result.summary, /usedCount|priority|_id/);
});

test("unsubscribe tokens cannot authorize an arbitrary address", () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "batch3b-test-secret";
  try {
    const token = createUnsubscribeToken({ email: "customer@example.com" });
    assert.equal(verifyUnsubscribeToken(token).email, "customer@example.com");
    assert.throws(() => verifyUnsubscribeToken(`${token}tampered`));
  } finally {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});

test("unsubscribe is idempotent and only moves registered consent toward false", async () => {
  const previousSecret = process.env.JWT_SECRET;
  const originalSuppressionUpdate = MarketingSuppression.updateOne;
  const originalUserUpdate = User.updateOne;
  process.env.JWT_SECRET = "batch3b-test-secret";
  const suppressionCalls = [];
  const userCalls = [];
  MarketingSuppression.updateOne = async (...args) => { suppressionCalls.push(args); return { acknowledged: true }; };
  User.updateOne = async (...args) => { userCalls.push(args); return { acknowledged: true }; };
  try {
    const token = createUnsubscribeToken({ email: "customer@example.com", userId: "507f1f77bcf86cd799439011" });
    await unsubscribeMarketingToken(token);
    await unsubscribeMarketingToken(token);
    assert.equal(suppressionCalls.length, 2);
    assert.equal(suppressionCalls.every((call) => call[2]?.upsert === true), true);
    assert.equal(userCalls.every((call) => call[1].$set["marketingConsent.granted"] === false), true);
  } finally {
    MarketingSuppression.updateOne = originalSuppressionUpdate;
    User.updateOne = originalUserUpdate;
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});
