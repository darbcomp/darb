const mongoose = require("mongoose");
const { Readable } = require("stream");

const Product = require("../models/Product");
const Category = require("../models/Category");
const { cloudinary } = require("../config/cloudinary");
const slugify = require("../utils/slugify");

const MAX_PRODUCT_IMAGES = 3;

const isDatabaseConnected = () => mongoose.connection.readyState === 1;

const isCloudinaryReady = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );

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

const destroyCloudinaryImage = async (publicId) => {
  if (!publicId || !isCloudinaryReady()) return;

  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error(`Cloudinary cleanup failed for ${publicId}:`, error.message);
  }
};

const destroyCloudinaryImages = async (images = []) => {
  await Promise.all(
    images
      .filter((image) => image?.publicId)
      .map((image) => destroyCloudinaryImage(image.publicId))
  );
};

const uploadBufferToCloudinary = (buffer, options = {}) =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || "darb/products",
        public_id: options.publicId,
        resource_type: "image",
        format: "webp",
        overwrite: false,
      },
      (error, result) => {
        if (error) return reject(error);
        return resolve(result);
      }
    );

    const readableStream = new Readable();
    readableStream._read = () => {};
    readableStream.push(buffer);
    readableStream.push(null);
    readableStream.pipe(uploadStream);
  });

const validateUploadFiles = (files = []) => {
  for (const file of files) {
    if (file.mimetype !== "image/webp") {
      throw new Error("Darb product images must be WEBP files.");
    }
  }
};

const uploadFilesToCloudinary = async ({
  files = [],
  categorySlug,
  productSlug,
}) => {
  if (!files.length) return [];

  if (!isCloudinaryReady()) {
    throw new Error(
      "Cloudinary credentials are missing. Add Cloudinary credentials before uploading images."
    );
  }

  validateUploadFiles(files);

  const uploadedImages = [];

  try {
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];

      const result = await uploadBufferToCloudinary(file.buffer, {
        folder: `darb/products/${categorySlug}`,
        publicId: `${productSlug}-${Date.now()}-${index + 1}`,
      });

      uploadedImages.push({
        url: result.secure_url,
        publicId: result.public_id,
        alt: file.originalname || "Darb product image",
        isMain: false,
      });
    }

    return uploadedImages;
  } catch (error) {
    await destroyCloudinaryImages(uploadedImages);
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
      publicId: image.publicId || "",
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
      publicId: match.publicId || "",
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

  const categoryValue =
    body.category || body.categorySlug || body.categoryName;

  const category = categoryValue
    ? await resolveCategory(categoryValue)
    : existingProduct?.category
      ? await Category.findById(existingProduct.category)
      : null;

  if (!category) {
    throw new Error("Product category is required.");
  }

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

  const uploadedImages = await uploadFilesToCloudinary({
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

  const variants = parseMaybeJSON(body.variants, []);
  const tags = parseStringArray(body.tags);

  const isPlaceholder = parseBoolean(
    body.isPlaceholder,
    existingProduct?.isPlaceholder || false
  );

  const isActive = parseBoolean(
    body.isActive,
    existingProduct?.isActive || false
  );

  const price = parseNumber(body.price, existingProduct?.price || 0);

  if (isActive && !isPlaceholder && price <= 0) {
    await destroyCloudinaryImages(uploadedImages);
    throw new Error("Active real products must have a valid price.");
  }

  const payload = {
    name,
    slug: productSlug,
    sku: body.sku?.trim() || "",
    category: category._id,
    categorySnapshot: {
      name: category.name,
      slug: category.slug,
    },
    shortDescription: body.shortDescription?.trim() || "",
    description: body.description?.trim() || "",
    price,
    compareAtPrice: parseNumber(body.compareAtPrice, 0),
    costPrice: parseNumber(body.costPrice, 0),
    sizeLabel:
      body.sizeLabel?.trim() || existingProduct?.sizeLabel || "50 ML",
    sizeMl: parseNumber(body.sizeMl, existingProduct?.sizeMl || 50),
    concentration:
      body.concentration?.trim() ||
      existingProduct?.concentration ||
      "Eau de Parfum",
    scentFamily: body.scentFamily?.trim() || "",
    scentNotes: {
      top: Array.isArray(scentNotes?.top) ? scentNotes.top : [],
      middle: Array.isArray(scentNotes?.middle) ? scentNotes.middle : [],
      base: Array.isArray(scentNotes?.base) ? scentNotes.base : [],
    },
    images,
    variants: Array.isArray(variants) ? variants : [],
    stock: parseNumber(body.stock, 0),
    lowStockThreshold: parseNumber(body.lowStockThreshold, 3),
    tags,
    isActive,
    isPlaceholder,
    isFeatured: parseBoolean(body.isFeatured, false),
    isBestSeller: parseBoolean(body.isBestSeller, false),
    isNewArrival: parseBoolean(body.isNewArrival, false),
    metaTitle: body.metaTitle?.trim() || "",
    metaDescription: body.metaDescription?.trim() || "",
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

      filter.category = categoryIds.length
        ? { $in: categoryIds }
        : null;
    }
  }

  if (query.search?.trim()) {
    const searchRegex = new RegExp(
      escapeRegex(query.search.trim()),
      "i"
    );

    filter.$or = [
      { name: searchRegex },
      { shortDescription: searchRegex },
      { description: searchRegex },
      { scentFamily: searchRegex },
      { tags: searchRegex },
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
      filter.stock = { $gt: 0 };
    }

    if (wantsOutOfStock && !wantsInStock) {
      filter.stock = { $lte: 0 };
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

    filter.category = category?._id || null;
  }

  if (query.search?.trim()) {
    const searchRegex = new RegExp(
      escapeRegex(query.search.trim()),
      "i"
    );

    filter.$or = [
      { name: searchRegex },
      { sku: searchRegex },
      { shortDescription: searchRegex },
      { description: searchRegex },
      { scentFamily: searchRegex },
      { tags: searchRegex },
    ];
  }

  return filter;
};

const getProducts = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(200).json({
        success: true,
        data: [],
        pagination: {
          page: 1,
          limit: Number(req.query.limit) || 12,
          total: 0,
          pages: 0,
        },
      });
    }

    const { page, limit, skip } = getPagination(req.query);
    const filter = await buildPublicProductFilter(req.query);
    const sort = buildPublicProductSort(req.query.sort);

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate("category", "name slug")
        .sort(sort)
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
      message: error.message || "Failed to fetch products.",
    });
  }
};

const getFeaturedProducts = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(200).json({
        success: true,
        data: [],
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
      .populate("category", "name slug")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch featured products.",
    });
  }
};

const getProductBySlug = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(404).json({
        success: false,
        message: "Product not found because database is not connected.",
      });
    }

    const product = await Product.findOne({
      slug: req.params.slug,
      isActive: true,
    })
      .populate("category", "name slug description")
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
      message: error.message || "Failed to fetch product.",
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
        .populate("category", "name slug")
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
      message: error.message || "Failed to fetch admin products.",
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
      .populate("category", "name slug")
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
      message: error.message || "Failed to fetch admin product.",
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
      .populate("category", "name slug");

    return res.status(201).json({
      success: true,
      message: "Product created successfully.",
      data: populatedProduct,
    });
  } catch (error) {
    await destroyCloudinaryImages(uploadedImages);

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

    await destroyCloudinaryImages(built.removedImages);

    const populatedProduct = await Product.findById(product._id)
      .select("+costPrice")
      .populate("category", "name slug");

    return res.status(200).json({
      success: true,
      message: "Product updated successfully.",
      data: populatedProduct,
    });
  } catch (error) {
    await destroyCloudinaryImages(uploadedImages);

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
      await destroyCloudinaryImages(images);

      return res.status(200).json({
        success: true,
        message: "Product permanently deleted successfully.",
      });
    }

    product.isActive = false;
    await product.save();

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
    await destroyCloudinaryImage(imageToRemove.publicId);

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