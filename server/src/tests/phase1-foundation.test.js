const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeEgyptPhone } = require("../utils/normalizePhone");
const { products } = require("../seed/catalog.data");
const {
  GRAPH_API_VERSION,
  normalizeEmail,
  normalizePhone: normalizeMetaPhone,
  hashNormalized,
  buildUserData,
  buildOrderUserData,
  buildPurchaseCustomData,
  buildMetaRequest,
  sendMetaEvent,
} = require("../services/metaCapi.service");

test("Egypt phone normalization is stable", () => {
  assert.equal(normalizeEgyptPhone("01099589674"), "201099589674");
  assert.equal(normalizeEgyptPhone("+20 10 99589674"), "201099589674");
  assert.equal(normalizeEgyptPhone("0020 10 99589674"), "201099589674");
});

test("Darb catalog contains 26 perfumes and 6 musk products", () => {
  assert.equal(products.filter((p) => p.productType === "perfume").length, 26);
  assert.equal(products.filter((p) => p.productType === "musk").length, 6);
  assert.equal(products.length, 32);
});

test("canonical names and unisex assignments are locked", () => {
  assert.ok(products.some((p) => p.name === "Ghewaa" && p.slug === "ghewaa"));
  assert.ok(products.some((p) => p.name === "Mawg" && p.slug === "mawg"));
  const unisex = products.filter((p) => p.alsoIn.includes("unisex")).map((p) => p.slug).sort();
  assert.deepEqual(unisex, ["mahd", "mazaq", "nagham", "najm"]);
});

test("Mahd uses key notes without an invented pyramid", () => {
  const mahd = products.find((p) => p.slug === "mahd");
  assert.ok(mahd.keyNotes.length > 0);
  assert.deepEqual(mahd.scentNotes, { top: [], middle: [], base: [] });
});

test("launch prices, initial best sellers, and musk variants are locked", () => {
  const expectedPrices = {
    faris: 800, mawg: 700, qandeel: 650, hazeem: 800, mazaq: 750, haibah: 750,
    sahm: 700, naseem: 850, hawas: 800, barq: 750, najm: 800, sehr: 700,
    hawa: 750, sahar: 750, ghazal: 700, rouh: 800, gharam: 750, nagham: 650,
    rahaf: 650, layla: 750, mahd: 850, haneen: 750, ishq: 800, ward: 700,
    ghewaa: 800, shaghaf: 750,
  };
  for (const product of products.filter((p) => p.productType === "perfume")) {
    assert.equal(product.concentration, "");
    assert.equal(product.price, expectedPrices[product.slug]);
    assert.equal(product.stock, 8);
  }
  assert.deepEqual(products.filter((p) => p.isBestSeller).map((p) => p.slug).sort(), ["faris", "gharam", "mawg", "shaghaf"]);
  for (const product of products.filter((p) => p.productType === "musk")) {
    assert.equal(product.sizeLabel, "6 ML");
    assert.equal(product.sizeMl, 6);
    assert.equal(product.price, 200);
    assert.equal(product.isActive, true);
    assert.equal(product.isPlaceholder, false);
    assert.ok(product.description.length > 40);
  }
});

test("Meta CAPI normalization and hashing are stable", () => {
  assert.equal(normalizeEmail("  Person@Example.COM "), "person@example.com");
  assert.equal(normalizeMetaPhone("010 9958 9674"), "201099589674");
  assert.equal(hashNormalized("person@example.com"), "542d240129883c019e106e3b1b2d3f3cb3537c43c425364de8e951d5a3083345");
});

test("Meta CAPI user data excludes empty identifiers", () => {
  assert.deepEqual(buildUserData({ fbp: "fb.1.valid", email: "" }), { fbp: "fb.1.valid" });
});

test("Meta Purchase user data omits guest external id and retains authenticated customer id", () => {
  const order = { customerSnapshot: { email: "person@example.com", phone: "01099589674" } };
  const guest = buildUserData(buildOrderUserData(order));
  const authenticated = buildUserData(buildOrderUserData({ ...order, customer: "customer-123" }));

  assert.equal(guest.external_id, undefined);
  assert.deepEqual(authenticated.external_id, [hashNormalized("customer-123")]);
});

test("Meta Purchase data uses authoritative order values", () => {
  const customData = buildPurchaseCustomData({
    orderNumber: "DARB-1234",
    total: 1725,
    items: [{ product: "product-1", quantity: 2, unitPrice: 700 }],
  });
  assert.equal(customData.value, 1725);
  assert.equal(customData.currency, "EGP");
  assert.equal(customData.num_items, 2);
  assert.deepEqual(customData.contents, [{ id: "product-1", quantity: 2, item_price: 700 }]);
});

test("Meta request retains event id and conditionally includes test code", () => {
  const base = { eventName: "Purchase", eventId: "event_1234567890", customData: { value: 100 } };
  const withoutTestCode = buildMetaRequest(base, {});
  const withTestCode = buildMetaRequest(base, { META_CAPI_TEST_EVENT_CODE: "TEST123" });
  assert.equal(withoutTestCode.data[0].event_id, base.eventId);
  assert.equal(withoutTestCode.test_event_code, undefined);
  assert.equal(withTestCode.test_event_code, "TEST123");
});

test("Meta CAPI is a no-op while disabled and contains network failure", async () => {
  let called = false;
  const disabled = await sendMetaEvent({ eventId: "event_1234567890" }, {
    env: {},
    fetchImpl: async () => { called = true; },
  });
  assert.equal(disabled.sent, false);
  assert.equal(called, false);

  let requestUrl = "";
  const sent = await sendMetaEvent({ eventName: "PageView", eventId: "event_1234567890" }, {
    env: { META_CAPI_ENABLED: "true", META_PIXEL_ID: "12345", META_CAPI_ACCESS_TOKEN: "test-token" },
    fetchImpl: async (url) => {
      requestUrl = url;
      return { ok: true };
    },
  });
  assert.equal(sent.sent, true);
  assert.equal(GRAPH_API_VERSION, "v26.0");
  assert.match(requestUrl, /graph\.facebook\.com\/v26\.0\/12345\/events$/);

  const originalError = console.error;
  console.error = () => {};
  try {
    const failed = await sendMetaEvent({ eventName: "Purchase", eventId: "event_1234567890" }, {
      env: { META_CAPI_ENABLED: "true", META_PIXEL_ID: "12345", META_CAPI_ACCESS_TOKEN: "test-token" },
      fetchImpl: async () => { throw new Error("offline"); },
    });
    assert.equal(failed.sent, false);
    assert.equal(failed.reason, "request_failed");
  } finally {
    console.error = originalError;
  }
});
