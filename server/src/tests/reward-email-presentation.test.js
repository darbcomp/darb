const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");

const Entitlement = require("../models/Entitlement");
const {
  getRewardClaimEmailPlan,
} = require("../services/transactionalEmailEvents.service");
const {
  buildRewardClaimMessage,
  renderTransactionalEmail,
} = require("../services/transactionalEmail.service");
const {
  getPersistedGuestRewardEmail,
} = require("../services/rewardPresentation.service");
const {
  createUnsubscribeToken,
  verifyUnsubscribeToken,
} = require("../services/marketingUnsubscribe.service");

const reward = (overrides = {}) => ({
  key: "spin-5",
  type: "percentage",
  origin: "spin",
  label: "5% off an order",
  value: 5,
  code: "",
  ...overrides,
});

test("signed-in code-less reward is saved and must be chosen at checkout", () => {
  const entitlement = reward();
  const plan = getRewardClaimEmailPlan({ email: "customer@example.com", entitlement });
  const message = buildRewardClaimMessage(entitlement);
  assert.equal(plan.length, 1);
  assert.equal(plan[0].type, "customer_reward_claimed");
  assert.match(message.intro, /saved to your Darb account/i);
  assert.match(message.intro, /choose it at checkout/i);
  assert.doesNotMatch(message.intro, /automatic/i);
  assert.equal(message.details.some((detail) => detail.label === "Code" && detail.value), false);
});

test("signed-in coded reward email includes its code", () => {
  const message = buildRewardClaimMessage(reward({ code: "DARB-NEXT10" }));
  assert.equal(message.highlight.value, "DARB-NEXT10");
  assert.match(message.intro, /Enter this code/i);
});

test("guest coded reward instructions remain code-based", () => {
  const message = buildRewardClaimMessage(reward({ code: "DARB-GUEST10" }), { isGuest: true });
  assert.equal(message.highlight.value, "DARB-GUEST10");
  assert.match(message.intro, /Enter this code/i);
  assert.match(message.intro, /Keep it for checkout/i);
  assert.doesNotMatch(message.intro, /saved to your Darb account/i);
});

test("signed-in deferred reward email explains the intervening order", () => {
  const message = buildRewardClaimMessage(reward({
    key: "spin-next-10",
    label: "10% off your next order",
    code: "",
  }));
  assert.match(message.intro, /saved to your Darb account/i);
  assert.match(message.intro, /Place one order first/i);
  assert.match(message.intro, /following order/i);
  assert.equal(message.details.find((detail) => detail.label === "Reward").value, "10% off after your next order");
});

test("guest deferred reward email keeps the code and does not imply immediate use", () => {
  const message = buildRewardClaimMessage(reward({
    key: "spin-next-10",
    label: "10% off your next order",
    code: "DARB-DEFERRED",
  }), { isGuest: true });
  assert.equal(message.highlight.value, "DARB-DEFERRED");
  assert.match(message.intro, /Place one order first/i);
  assert.match(message.intro, /following order/i);
  assert.doesNotMatch(message.intro, /eligible checkout/i);
});

test("phone-only account skips reward email safely", () => {
  assert.deepEqual(getRewardClaimEmailPlan({ email: "", entitlement: reward() }), []);
});

test("reward email planning is independent of marketing consent and suppression", () => {
  const withoutConsent = getRewardClaimEmailPlan({ email: "customer@example.com", entitlement: reward(), marketingConsent: false, suppressed: true });
  const withConsent = getRewardClaimEmailPlan({ email: "customer@example.com", entitlement: reward(), marketingConsent: true, suppressed: false });
  assert.deepEqual(withoutConsent, withConsent);
});

test("guest destination comes only from persisted source-order email", () => {
  const sourceOrder = { customerSnapshot: { email: " ORDER@Example.com " }, requestEmail: "attacker@example.com" };
  assert.equal(getPersistedGuestRewardEmail(sourceOrder), "order@example.com");
  assert.equal(getPersistedGuestRewardEmail({ customerSnapshot: { email: "" } }), "");
});

test("reward claim planning produces exactly one email event", () => {
  const plan = getRewardClaimEmailPlan({ email: "customer@example.com", entitlement: reward() });
  assert.equal(plan.length, 1);
});

test("loading or listing without a newly claimed entitlement creates no email event", () => {
  assert.deepEqual(getRewardClaimEmailPlan({ email: "customer@example.com", entitlement: null }), []);
});

test("code-less rewards remain valid account entitlements", async () => {
  const entitlement = new Entitlement(reward({ user: "507f1f77bcf86cd799439011" }));
  await entitlement.validate();
  assert.equal(entitlement.code, "");
});

test("HTML-special reward labels and codes are escaped by the shared template", () => {
  const message = buildRewardClaimMessage(reward({ label: "<script>reward</script>", code: "DARB-<CODE>" }));
  const html = renderTransactionalEmail({
    settings: { tagline: "A scent for every path.", contact: { email: "darbcomp@gmail.com" }, brand: { darkGreen: "#0F3D2E", beige: "#E7DCC9", softGold: "#C8A97E", black: "#1C1C1C", cream: "#F7F1E6" } },
    ...message,
  });
  assert.doesNotMatch(html, /<script>reward<\/script>/);
  assert.match(html, /&lt;script&gt;reward&lt;\/script&gt;/);
  assert.match(html, /DARB-&lt;CODE&gt;/);
  assert.doesNotMatch(html, /darbcomp@gmail\.com/i);
});

test("new unsubscribe tokens are signed without a fixed expiry and legacy valid tokens still verify", () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "reward-email-test-secret";
  try {
    const token = createUnsubscribeToken({ email: "customer@example.com" });
    assert.equal(jwt.decode(token).exp, undefined);
    assert.equal(verifyUnsubscribeToken(token).email, "customer@example.com");
    const legacyToken = jwt.sign({ purpose: "marketing_unsubscribe", email: "customer@example.com", userId: "" }, process.env.JWT_SECRET, { expiresIn: "180d" });
    assert.equal(verifyUnsubscribeToken(legacyToken).email, "customer@example.com");
    assert.throws(() => verifyUnsubscribeToken(`${token}tampered`));
  } finally {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});
