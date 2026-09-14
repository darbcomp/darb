process.env.DOTENV_CONFIG_QUIET = "true";
require("dotenv").config({ quiet: true });

const mongoose = require("mongoose");
const Product = require("../models/Product");
const Category = require("../models/Category");
const { products } = require("../seed/catalog.data");
const { categories } = require("../seed/seedCategories");

const applyChanges = process.argv.includes("--apply");
const hasText = (value) => typeof value === "string" && value.trim().length > 0;
const hasItems = (value) => Array.isArray(value) && value.length > 0;

const productFields = [
  ["arabicName", hasText],
  ["arabicShortDescription", hasText],
  ["arabicDescription", hasText],
  ["arabicScentFamilies", hasItems],
  ["arabicBestFor", hasItems],
  ["arabicKeyNotes", hasItems],
  ["arabicScentNotes.top", hasItems],
  ["arabicScentNotes.middle", hasItems],
  ["arabicScentNotes.base", hasItems],
];

const categoryFields = [
  ["arabicName", hasText],
  ["arabicDescription", hasText],
  ["arabicSeoTitle", hasText],
  ["arabicSeoDescription", hasText],
];

const readPath = (source, path) => path.split(".").reduce((value, key) => value?.[key], source);

const preserveText = (path, value) => ({
  $cond: [
    { $gt: [{ $strLenCP: { $trim: { input: { $ifNull: [`$${path}`, ""] } } } }, 0] },
    `$${path}`,
    value,
  ],
});

const preserveItems = (path, value) => ({
  $cond: [
    { $gt: [{ $size: { $ifNull: [`$${path}`, []] } }, 0] },
    `$${path}`,
    value,
  ],
});

const buildBackfill = (current, source, fields) => {
  const set = {};
  let pending = 0;

  for (const [path, isPresent] of fields) {
    const sourceValue = readPath(source, path);
    if (!isPresent(sourceValue) || isPresent(readPath(current, path))) continue;
    set[path] = isPresent === hasItems
      ? preserveItems(path, sourceValue)
      : preserveText(path, sourceValue);
    pending += 1;
  }

  return { set, pending };
};

const run = async () => {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is missing from server/.env");
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });

  const productSources = new Map(products.map((product) => [product.slug, product]));
  const categorySources = new Map(categories.map((category) => [category.slug, category]));
  const [existingProducts, existingCategories] = await Promise.all([
    Product.find({ slug: { $in: [...productSources.keys()] } })
      .select("slug arabicName arabicShortDescription arabicDescription arabicScentFamilies arabicBestFor arabicKeyNotes arabicScentNotes")
      .lean(),
    Category.find({ slug: { $in: [...categorySources.keys()] } })
      .select("slug arabicName arabicDescription arabicSeoTitle arabicSeoDescription")
      .lean(),
  ]);

  let productFieldsPending = 0;
  let categoryFieldsPending = 0;
  const productOperations = [];
  const categoryOperations = [];

  for (const current of existingProducts) {
    const { set, pending } = buildBackfill(current, productSources.get(current.slug), productFields);
    productFieldsPending += pending;
    if (pending) productOperations.push({ updateOne: { filter: { _id: current._id }, update: [{ $set: set }] } });
  }

  for (const current of existingCategories) {
    const { set, pending } = buildBackfill(current, categorySources.get(current.slug), categoryFields);
    categoryFieldsPending += pending;
    if (pending) categoryOperations.push({ updateOne: { filter: { _id: current._id }, update: [{ $set: set }] } });
  }

  if (applyChanges) {
    if (productOperations.length) await Product.collection.bulkWrite(productOperations);
    if (categoryOperations.length) await Category.collection.bulkWrite(categoryOperations);
  }

  console.log(
    `${applyChanges ? "APPLY" : "DRY RUN"}: products ${existingProducts.length}/${products.length}, product fields ${productFieldsPending}; categories ${existingCategories.length}/${categories.length}, category fields ${categoryFieldsPending}`
  );
};

run()
  .catch((error) => {
    console.error(`Arabic catalog backfill failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  });
