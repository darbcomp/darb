const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const SpinGrant = require("../models/SpinGrant");
const { ensureOrderSpinGrant } = require("../services/spinGrant.service");
const { buildCustomerPipeline } = require("../controllers/customer.controller");
const { cookieSameSite } = require("../middleware/security.middleware");

const source = (relative) => readFileSync(join(__dirname, "..", relative), "utf8");

test("order-earned spins are created only after delivery", async () => {
  const original = SpinGrant.findOneAndUpdate;
  let calls = 0;
  SpinGrant.findOneAndUpdate = async () => { calls += 1; return { _id: "grant" }; };
  try {
    const base = { _id: "order-1", customer: null, customerSnapshot: { phone: "01012345678" } };
    assert.equal(await ensureOrderSpinGrant({ ...base, orderStatus: "confirmed" }), null);
    assert.equal(calls, 0);
    const grant = await ensureOrderSpinGrant({ ...base, orderStatus: "delivered" });
    assert.equal(grant._id, "grant");
    assert.equal(calls, 1);
  } finally {
    SpinGrant.findOneAndUpdate = original;
  }
});

test("guest spin endpoint requires exact delivered order number plus phone", () => {
  const code = source("controllers/reward.controller.js");
  assert.ok(code.includes("const orderNumber = String(req.body?.orderNumber"));
  assert.ok(code.includes('orderStatus: "delivered"'));
  assert.ok(code.includes("getEgyptPhoneIdentityVariants"));
  assert.ok(code.includes("sourceOrderId: sourceOrder._id"));
});

test("claimed order-spin rewards are guarded by delivered source order", () => {
  const code = source("services/entitlement.service.js");
  assert.ok(code.includes("assertOrderSpinSourceDelivered"));
  assert.ok(code.includes('sourceOrder.orderStatus !== "delivered"'));
});

test("customer totalSpent counts only paid non-cancelled orders", () => {
  const pipeline = JSON.stringify(buildCustomerPipeline());
  assert.ok(pipeline.includes("$$this.paymentStatus"));
  assert.ok(pipeline.includes("paid"));
  assert.ok(pipeline.includes("cancelled"));
});

test("admin paid revenue and proof-review filters are hardened", () => {
  const code = source("controllers/admin.controller.js");
  assert.ok(code.includes('paymentStatus: "paid"'));
  assert.ok(code.includes('Order.countDocuments({ "paymentProof.status": "submitted", orderStatus: { $ne: "cancelled" } })'));
});

test("production cookie SameSite fallback is lax while explicit none remains supported", () => {
  const oldNodeEnv = process.env.NODE_ENV;
  const oldSameSite = process.env.COOKIE_SAME_SITE;
  try {
    process.env.NODE_ENV = "production";
    delete process.env.COOKIE_SAME_SITE;
    assert.equal(cookieSameSite(), "lax");
    process.env.COOKIE_SAME_SITE = "none";
    assert.equal(cookieSameSite(), "none");
  } finally {
    if (oldNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = oldNodeEnv;
    if (oldSameSite === undefined) delete process.env.COOKIE_SAME_SITE; else process.env.COOKIE_SAME_SITE = oldSameSite;
  }
});
