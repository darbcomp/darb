const test = require("node:test");
const assert = require("node:assert/strict");

const {
  preserveOptionalBoolean,
  preserveOptionalString,
} = require("../utils/preserveOptionalField");

const parseBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === "") return defaultValue;
  if (typeof value === "boolean") return value;
  return String(value).toLowerCase() === "true";
};

test("product SEO and hidden placeholder state survive an update that omits them", () => {
  const updateBody = { name: "Updated visible name" };

  assert.equal(preserveOptionalString(updateBody, "metaTitle", "Saved product SEO"), "Saved product SEO");
  assert.equal(preserveOptionalString(updateBody, "metaDescription", "Saved product description"), "Saved product description");
  assert.equal(preserveOptionalBoolean(updateBody, "isPlaceholder", true, parseBoolean), true);
});

test("category SEO survives an update that omits all SEO fields", () => {
  const updateBody = { description: "Updated visible description" };

  assert.deepEqual(
    {
      seoTitle: preserveOptionalString(updateBody, "seoTitle", "Saved category SEO"),
      seoDescription: preserveOptionalString(updateBody, "seoDescription", "Saved category description"),
      arabicSeoTitle: preserveOptionalString(updateBody, "arabicSeoTitle", "عنوان محفوظ"),
      arabicSeoDescription: preserveOptionalString(updateBody, "arabicSeoDescription", "وصف محفوظ"),
    },
    {
      seoTitle: "Saved category SEO",
      seoDescription: "Saved category description",
      arabicSeoTitle: "عنوان محفوظ",
      arabicSeoDescription: "وصف محفوظ",
    }
  );
});

test("explicit optional values can still be changed or cleared", () => {
  assert.equal(preserveOptionalString({ metaTitle: " New title " }, "metaTitle", "Old title"), "New title");
  assert.equal(preserveOptionalString({ metaTitle: "" }, "metaTitle", "Old title"), "");
  assert.equal(preserveOptionalBoolean({ isPlaceholder: false }, "isPlaceholder", true, parseBoolean), false);
});
