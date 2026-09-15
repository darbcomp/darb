const test = require("node:test");
const assert = require("node:assert/strict");

const Order = require("../models/Order");
const Entitlement = require("../models/Entitlement");
const { sanitizePaymentProofForClient } = require("../utils/paymentProofResponse");
const {
  buildSyncVariantStockOperation,
} = require("../utils/inventory");
const {
  calculateBundleDiscount,
} = require("../utils/calculateCart");
const {
  makeRewardCode,
  makeUniqueRewardCode,
} = require("../services/spinGrant.service");

test("payment-proof sender name is stored in the nested proof schema", () => {
  const proofSchema = Order.schema.path("paymentProof").schema;
  const senderPath = proofSchema.path("senderName");

  assert.ok(senderPath);
  assert.equal(senderPath.options.maxlength, 120);
});

test("payment-proof client response prefers nested sender and supports legacy fallback", () => {
  assert.equal(
    sanitizePaymentProofForClient(
      { status: "submitted", senderName: "Nested Sender" },
      { includeSenderName: true, fallbackSenderName: "Legacy Sender" }
    ).senderName,
    "Nested Sender"
  );

  assert.equal(
    sanitizePaymentProofForClient(
      { status: "submitted" },
      { includeSenderName: true, fallbackSenderName: "Legacy Sender" }
    ).senderName,
    "Legacy Sender"
  );
});

test("variant inventory sync recomputes aggregate stock from active variants", () => {
  const operation = buildSyncVariantStockOperation({
    product: "product-1",
    variant: { variantId: "variant-1" },
  });

  assert.equal(operation.filter._id, "product-1");
  assert.ok(Array.isArray(operation.update));
  assert.match(JSON.stringify(operation.update), /\$filter/);
  assert.match(JSON.stringify(operation.update), /isActive/);

  assert.equal(
    buildSyncVariantStockOperation({ product: "product-1", variant: null }),
    null
  );
});

test("specific-product percentage bundle uses actual prices across variants", () => {
  const discount = calculateBundleDiscount({
    bundle: {
      bundleType: "specific_products",
      discountType: "percentage",
      discountValue: 15,
      specificItems: [{ product: "product-1", quantity: 2 }],
    },
    eligibleItems: [
      { product: "product-1", unitPrice: 750, quantity: 1 },
      { product: "product-1", unitPrice: 1000, quantity: 1 },
    ],
    applications: 1,
  });

  assert.equal(discount.amount, 262.5);
});

test("specific-product fixed bundle price uses actual prices across variants", () => {
  const discount = calculateBundleDiscount({
    bundle: {
      bundleType: "specific_products",
      discountType: "fixed_bundle_price",
      discountValue: 1500,
      specificItems: [{ product: "product-1", quantity: 2 }],
    },
    eligibleItems: [
      { product: "product-1", unitPrice: 750, quantity: 1 },
      { product: "product-1", unitPrice: 1000, quantity: 1 },
    ],
    applications: 1,
  });

  assert.equal(discount.amount, 250);
});

test("specific-product requirements aggregate duplicate product rows", () => {
  const discount = calculateBundleDiscount({
    bundle: {
      bundleType: "specific_products",
      discountType: "percentage",
      discountValue: 10,
      specificItems: [
        { product: "product-1", quantity: 1 },
        { product: "product-1", quantity: 1 },
      ],
    },
    eligibleItems: [
      { product: "product-1", unitPrice: 750, quantity: 1 },
      { product: "product-1", unitPrice: 1000, quantity: 1 },
    ],
    applications: 1,
  });

  assert.equal(discount.amount, 175);
});

test("reward codes use 96 bits of random hexadecimal data", () => {
  assert.match(makeRewardCode(), /^DARB-[A-F0-9]{24}$/);
});

test("unique reward-code generation retries when a candidate already exists", async () => {
  const originalExists = Entitlement.exists;
  let calls = 0;

  Entitlement.exists = async () => {
    calls += 1;
    return calls === 1 ? { _id: "existing" } : null;
  };

  try {
    const code = await makeUniqueRewardCode();
    assert.match(code, /^DARB-[A-F0-9]{24}$/);
    assert.equal(calls, 2);
  } finally {
    Entitlement.exists = originalExists;
  }
});
