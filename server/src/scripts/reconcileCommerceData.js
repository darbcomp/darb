process.env.DOTENV_CONFIG_QUIET = "true";
require("dotenv").config({ quiet: true });

const mongoose = require("mongoose");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Entitlement = require("../models/Entitlement");

const applyChanges = process.argv.includes("--apply");

const activeVariantStock = (product) =>
  (product.variants || [])
    .filter((variant) => variant.isActive === true)
    .reduce((sum, variant) => sum + Math.max(Number(variant.stock) || 0, 0), 0);

const hasText = (value) =>
  typeof value === "string" && value.trim().length > 0;

const run = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing from server/.env");
  }

  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
  });

  const [products, legacySenderOrders, duplicateRewardCodes] = await Promise.all([
    Product.find({ "variants.0": { $exists: true } })
      .select("_id slug stock variants.stock variants.isActive")
      .lean(),
    Order.find({
      senderName: { $type: "string", $ne: "" },
      $or: [
        { "paymentProof.senderName": { $exists: false } },
        { "paymentProof.senderName": "" },
      ],
    })
      .select("_id orderNumber senderName")
      .lean(),
    Entitlement.aggregate([
      { $match: { code: { $type: "string", $ne: "" } } },
      { $group: { _id: "$code", count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $count: "duplicateCodes" },
    ]),
  ]);

  const stockOperations = [];

  for (const product of products) {
    const nextStock = activeVariantStock(product);
    if (Number(product.stock) === nextStock) continue;

    stockOperations.push({
      updateOne: {
        filter: { _id: product._id },
        update: { $set: { stock: nextStock } },
      },
    });
  }

  const senderOperations = legacySenderOrders.map((order) => ({
    updateOne: {
      filter: {
        _id: order._id,
        $or: [
          { "paymentProof.senderName": { $exists: false } },
          { "paymentProof.senderName": "" },
        ],
      },
      update: {
        $set: {
          "paymentProof.senderName": String(order.senderName || "").trim(),
        },
      },
    },
  }));

  if (applyChanges) {
    if (stockOperations.length) {
      await Product.collection.bulkWrite(stockOperations);
    }

    if (senderOperations.length) {
      await Order.collection.bulkWrite(senderOperations);
    }
  }

  const mode = applyChanges ? "APPLY" : "DRY RUN";
  const duplicateCount = Number(duplicateRewardCodes[0]?.duplicateCodes) || 0;

  console.log(
    `${mode}: variant-stock products ${stockOperations.length}; payment sender names ${senderOperations.length}; duplicate reward codes ${duplicateCount}`
  );
};

run()
  .catch((error) => {
    console.error(
      `Commerce reconciliation failed: ${error.message}`
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
