const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildPlainText: buildOrderPlainText,
  renderEmailLayout,
} = require("../services/orderEmail.service");
const {
  buildText: buildPromotionText,
  renderPromotionalEmail,
} = require("../services/promotionEmail.service");

const visibleEmail = "darbcomp@gmail.com";
const settings = {
  tagline: "A scent for every path.",
  currency: "EGP",
  contact: { email: visibleEmail },
  paymentMethods: {},
  brand: {
    darkGreen: "#0F3D2E",
    beige: "#E7DCC9",
    softGold: "#C8A97E",
    black: "#1C1C1C",
    cream: "#F7F1E6",
  },
};
const order = {
  orderNumber: "DARB-TEST-1",
  items: [{ productSnapshot: { name: "Test scent", sizeLabel: "50 ML" }, quantity: 1, lineTotal: 1000 }],
  discounts: [],
  subtotal: 1000,
  discountTotal: 0,
  deliveryFee: 100,
  total: 1100,
  paymentMethod: "cash_on_delivery",
  shippingAddress: { street: "Test street", city: "Cairo", governorate: "Cairo" },
};

test("order email bodies keep the branded footer without printing the contact email", () => {
  const html = renderEmailLayout({
    settings,
    title: "Your order is received.",
    intro: "Thank you for your order.",
    order,
    footerMessage: "A memory in every step.",
  });
  const text = buildOrderPlainText({ order, settings, intro: "Thank you for your order." });

  assert.match(html, /A memory in every step\./);
  assert.doesNotMatch(html, new RegExp(visibleEmail, "i"));
  assert.doesNotMatch(text, new RegExp(visibleEmail, "i"));
});

test("promotion email bodies omit the contact email and retain unsubscribe content", () => {
  const unsubscribeUrl = "https://darb.example/unsubscribe?token=test";
  const payload = {
    presentation: { title: "A Darb offer", details: [], ctaPath: "" },
    message: "A limited Darb path.",
    unsubscribeUrl,
    isTest: false,
  };
  const html = renderPromotionalEmail({ settings, ...payload });
  const text = buildPromotionText(payload);

  assert.doesNotMatch(html, new RegExp(visibleEmail, "i"));
  assert.doesNotMatch(text, new RegExp(visibleEmail, "i"));
  assert.match(html, /Unsubscribe from promotional emails/);
  assert.match(html, /Transactional account and order emails will continue\./);
  assert.match(text, /Unsubscribe: https:\/\/darb\.example\/unsubscribe\?token=test/);
});
