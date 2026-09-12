const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getPaymentProofDecisionPlan,
  getPaymentProofSubmissionPlan,
  getRegistrationEmailPlan,
  getReviewApprovalPlan,
  getReviewSubmissionPlan,
} = require("../services/transactionalEmailEvents.service");

test("transactional registration email planning does not require marketing consent", () => {
  const withoutConsent = getRegistrationEmailPlan({ email: "customer@example.com", marketingConsent: false });
  const withConsent = getRegistrationEmailPlan({ email: "customer@example.com", marketingConsent: true });
  assert.deepEqual(withoutConsent, withConsent);
  assert.deepEqual(withoutConsent.map((event) => event.type), ["customer_welcome", "admin_signup"]);
});

test("phone-only registration skips welcome and retains the admin signup event", () => {
  assert.deepEqual(
    getRegistrationEmailPlan({ email: "" }).map((event) => event.type),
    ["admin_signup"]
  );
});

test("customer registration targets welcome plus admin signup", () => {
  const plan = getRegistrationEmailPlan({ email: " CUSTOMER@Example.com " });
  assert.equal(plan[0].to, "customer@example.com");
  assert.deepEqual(plan.map((event) => event.audience), ["customer", "admin"]);
});

test("payment proof submission and resubmission select distinct events", () => {
  assert.deepEqual(
    getPaymentProofSubmissionPlan({ email: "buyer@example.com" }).map((event) => event.type),
    ["customer_proof_submitted", "admin_proof_submitted"]
  );
  assert.deepEqual(
    getPaymentProofSubmissionPlan({ email: "buyer@example.com", isResubmission: true }).map((event) => event.type),
    ["customer_proof_resubmitted", "admin_proof_resubmitted"]
  );
});

test("payment proof approval produces one combined confirmation when it auto-confirms", () => {
  const plan = getPaymentProofDecisionPlan({
    action: "approve",
    email: "buyer@example.com",
    autoConfirmed: true,
  });
  assert.equal(plan.length, 1);
  assert.equal(plan[0].type, "customer_proof_approved_confirmed");
});

test("repeating an already-applied proof decision does not resend its email", () => {
  assert.deepEqual(getPaymentProofDecisionPlan({
    action: "approve",
    email: "buyer@example.com",
    previousProofStatus: "approved",
  }), []);
  assert.deepEqual(getPaymentProofDecisionPlan({
    action: "reject",
    email: "buyer@example.com",
    previousProofStatus: "rejected",
  }), []);
});

test("payment proof rejection supports a safe optional reason", () => {
  assert.equal(
    getPaymentProofDecisionPlan({ action: "reject", email: "buyer@example.com" })[0].reason,
    ""
  );
  assert.equal(
    getPaymentProofDecisionPlan({
      action: "reject",
      email: "buyer@example.com",
      reason: "  Screenshot   does not show completion.  ",
    })[0].reason,
    "Screenshot does not show completion."
  );
});

test("customer review submission plans customer receipt and admin alert", () => {
  assert.deepEqual(
    getReviewSubmissionPlan({ source: "customer", email: "buyer@example.com" }).map((event) => event.type),
    ["customer_review_received", "admin_review_pending"]
  );
});

test("admin manual reviews do not trigger customer-submission emails", () => {
  assert.deepEqual(getReviewSubmissionPlan({ source: "admin", email: "buyer@example.com" }), []);
});

test("review approval email occurs only on a customer transition to approved", () => {
  assert.deepEqual(
    getReviewApprovalPlan({
      source: "customer",
      email: "buyer@example.com",
      previousStatus: "pending",
      nextStatus: "approved",
    }).map((event) => event.type),
    ["customer_review_approved"]
  );
  assert.deepEqual(
    getReviewApprovalPlan({
      source: "admin",
      email: "buyer@example.com",
      previousStatus: "pending",
      nextStatus: "approved",
    }),
    []
  );
});

test("already-approved unrelated review edits do not resend approval", () => {
  assert.deepEqual(
    getReviewApprovalPlan({
      source: "customer",
      email: "buyer@example.com",
      previousStatus: "approved",
      nextStatus: "approved",
    }),
    []
  );
});
