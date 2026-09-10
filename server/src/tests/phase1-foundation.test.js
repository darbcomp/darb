const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeEgyptPhone } = require("../utils/normalizePhone");
const { products } = require("../seed/catalog.data");

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

test("regular perfume concentration remains unknown until owner confirms it", () => {
  for (const product of products.filter((p) => p.productType === "perfume")) {
    assert.equal(product.concentration, "");
    assert.equal(product.price, 1000);
    assert.equal(product.stock, 8);
  }
});
