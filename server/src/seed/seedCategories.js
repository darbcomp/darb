require("dotenv").config();

const mongoose = require("mongoose");
const Category = require("../models/Category");
const slugify = require("../utils/slugify");

const categories = [
  {
    name: "Men",
    slug: "men",
    description:
      "Refined scents shaped around presence, depth, and a memorable trail.",
    sortOrder: 1,
    isActive: true,
    seoTitle: "Men's Perfumes | Darb",
    seoDescription:
      "Explore Darb perfumes for men — refined scents crafted for every path.",
  },
  {
    name: "Women",
    slug: "women",
    description:
      "Elegant scents shaped around warmth, expression, and lasting memory.",
    sortOrder: 2,
    isActive: true,
    seoTitle: "Women's Perfumes | Darb",
    seoDescription:
      "Explore Darb perfumes for women — elegant scents crafted for every path.",
  },
  {
    name: "Unisex",
    slug: "unisex",
    description:
      "Balanced scents created beyond labels, made to become part of any journey.",
    sortOrder: 3,
    isActive: true,
    seoTitle: "Unisex Perfumes | Darb",
    seoDescription:
      "Discover Darb unisex fragrances created for every journey and every path.",
  },
  {
    name: "Musk",
    slug: "musk",
    description:
      "Soft, intimate musk scents with warmth, depth, and a lasting presence.",
    sortOrder: 4,
    isActive: true,
    seoTitle: "Musk Perfumes | Darb",
    seoDescription:
      "Discover Darb musk fragrances with warmth, softness, and lasting character.",
  },
];

const seedCategories = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing from server/.env");
  }

  const seededCategories = [];

  for (const categoryData of categories) {
    const slug = slugify(categoryData.slug || categoryData.name);

    const category = await Category.findOneAndUpdate(
      { slug },
      {
        $set: {
          ...categoryData,
          slug,
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    seededCategories.push(category);

    console.log(`✅ Category ready: ${category.name}`);
  }

  return seededCategories;
};

const runStandalone = async () => {
  try {
    console.log("\nDARB CATEGORY SEED");
    console.log("==============================\n");

    await mongoose.connect(process.env.MONGO_URI);

    console.log(`✅ MongoDB connected`);
    console.log(`Database: ${mongoose.connection.name}\n`);

    await seedCategories();

    console.log("\n✅ Categories seeded successfully.\n");
  } catch (error) {
    console.error("\n❌ Category seed failed");
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
};

if (require.main === module) {
  runStandalone();
}

module.exports = {
  categories,
  seedCategories,
};