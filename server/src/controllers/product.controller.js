const { getSafeInternalMessage } = require("../utils/httpError");
const mongoose = require("mongoose");

const Product = require("../models/Product");
const Category = require("../models/Category");
const slugify = require("../utils/slugify");
const { uploadOptimizedPublicImage, deletePublicMedia } = require("../services/mediaStorage.service");
const { preserveOptionalBoolean, preserveOptionalString } = require("../utils/preserveOptionalField");
const { sanitizePublicProductMedia, sanitizePublicCategoryMedia } = require("../utils/mediaResponse");
const { scheduleFrontendRebuild } = require("../services/frontendRebuild.service");

const MAX_PRODUCT_IMAGES = 10;

const isDatabaseConnected = () => mongoose.connection.readyState === 1;


const parseMaybeJSON = (value, fallback) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const parseStringArray = (value) => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  const parsed = parseMaybeJSON(value, null);

  if (Array.isArray(parsed)) {
    return parsed.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const parseBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === "") return defaultValue;
  if (typeof value === "boolean") return value;
  return String(value).toLowerCase() === "true";
};

const parseNumber = (value, defaultValue = 0) => {
  if (value === undefined || value === null || value === "") return defaultValue;
  const number = Number(value);
  return Number.isFinite(number) ? number : defaultValue;
};

const escapeRegex = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getPagination = (query = {}) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 12, 1), 60);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

const getSearchSuggestions = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({ success: false, message: "Database is unavailable." });
    }
    const term = String(req.query.q || "").trim();
    if (term.length > 100) return res.status(400).json({ success: false, message: "Search term is too long." });
    if (term.length < 2) return res.status(200).json({ success: true, data: { products: [], categories: [] } });
    const expression = new RegExp(escapeRegex(term), "i");
    const categories = await Category.find({ isActive: true, $or: [{ name: expression }, { description: expression }] })
      .select("name slug description image").sort({ sortOrder: 1, name: 1 }).limit(5).lean();
    const categoryIds = categories.map((category) => category._id);
    const products = await Product.find({
      isActive: true,
      isPlaceholder: { $ne: true },
      $or: [
        { name: expression }, { arabicName: expression }, { inspiredBy: expression }, { shortDescription: expression }, { description: expression },
        { scentFamily: expression }, { scentFamilies: expression }, { bestFor: expression }, { keyNotes: expression }, { tags: expression }, { "scentNotes.top": expression },
        { "scentNotes.middle": expression }, { "scentNotes.base": expression },
        { category: { $in: categoryIds } }, { categories: { $in: categoryIds } },
      ],
    }).select("name arabicName slug shortDescription arabicShortDescription price compareAtPrice stock images category categories variants size sizeMl")
      .populate("category", "name arabicName slug").populate("categories", "name arabicName slug").limit(8).lean();
    return res.status(200).json({
      success: true,
      data: {
        products: products.map(sanitizePublicProductMedia),
        categories: categories.map(sanitizePublicCategoryMedia),
      },
    });
  } catch {
    return res.status(500).json({ success: false, message: "Search is temporarily unavailable." });
  }
};

const resolveCategory = async (categoryValue) => {
  if (!categoryValue) {
    throw new Error("Product category is required.");
  }

  let category = null;

  if (mongoose.Types.ObjectId.isValid(categoryValue)) {
    category = await Category.findById(categoryValue);
  }

  if (!category) {
    const cleanValue = String(categoryValue).trim();

    category = await Category.findOne({
      $or: [
        { slug: cleanValue.toLowerCase() },
        { name: new RegExp(`^${escapeRegex(cleanValue)}$`, "i") },
      ],
    });
  }

  if (!category) {
    throw new Error("Category not found.");
  }

  return category;
};


const destroyStoredImage = async (key) => {
  if (!key) return;
  try {
    await deletePublicMedia(key);
  } catch (error) {
    console.error("R2 public-media cleanup failed:", error.message);
  }
};

const destroyStoredImages = async (images = []) => {
  await Promise.all(
    images
      .map((image) => image?.storageKey || image?.publicId)
      .filter(Boolean)
      .map((key) => destroyStoredImage(key))
  );
};

const uploadFilesToStorage = async ({ files = [], categorySlug, productSlug }) => {
  if (!files.length) return [];
  const uploadedImages = [];
  try {
    for (const file of files) {
      const result = await uploadOptimizedPublicImage(file, {
        folder: `products/${categorySlug}/${productSlug}`,
        baseName: productSlug,
        alt: `${productSlug} — Darb`,
      });
      uploadedImages.push({
        url: result.url,
        publicId: result.publicId,
        storageKey: result.storageKey || result.publicId,
        provider: "r2",
        alt: file.originalname || "Darb product image",
        isMain: false,
      });
    }
    return uploadedImages;
  } catch (error) {
    await destroyStoredImages(uploadedImages);
    throw error;
  }
};

const selectExistingImages = ({
  existingProduct,
  bodyImages,
  keepExistingImages,
}) => {
  if (!existingProduct) return [];

  const currentImages = Array.isArray(existingProduct.images)
    ? existingProduct.images
    : [];

  if (keepExistingImages) {
    return currentImages.map((image) => ({
      url: image.url,
      publicId: image.publicId || image.storageKey || "",
      storageKey: image.storageKey || image.publicId || "",
      provider: image.provider || "r2",
      alt: image.alt || "",
      isMain: Boolean(image.isMain),
    }));
  }

  if (!Array.isArray(bodyImages)) return [];

  const selected = [];

  for (const requestedImage of bodyImages) {
    const match = currentImages.find(
      (image) =>
        (requestedImage?.publicId &&
          image.publicId === requestedImage.publicId) ||
        (requestedImage?.url && image.url === requestedImage.url)
    );

    if (!match) continue;

    if (selected.some((image) => image.url === match.url)) continue;

    selected.push({
      url: match.url,
      publicId: match.publicId || match.storageKey || "",
      storageKey: match.storageKey || match.publicId || "",
      provider: match.provider || "r2",
      alt: requestedImage.alt || match.alt || "",
      isMain: Boolean(requestedImage.isMain),
    });
  }

  return selected;
};

const normalizeMainImage = ({
  existingImages,
  uploadedImages,
  mainImageFileIndex,
}) => {
  const images = [
    ...existingImages.map((image) => ({ ...image })),
    ...uploadedImages.map((image) => ({ ...image })),
  ];

  if (!images.length) return [];

  const newMainIndex = Number(mainImageFileIndex);
  const hasRequestedNewMain =
    Number.isInteger(newMainIndex) &&
    newMainIndex >= 0 &&
    newMainIndex < uploadedImages.length;

  if (hasRequestedNewMain) {
    images.forEach((image) => {
      image.isMain = false;
    });

    images[existingImages.length + newMainIndex].isMain = true;
    return images;
  }

  const currentMainIndex = images.findIndex((image) => image.isMain);

  images.forEach((image, index) => {
    image.isMain = index === (currentMainIndex >= 0 ? currentMainIndex : 0);
  });

  return images;
};

const getRemovedImages = (existingProduct, nextExistingImages) => {
  if (!existingProduct) return [];

  const keptKeys = new Set(
    nextExistingImages.map((image) => image.publicId || image.url)
  );

  return (existingProduct.images || []).filter(
    (image) => !keptKeys.has(image.publicId || image.url)
  );
};

const buildProductPayload = async (
  body,
  files = [],
  existingProduct = null
) => {
  const name = body.name?.trim() || existingProduct?.name;

  if (!name) {
    throw new Error("Product name is required.");
  }

  const categoryValue = body.categories || body.category || body.categorySlug || body.categoryName;
  const categories = await resolveCategories(
    categoryValue,
    existingProduct?.categories?.length ? existingProduct.categories : existingProduct?.category
  );
  const requestedPrimary = String(body.category || body.primaryCategory || "");
  const category = categories.find((entry) =>
    [String(entry._id), entry.slug, entry.name].includes(requestedPrimary)
  ) || categories[0];

  const requestedSlug = body.slug?.trim();
  const productSlug = requestedSlug
    ? slugify(requestedSlug)
    : existingProduct?.slug || slugify(name);

  const bodyImages = parseMaybeJSON(body.images, []);
  const keepExistingImages = parseBoolean(
    body.keepExistingImages,
    existingProduct ? true : false
  );

  const selectedExistingImages = selectExistingImages({
    existingProduct,
    bodyImages,
    keepExistingImages,
  });

  if (selectedExistingImages.length + files.length > MAX_PRODUCT_IMAGES) {
    throw new Error(
      `A Darb product can have a maximum of ${MAX_PRODUCT_IMAGES} images total.`
    );
  }

  const uploadedImages = await uploadFilesToStorage({
    files,
    categorySlug: category.slug,
    productSlug,
  });

  const images = normalizeMainImage({
    existingImages: selectedExistingImages,
    uploadedImages,
    mainImageFileIndex: body.mainImageFileIndex,
  });

  const removedImages = getRemovedImages(
    existingProduct,
    selectedExistingImages
  );

  const scentNotes = parseMaybeJSON(body.scentNotes, {
    top: parseStringArray(body.topNotes),
    middle: parseStringArray(body.middleNotes),
    base: parseStringArray(body.baseNotes),
  });

  const variants = parseMaybeJSON(body.variants, existingProduct?.variants || []);
  const scentFamilies = parseStringArray(body.scentFamilies ?? body.scentFamily ?? existingProduct?.scentFamilies ?? existingProduct?.scentFamily);
  const bestFor = parseStringArray(body.bestFor ?? existingProduct?.bestFor);
  const keyNotes = parseStringArray(body.keyNotes ?? existingProduct?.keyNotes);
  const arabicScentFamilies = parseStringArray(body.arabicScentFamilies ?? existingProduct?.arabicScentFamilies);
  const arabicBestFor = parseStringArray(body.arabicBestFor ?? existingProduct?.arabicBestFor);
  const arabicKeyNotes = parseStringArray(body.arabicKeyNotes ?? existingProduct?.arabicKeyNotes);
  const arabicScentNotes = parseMaybeJSON(body.arabicScentNotes, {
    top: parseStringArray(body.arabicTopNotes),
    middle: parseStringArray(body.arabicMiddleNotes),
    base: parseStringArray(body.arabicBaseNotes),
  });
  const tags = parseStringArray(body.tags);

  const isPlaceholder = preserveOptionalBoolean(
    body,
    "isPlaceholder",
    existingProduct?.isPlaceholder,
    parseBoolean
  );

  const isActive = parseBoolean(
    body.isActive,
    existingProduct?.isActive || false
  );

  const price = parseNumber(body.price, existingProduct?.price || 0);
  const productType = ["perfume", "musk"].includes(body.productType)
    ? body.productType
    : (existingProduct?.productType || "perfume");

  const cleanVariants = Array.isArray(variants) ? variants.map((variant) => ({
    ...(variant?._id ? { _id: variant._id } : {}),
    label: String(variant?.label || "").trim(),
    sizeMl: parseNumber(variant?.sizeMl, 0),
    sku: String(variant?.sku || "").trim(),
    price: parseNumber(variant?.price, 0),
    compareAtPrice: parseNumber(variant?.compareAtPrice, 0),
    stock: Math.max(parseNumber(variant?.stock, 0), 0),
    isActive: parseBoolean(variant?.isActive, true),
  })) : [];
  const primaryVariant = cleanVariants
    .filter((variant) => variant.isActive && variant.price > 0)
    .sort((a, b) => a.price - b.price)[0];

  if (isActive && !isPlaceholder && !cleanVariants.some((variant) => variant.isActive && variant.price > 0) && price <= 0) {
    await destroyStoredImages(uploadedImages);
    throw new Error("Active real products must have a valid price.");
  }

  const payload = {
    name,
    arabicName: body.arabicName !== undefined ? body.arabicName?.trim() || "" : existingProduct?.arabicName || "",
    slug: productSlug,
    sku: preserveOptionalString(body, "sku", existingProduct?.sku),
    productType,
    category: category._id,
    categories: categories.map((entry) => entry._id),
    categorySnapshot: {
      name: category.name,
      slug: category.slug,
    },
    inspiredBy: body.inspiredBy !== undefined ? body.inspiredBy?.trim() || "" : existingProduct?.inspiredBy || "",
    arabicInspiredBy: body.arabicInspiredBy !== undefined ? body.arabicInspiredBy?.trim() || "" : existingProduct?.arabicInspiredBy || "",
    shortDescription: preserveOptionalString(body, "shortDescription", existingProduct?.shortDescription),
    arabicShortDescription: body.arabicShortDescription?.trim() || existingProduct?.arabicShortDescription || "",
    description: preserveOptionalString(body, "description", existingProduct?.description),
    arabicDescription: body.arabicDescription?.trim() || existingProduct?.arabicDescription || "",
    price: primaryVariant?.price || price,
    compareAtPrice: primaryVariant?.compareAtPrice || parseNumber(body.compareAtPrice, 0),
    costPrice: parseNumber(body.costPrice, existingProduct?.costPrice || 0),
    sizeLabel: body.sizeLabel !== undefined
      ? body.sizeLabel?.trim() || ""
      : existingProduct?.sizeLabel || "",
    sizeMl: parseNumber(body.sizeMl, existingProduct?.sizeMl || 0),
    concentration:
      body.concentration?.trim() ||
      existingProduct?.concentration ||
      "",
    scentFamily: scentFamilies.join(" • ") || body.scentFamily?.trim() || "",
    scentFamilies,
    arabicScentFamilies,
    bestFor,
    arabicBestFor,
    keyNotes,
    arabicKeyNotes,
    scentNotes: {
      top: Array.isArray(scentNotes?.top) ? scentNotes.top : [],
      middle: Array.isArray(scentNotes?.middle) ? scentNotes.middle : [],
      base: Array.isArray(scentNotes?.base) ? scentNotes.base : [],
    },
    arabicScentNotes: {
      top: Array.isArray(arabicScentNotes?.top) ? arabicScentNotes.top : [],
      middle: Array.isArray(arabicScentNotes?.middle) ? arabicScentNotes.middle : [],
      base: Array.isArray(arabicScentNotes?.base) ? arabicScentNotes.base : [],
    },
    images,
    variants: cleanVariants,
    stock: cleanVariants.length
      ? cleanVariants.filter((variant) => variant.isActive).reduce((sum, variant) => sum + variant.stock, 0)
      : parseNumber(body.stock, existingProduct?.stock || 0),
    lowStockThreshold: parseNumber(body.lowStockThreshold, existingProduct?.lowStockThreshold ?? 3),
    tags: body.tags === undefined ? existingProduct?.tags || [] : tags,
    isActive,
    isPlaceholder,
    isFeatured: preserveOptionalBoolean(body, "isFeatured", existingProduct?.isFeatured, parseBoolean),
    isBestSeller: preserveOptionalBoolean(body, "isBestSeller", existingProduct?.isBestSeller, parseBoolean),
    isNewArrival: preserveOptionalBoolean(body, "isNewArrival", existingProduct?.isNewArrival, parseBoolean),
    metaTitle: preserveOptionalString(body, "metaTitle", existingProduct?.metaTitle),
    metaDescription: preserveOptionalString(body, "metaDescription", existingProduct?.metaDescription),
  };

  return {
    payload,
    uploadedImages,
    removedImages,
  };
};

const buildPublicProductFilter = async (query = {}) => {
  const filter = {
    isActive: true,
  };

  if (query.category) {
    const categorySlugs = String(query.category)
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);

    if (categorySlugs.length) {
      const categories = await Category.find({
        slug: { $in: categorySlugs },
        isActive: true,
      }).select("_id");

      const categoryIds = categories.map((category) => category._id);

      filter.$and = [
        ...(filter.$and || []),
        categoryIds.length
          ? { $or: [{ categories: { $in: categoryIds } }, { category: { $in: categoryIds } }] }
          : { _id: null },
      ];
    }
  }

  if (query.search?.trim()) {
    const searchRegex = new RegExp(
      escapeRegex(query.search.trim()),
      "i"
    );
    const matchingCategories = await Category.find({
      $or: [{ name: searchRegex }, { slug: searchRegex }],
    }).select("_id").lean();
    const matchingCategoryIds = matchingCategories.map((category) => category._id);

    filter.$or = [
      { name: searchRegex },
      { arabicName: searchRegex },
      { inspiredBy: searchRegex },
      { shortDescription: searchRegex },
      { description: searchRegex },
      { scentFamily: searchRegex },
      { scentFamilies: searchRegex },
      { bestFor: searchRegex },
      { keyNotes: searchRegex },
      { "scentNotes.top": searchRegex },
      { "scentNotes.middle": searchRegex },
      { "scentNotes.base": searchRegex },
      { tags: searchRegex },
      ...(matchingCategoryIds.length
        ? [{ category: { $in: matchingCategoryIds } }, { categories: { $in: matchingCategoryIds } }]
        : []),
    ];
  }

  if (query.featured === "true") filter.isFeatured = true;
  if (query.bestSeller === "true") filter.isBestSeller = true;
  if (query.newArrival === "true") filter.isNewArrival = true;
  if (query.placeholder === "true") filter.isPlaceholder = true;
  if (query.placeholder === "false") filter.isPlaceholder = false;

  if (query.availability) {
    const availability = String(query.availability)
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);

    const wantsInStock = availability.includes("in");
    const wantsOutOfStock = availability.includes("out");

    if (wantsInStock && !wantsOutOfStock) {
      filter.$and = [...(filter.$and || []), {
        $or: [
          { stock: { $gt: 0 } },
          { variants: { $elemMatch: { isActive: true, stock: { $gt: 0 } } } },
        ],
      }];
    }

    if (wantsOutOfStock && !wantsInStock) {
      filter.$and = [...(filter.$and || []), {
        $and: [
          { stock: { $lte: 0 } },
          { variants: { $not: { $elemMatch: { isActive: true, stock: { $gt: 0 } } } } },
        ],
      }];
    }
  }

  const priceFilter = {};

  if (query.minPrice !== undefined && query.minPrice !== "") {
    const minPrice = Number(query.minPrice);

    if (Number.isFinite(minPrice)) {
      priceFilter.$gte = Math.max(minPrice, 0);
    }
  }

  if (query.maxPrice !== undefined && query.maxPrice !== "") {
    const maxPrice = Number(query.maxPrice);

    if (Number.isFinite(maxPrice)) {
      priceFilter.$lte = Math.max(maxPrice, 0);
    }
  }

  if (Object.keys(priceFilter).length) {
    filter.price = priceFilter;
  }

  return filter;
};

const buildPublicProductSort = (sortValue) => {
  switch (sortValue) {
    case "best_selling":
      return {
        isBestSeller: -1,
        isFeatured: -1,
        createdAt: -1,
      };

    case "newest":
      return { createdAt: -1 };

    case "oldest":
      return { createdAt: 1 };

    case "price_low":
      return {
        price: 1,
        name: 1,
      };

    case "price_high":
      return {
        price: -1,
        name: 1,
      };

    case "name_az":
      return { name: 1 };

    case "name_za":
      return { name: -1 };

    case "featured":
    default:
      return {
        isFeatured: -1,
        isBestSeller: -1,
        isNewArrival: -1,
        createdAt: -1,
      };
  }
};

const buildAdminProductFilter = async (query = {}) => {
  const filter = {};

  if (query.status === "active") filter.isActive = true;
  if (query.status === "inactive") filter.isActive = false;
  if (query.placeholder === "true") filter.isPlaceholder = true;
  if (query.placeholder === "false") filter.isPlaceholder = false;
  if (query.featured === "true") filter.isFeatured = true;
  if (query.bestSeller === "true") filter.isBestSeller = true;
  if (query.newArrival === "true") filter.isNewArrival = true;

  if (query.category) {
    const category = await Category.findOne({
      slug: query.category,
    }).select("_id");

    filter.$and = [
      ...(filter.$and || []),
      category ? { $or: [{ categories: category._id }, { category: category._id }] } : { _id: null },
    ];
  }

  if (query.search?.trim()) {
    const searchRegex = new RegExp(
      escapeRegex(query.search.trim()),
      "i"
    );

    filter.$or = [
      { name: searchRegex },
      { arabicName: searchRegex },
      { sku: searchRegex },
      { inspiredBy: searchRegex },
      { shortDescription: searchRegex },
      { description: searchRegex },
      { scentFamily: searchRegex },
      { scentFamilies: searchRegex },
      { bestFor: searchRegex },
      { keyNotes: searchRegex },
      { "scentNotes.top": searchRegex },
      { "scentNotes.middle": searchRegex },
      { "scentNotes.base": searchRegex },
      { tags: searchRegex },
    ];
  }

  return filter;
};

const getProducts = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database is unavailable.",
      });
    }

    const { page, limit, skip } = getPagination(req.query);
    const filter = await buildPublicProductFilter(req.query);
    const sort = buildPublicProductSort(req.query.sort);

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate("category", "name arabicName slug")
        .populate("categories", "name arabicName slug")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      count: products.length,
      data: products.map(sanitizePublicProductMedia),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: getSafeInternalMessage(error, "Failed to fetch products."),
    });
  }
};

const getFeaturedProducts = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database is unavailable.",
      });
    }

    const limit = Math.min(
      Math.max(Number(req.query.limit) || 8, 1),
      24
    );

    const products = await Product.find({
      isActive: true,
      isFeatured: true,
    })
      .populate("category", "name arabicName slug")
      .populate("categories", "name arabicName slug")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      count: products.length,
      data: products.map(sanitizePublicProductMedia),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: getSafeInternalMessage(error, "Failed to fetch featured products."),
    });
  }
};

const getProductBySlug = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database is unavailable.",
      });
    }

    const product = await Product.findOne({
      slug: req.params.slug,
      isActive: true,
    })
      .populate("category", "name arabicName slug description arabicDescription")
      .populate("categories", "name arabicName slug description arabicDescription")
      .lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: sanitizePublicProductMedia(product),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: getSafeInternalMessage(error, "Failed to fetch product."),
    });
  }
};

const getAdminProducts = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(200).json({
        success: true,
        data: [],
        pagination: {
          page: 1,
          limit: Number(req.query.limit) || 20,
          total: 0,
          pages: 0,
        },
      });
    }

    const { page, limit, skip } = getPagination({
      ...req.query,
      limit: req.query.limit || 20,
    });

    const filter = await buildAdminProductFilter(req.query);

    const [products, total] = await Promise.all([
      Product.find(filter)
        .select("+costPrice")
        .populate("category", "name arabicName slug")
        .populate("categories", "name arabicName slug")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      count: products.length,
      data: products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: getSafeInternalMessage(error, "Failed to fetch admin products."),
    });
  }
};

const getAdminProductById = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(404).json({
        success: false,
        message: "Product not found because database is not connected.",
      });
    }

    const product = await Product.findById(req.params.id)
      .select("+costPrice")
      .populate("category", "name arabicName slug")
      .populate("categories", "name arabicName slug")
      .lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: getSafeInternalMessage(error, "Failed to fetch admin product."),
    });
  }
};

const createProduct = async (req, res) => {
  let uploadedImages = [];

  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database is not connected.",
      });
    }

    const candidateName = req.body.name?.trim();
    const candidateSlug = slugify(req.body.slug || candidateName || "");

    if (!candidateSlug) {
      return res.status(400).json({
        success: false,
        message: "Product name is required.",
      });
    }

    const existingProduct = await Product.findOne({
      slug: candidateSlug,
    }).select("_id");

    if (existingProduct) {
      return res.status(409).json({
        success: false,
        message: "A product with this slug already exists.",
      });
    }

    const built = await buildProductPayload(
      req.body,
      req.files || []
    );

    uploadedImages = built.uploadedImages;

    const product = await Product.create(built.payload);

    const populatedProduct = await Product.findById(product._id)
      .select("+costPrice")
      .populate("category", "name arabicName slug")
      .populate("categories", "name arabicName slug");

    scheduleFrontendRebuild("product-created");

    return res.status(201).json({
      success: true,
      message: "Product created successfully.",
      data: populatedProduct,
    });
  } catch (error) {
    await destroyStoredImages(uploadedImages);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to create product.",
    });
  }
};

const updateProduct = async (req, res) => {
  let uploadedImages = [];

  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database is not connected.",
      });
    }

    const product = await Product.findById(req.params.id).select("+costPrice");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    const nextSlug = req.body.slug?.trim()
      ? slugify(req.body.slug)
      : product.slug;

    if (nextSlug !== product.slug) {
      const slugExists = await Product.findOne({
        slug: nextSlug,
        _id: { $ne: product._id },
      }).select("_id");

      if (slugExists) {
        return res.status(409).json({
          success: false,
          message: "A product with this slug already exists.",
        });
      }
    }

    const built = await buildProductPayload(
      req.body,
      req.files || [],
      product
    );

    uploadedImages = built.uploadedImages;

    Object.assign(product, built.payload);

    await product.save();

    await destroyStoredImages(built.removedImages);

    const populatedProduct = await Product.findById(product._id)
      .select("+costPrice")
      .populate("category", "name arabicName slug")
      .populate("categories", "name arabicName slug");

    scheduleFrontendRebuild("product-updated");

    return res.status(200).json({
      success: true,
      message: "Product updated successfully.",
      data: populatedProduct,
    });
  } catch (error) {
    await destroyStoredImages(uploadedImages);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to update product.",
    });
  }
};

const deleteProduct = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database is not connected.",
      });
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    if (req.query.hard === "true") {
      const images = [...(product.images || [])];

      await product.deleteOne();
      await destroyStoredImages(images);

      scheduleFrontendRebuild("product-deleted");

      return res.status(200).json({
        success: true,
        message: "Product permanently deleted successfully.",
      });
    }

    product.isActive = false;
    await product.save();

    scheduleFrontendRebuild("product-deactivated");

    return res.status(200).json({
      success: true,
      message: "Product deactivated successfully.",
      data: product,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to delete product.",
    });
  }
};

const deleteProductImage = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database is not connected.",
      });
    }

    const { publicId, imageUrl } = req.body;

    if (!publicId && !imageUrl) {
      return res.status(400).json({
        success: false,
        message: "publicId or imageUrl is required.",
      });
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    const imageToRemove = product.images.find(
      (image) =>
        (publicId && image.publicId === publicId) ||
        (imageUrl && image.url === imageUrl)
    );

    if (!imageToRemove) {
      return res.status(404).json({
        success: false,
        message: "Image not found on this product.",
      });
    }

    product.images = product.images.filter(
      (image) => image.url !== imageToRemove.url
    );

    if (product.images.length) {
      const mainIndex = product.images.findIndex((image) => image.isMain);

      product.images.forEach((image, index) => {
        image.isMain = index === (mainIndex >= 0 ? mainIndex : 0);
      });
    }

    await product.save();
    await destroyStoredImage(imageToRemove.publicId);

    scheduleFrontendRebuild("product-image-deleted");

    return res.status(200).json({
      success: true,
      message: "Product image deleted successfully.",
      data: product,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to delete product image.",
    });
  }
};

module.exports = {
  getSearchSuggestions,
  getProducts,
  getFeaturedProducts,
  getProductBySlug,
  getAdminProducts,
  getAdminProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  deleteProductImage,
};

const resolveCategories = async (value, fallbackCategory = null) => {
  const requested = parseStringArray(value);
  if (!requested.length && fallbackCategory) {
    const fallbacks = Array.isArray(fallbackCategory) ? fallbackCategory : [fallbackCategory];
    requested.push(...fallbacks.map(String));
  }
  const resolved = [];
  for (const item of requested) {
    const category = await resolveCategory(item);
    if (!resolved.some((entry) => String(entry._id) === String(category._id))) resolved.push(category);
  }
  if (!resolved.length) throw new Error("At least one product category is required.");
  return resolved;
};
