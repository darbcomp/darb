require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { createHash } = require("crypto");
const mongoose = require("mongoose");
const Category = require("../models/Category");
const slugify = require("../utils/slugify");
const { processProductImage } = require("../utils/imageProcessor");
const { putPublicObject } = require("../services/mediaStorage.service");

const categories = [
  { name: "Men", slug: "men", imageFile: "for-him.webp", description: "Refined scents shaped around presence, depth, and a memorable trail.", sortOrder: 1, seoTitle: "Men's Perfumes | Darb", seoDescription: "Explore Darb perfumes for men — refined scents crafted for every path." },
  { name: "Women", slug: "women", imageFile: "for-her.webp", description: "Elegant scents shaped around warmth, expression, and lasting memory.", sortOrder: 2, seoTitle: "Women's Perfumes | Darb", seoDescription: "Explore Darb perfumes for women — elegant scents crafted for every path." },
  { name: "Unisex", slug: "unisex", imageFile: "unisex.webp", description: "Balanced scents created beyond labels, made to become part of any journey.", sortOrder: 3, seoTitle: "Unisex Perfumes | Darb", seoDescription: "Discover Darb unisex fragrances created for every journey and every path." },
  { name: "Musk", slug: "musk", imageFile: "musk.webp", description: "Soft, intimate musk scents with warmth, depth, and a lasting presence.", sortOrder: 4, seoTitle: "Musk Perfumes | Darb", seoDescription: "Discover Darb musk fragrances with warmth, softness, and lasting character." },
];

const categoryAssetDir = path.resolve(__dirname, "../../../client/public/images/categories");

const uploadCategoryArtwork = async (item) => {
  const filePath = path.join(categoryAssetDir, item.imageFile);
  if (!fs.existsSync(filePath)) throw new Error(`Missing category artwork: ${filePath}`);
  const processed = await processProductImage(fs.readFileSync(filePath));
  const digest = createHash("sha256").update(processed.buffer).digest("hex").slice(0, 12);
  const key = `categories/${item.slug}-${digest}.webp`;
  const stored = await putPublicObject({ buffer: processed.buffer, key, contentType: processed.mimeType });
  return { url: stored.url, publicId: key, alt: `${item.name} — Darb` };
};

const seedCategories = async () => {
  const ready = [];
  for (const raw of categories) {
    const slug = slugify(raw.slug || raw.name);
    const image = await uploadCategoryArtwork({ ...raw, slug });
    const category = await Category.findOneAndUpdate(
      { slug },
      { $set: { name: raw.name, slug, description: raw.description, sortOrder: raw.sortOrder, isActive: true, seoTitle: raw.seoTitle, seoDescription: raw.seoDescription, image } },
      { returnDocument: "after", upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    ready.push(category);
    console.log(`✅ Category ready: ${category.name}`);
  }
  return ready;
};

const runStandalone = async () => {
  try {
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI is missing from server/.env");
    await mongoose.connect(process.env.MONGO_URI);
    await seedCategories();
  } catch (error) {
    console.error("❌ Category seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  }
};
if (require.main === module) runStandalone();
module.exports = { categories, seedCategories };
