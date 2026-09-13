require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { createHash } = require("crypto");
const mongoose = require("mongoose");
const Product = require("../models/Product");
const { seedCategories } = require("./seedCategories");
const { products } = require("./catalog.data");
const { processProductImage } = require("../utils/imageProcessor");
const { putPublicObject } = require("../services/mediaStorage.service");

const productRoot = path.resolve(__dirname, "../../../seed-assets/products");
const groupFor = (product) => product.productType === "musk" ? "musk" : product.primaryCategory === "women" ? "female" : "male";
const compareProductImageNames = (slug, a, b) => {
  const base = String(slug).toLowerCase();
  const position = (filename) => {
    const stem = path.parse(filename).name.toLowerCase();
    if (stem === base) return { group: 0, number: 0 };
    const suffix = stem.startsWith(`${base}-`) ? stem.slice(base.length + 1) : "";
    if (/^\d+$/.test(suffix)) return { group: 1, number: Number(suffix) };
    return { group: 2, number: 0 };
  };
  const left = position(a);
  const right = position(b);
  return left.group - right.group || left.number - right.number || a.localeCompare(b, "en", { sensitivity: "base" }) || a.localeCompare(b, "en");
};
const imageFilesFor = (product) => {
  const dir = path.join(productRoot, groupFor(product), product.slug);
  if (!fs.existsSync(dir)) throw new Error(`Missing product image folder: ${dir}`);
  const files = fs.readdirSync(dir)
    .filter((name) => /\.(jpe?g|png|webp)$/i.test(name))
    .sort((a, b) => compareProductImageNames(product.slug, a, b));
  if (!files.length) throw new Error(`No product images found for ${product.name}: ${dir}`);
  if (files.length > 10) throw new Error(`${product.name} has ${files.length} images; max is 10.`);
  return { dir, files };
};

const uploadImages = async (product) => {
  const { dir, files } = imageFilesFor(product);
  const images = [];
  for (let index = 0; index < files.length; index += 1) {
    const filename = files[index];
    const processed = await processProductImage(fs.readFileSync(path.join(dir, filename)));
    const stem = path.parse(filename).name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
    const digest = createHash("sha256").update(processed.buffer).digest("hex").slice(0, 12);
    const key = `products/${groupFor(product)}/${product.slug}/${stem}-${digest}.webp`;
    const stored = await putPublicObject({ buffer: processed.buffer, key, contentType: processed.mimeType });
    images.push({
      url: stored.url,
      publicId: key,
      storageKey: key,
      provider: "r2",
      alt: `${product.name} — Darb${index ? ` ${index + 1}` : ""}`,
      isMain: index === 0,
    });
  }
  return images;
};

const skuFor = (product) => `DARB-${product.productType === "musk" ? "MUSK" : "PERF"}-${product.slug.toUpperCase()}-${product.sizeMl}`;

const run = async () => {
  try {
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI is missing from server/.env");
    await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB connected: ${mongoose.connection.name}`);
    const categoryDocs = await seedCategories();
    const categoryMap = new Map(categoryDocs.map((item) => [item.slug, item]));

    for (const item of products) {
      const primary = categoryMap.get(item.primaryCategory);
      const extras = item.alsoIn.map((slug) => categoryMap.get(slug)).filter(Boolean);
      if (!primary) throw new Error(`Category not found for ${item.name}: ${item.primaryCategory}`);
      const categoryIds = [primary, ...extras].map((category) => category._id);
      const images = await uploadImages(item);
      const sku = skuFor(item);
      const tags = [...new Set([
        item.name, item.arabicName, item.inspiredBy,
        ...item.scentFamilies, ...item.bestFor, ...item.keyNotes,
        ...item.scentNotes.top, ...item.scentNotes.middle, ...item.scentNotes.base,
      ].filter(Boolean))];
      const payload = {
        name: item.name,
        arabicName: item.arabicName,
        slug: item.slug,
        sku,
        productType: item.productType,
        category: primary._id,
        categorySnapshot: { name: primary.name, slug: primary.slug },
        categories: categoryIds,
        inspiredBy: item.inspiredBy,
        shortDescription: "",
        description: item.description,
        price: item.price,
        compareAtPrice: 0,
        sizeLabel: item.sizeLabel,
        sizeMl: item.sizeMl,
        concentration: item.concentration,
        scentFamily: item.scentFamilies.join(" • "),
        scentFamilies: item.scentFamilies,
        bestFor: item.bestFor,
        keyNotes: item.keyNotes,
        scentNotes: item.scentNotes,
        images,
        variants: [{ label: item.sizeLabel, sizeMl: item.sizeMl, sku, price: item.price, compareAtPrice: 0, stock: item.stock, isActive: true }],
        stock: item.stock,
        lowStockThreshold: item.lowStockThreshold,
        tags,
        isActive: item.isActive,
        isPlaceholder: item.isPlaceholder,
        isFeatured: item.isFeatured,
        isBestSeller: item.isBestSeller,
        isNewArrival: item.isNewArrival,
        metaTitle: `${item.name}${item.arabicName ? ` — ${item.arabicName}` : ""} | Darb`,
        metaDescription: item.description ? item.description.slice(0, 155) : "",
      };
      await Product.findOneAndUpdate(
        { slug: item.slug },
        { $set: payload },
        { returnDocument: "after", upsert: true, runValidators: true, setDefaultsOnInsert: true }
      );
      console.log(`✅ ${item.name}: ${images.length}/10 images, ${item.sizeLabel}, EGP ${item.price}${item.alsoIn.length ? ` + ${item.alsoIn.join(", ")}` : ""}`);
    }

    // Keep the seed idempotent and non-destructive: future products created in
    // Admin must never be deactivated just because they are not in this launch file.
    // Only known pre-canonical development aliases are deactivated if they still exist.
    const legacy = await Product.updateMany(
      { slug: { $in: ["mog", "roh"] } },
      { $set: { isActive: false, isFeatured: false, isBestSeller: false, isNewArrival: false } }
    );
    console.log(`\n✅ ${products.length} Darb catalog products ready.`);
    console.log(`ℹ️ ${legacy.modifiedCount || 0} obsolete development alias product(s) deactivated.`);
    console.log("ℹ️ Musks are active launch products at 6 ML / EGP 200.");
  } catch (error) {
    console.error("\n❌ Darb seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  }
};
run();
