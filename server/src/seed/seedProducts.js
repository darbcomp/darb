require("dotenv").config();

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const { v2: cloudinary } = require("cloudinary");

const Product = require("../models/Product");
const Category = require("../models/Category");
const slugify = require("../utils/slugify");
const { seedCategories } = require("./seedCategories");

const configureCloudinary = () => {
  const {
    CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET,
  } = process.env;

  if (
    !CLOUDINARY_CLOUD_NAME ||
    !CLOUDINARY_API_KEY ||
    !CLOUDINARY_API_SECRET
  ) {
    throw new Error(
      "Cloudinary credentials are missing from server/.env"
    );
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
};

const productSeedData = [
  // MEN
  {
    name: "Haibah",
    categorySlug: "men",
    imageFolder: "male",
    imageFile: "haibah.webp",
  },
  {
    name: "Mog",
    categorySlug: "men",
    imageFolder: "male",
    imageFile: "mog.webp",
  },
  {
    name: "Namoos",
    categorySlug: "men",
    imageFolder: "male",
    imageFile: "namoos.webp",
  },
  {
    name: "Naseem",
    categorySlug: "men",
    imageFolder: "male",
    imageFile: "naseem.webp",
  },
  {
    name: "Sahm",
    categorySlug: "men",
    imageFolder: "male",
    imageFile: "sahm.webp",
  },

  // WOMEN
  {
    name: "Gharam",
    categorySlug: "women",
    imageFolder: "female",
    imageFile: "gharam.webp",
  },
  {
    name: "Ghazal",
    categorySlug: "women",
    imageFolder: "female",
    imageFile: "ghazal.webp",
  },
  {
    name: "Hawa",
    categorySlug: "women",
    imageFolder: "female",
    imageFile: "hawa.webp",
  },
  {
    name: "Nagham",
    categorySlug: "women",
    imageFolder: "female",
    imageFile: "nagham.webp",
  },
  {
    name: "Rahaf",
    categorySlug: "women",
    imageFolder: "female",
    imageFile: "rahaf.webp",
  },
  {
    name: "Roh",
    categorySlug: "women",
    imageFolder: "female",
    imageFile: "roh.webp",
  },
  {
    name: "Sahar",
    categorySlug: "women",
    imageFolder: "female",
    imageFile: "sahar.webp",
  },
  {
    name: "Sehr",
    categorySlug: "women",
    imageFolder: "female",
    imageFile: "sehr.webp",
  },
];

const getProductImagePath = (product) => {
  return path.resolve(
    __dirname,
    "../../../client/public/images/products",
    product.imageFolder,
    product.imageFile
  );
};

const uploadProductImage = async ({
  imagePath,
  categorySlug,
  productSlug,
  productName,
}) => {
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Image file not found: ${imagePath}`);
  }

  const publicId = `darb/products/${categorySlug}/${productSlug}-01`;

  const uploadResult = await cloudinary.uploader.upload(imagePath, {
    public_id: publicId,
    overwrite: true,
    resource_type: "image",
  });

  return {
    url: uploadResult.secure_url,
    publicId: uploadResult.public_id,
    alt: `${productName} by Darb`,
    isMain: true,
  };
};

const buildSku = (categorySlug, name) => {
  const categoryCode =
    categorySlug === "men"
      ? "MEN"
      : categorySlug === "women"
        ? "WOMEN"
        : categorySlug.toUpperCase();

  const productCode = name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  return `DARB-${categoryCode}-${productCode}`;
};

const seedRealProducts = async () => {
  console.log("\nPreparing categories...\n");

  await seedCategories();

  console.log("\nUploading and seeding Darb products...\n");

  for (const productData of productSeedData) {
    const slug = slugify(productData.name);

    const category = await Category.findOne({
      slug: productData.categorySlug,
    });

    if (!category) {
      throw new Error(
        `Category "${productData.categorySlug}" could not be found.`
      );
    }

    const imagePath = getProductImagePath(productData);

    console.log(`Uploading: ${productData.name}`);

    const mainImage = await uploadProductImage({
      imagePath,
      categorySlug: productData.categorySlug,
      productSlug: slug,
      productName: productData.name,
    });

    const productPayload = {
      name: productData.name,
      slug,
      sku: buildSku(productData.categorySlug, productData.name),

      category: category._id,

      categorySnapshot: {
        name: category.name,
        slug: category.slug,
      },

      shortDescription: "",
      description: "",

      price: 0,
      compareAtPrice: 0,

      sizeLabel: "50 ML",
      sizeMl: 50,

      concentration: "",
      scentFamily: "",

      scentNotes: {
        top: [],
        middle: [],
        base: [],
      },

      stock: 0,
      lowStockThreshold: 3,

      tags: [
        "Darb",
        "Perfume",
        "50ml",
        category.name,
      ],

      images: [mainImage],

      isActive: false,
      isPlaceholder: false,
      isFeatured: false,
      isBestSeller: false,
      isNewArrival: true,

      metaTitle: `${productData.name} | Darb Perfumes`,
      metaDescription: `${productData.name} by Darb. A 50ml fragrance created for your path.`,
    };

    const product = await Product.findOneAndUpdate(
      { slug },
      {
        $set: productPayload,
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    console.log(
      `✅ ${product.name} — ${category.name} — 50 ML`
    );
  }

  console.log(
    `\n✅ ${productSeedData.length} real Darb products are ready.\n`
  );
};

const runSeed = async () => {
  try {
    console.log("\n================================");
    console.log("DARB REAL PRODUCT SEED");
    console.log("================================\n");

    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing from server/.env");
    }

    configureCloudinary();

    await mongoose.connect(process.env.MONGO_URI);

    console.log("✅ MongoDB connected");
    console.log(`Database: ${mongoose.connection.name}`);
    console.log("✅ Cloudinary configured\n");

    await seedRealProducts();

    console.log("================================");
    console.log("SEED COMPLETE");
    console.log("================================");
    console.log("Categories: 4");
    console.log(`Products:   ${productSeedData.length}`);
    console.log("Size:       50 ML");
    console.log("Status:     Inactive until product details are completed");
    console.log("Images:     1 current image per product");
    console.log("Capacity:   3 images per product");
    console.log("================================\n");
  } catch (error) {
    console.error("\n❌ Darb product seed failed\n");
    console.error(error);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
};

if (require.main === module) {
  runSeed();
}

module.exports = {
  productSeedData,
  seedRealProducts,
};