const { getSafeInternalMessage } = require("../utils/httpError");
const mongoose = require("mongoose");
const Bundle = require("../models/Bundle");
const Product = require("../models/Product");
const Category = require("../models/Category");
const { uploadOptimizedPublicImage, deletePublicMedia } = require("../services/mediaStorage.service");
const { shouldCleanupUploadedMedia, shouldDeleteReplacedMedia } = require("../utils/mediaLifecycle");

const isDatabaseConnected = () => mongoose.connection.readyState === 1;

const escapeRegex = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeRef = (value) => {
  if (value && typeof value === "object") {
    return value._id || value.id || value.slug || value.name || "";
  }

  return value;
};

const parseMaybeJSON = (value, fallback) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const parseArray = (value) => {
  if (!value) return [];

  const parsed = parseMaybeJSON(value, null);

  const raw = Array.isArray(value)
    ? value
    : Array.isArray(parsed)
      ? parsed
      : String(value).split(",");

  return raw
    .map(normalizeRef)
    .map((item) => String(item || "").trim())
    .filter(Boolean);
};

const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  return String(value).toLowerCase() === "true";
};

const parseNumber = (value, fallback = 0) => {
  if (value === undefined || value === null || value === "") return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getPagination = (query = {}) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 80);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

const resolveProducts = async (value) => {
  const items = parseArray(value);

  if (!items.length) return [];

  const objectIds = items.filter((item) =>
    mongoose.Types.ObjectId.isValid(item)
  );

  const textValues = items.filter(
    (item) => !mongoose.Types.ObjectId.isValid(item)
  );

  const $or = [];

  if (objectIds.length) {
    $or.push({ _id: { $in: objectIds } });
  }

  for (const item of textValues) {
    $or.push(
      { slug: item.toLowerCase() },
      { sku: item },
      { name: new RegExp(`^${escapeRegex(item)}$`, "i") }
    );
  }

  const products = await Product.find({ $or }).select("_id");

  return products.map((product) => product._id);
};

const resolveCategories = async (value) => {
  const items = parseArray(value);

  if (!items.length) return [];

  const objectIds = items.filter((item) =>
    mongoose.Types.ObjectId.isValid(item)
  );

  const textValues = items.filter(
    (item) => !mongoose.Types.ObjectId.isValid(item)
  );

  const $or = [];

  if (objectIds.length) {
    $or.push({ _id: { $in: objectIds } });
  }

  for (const item of textValues) {
    $or.push(
      { slug: item.toLowerCase() },
      { name: new RegExp(`^${escapeRegex(item)}$`, "i") }
    );
  }

  const categories = await Category.find({ $or }).select("_id");

  return categories.map((category) => category._id);
};

const parseSpecificItems = (value) => {
  if (!value) return [];

  if (Array.isArray(value)) return value;

  const parsed = parseMaybeJSON(value, null);

  if (Array.isArray(parsed)) return parsed;

  return String(value)
    .split(/\r?\n|,/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const separatorIndex = entry.lastIndexOf(":");

      if (separatorIndex === -1) {
        return {
          product: entry,
          quantity: 1,
        };
      }

      const product = entry.slice(0, separatorIndex).trim();

      const quantity = parseNumber(
        entry.slice(separatorIndex + 1).trim(),
        1
      );

      return {
        product,
        quantity,
      };
    });
};

const buildSpecificItems = async (value) => {
  const items = parseSpecificItems(value);
  const result = [];

  for (const item of items) {
    const reference =
      normalizeRef(item.product) ||
      normalizeRef(item.productId) ||
      normalizeRef(item.slug);

    if (!reference) continue;

    const productIds = await resolveProducts([reference]);

    if (productIds.length) {
      result.push({
        product: productIds[0],
        quantity: Math.max(
          parseNumber(item.quantity, 1),
          1
        ),
      });
    }
  }

  return result;
};

const activeWindowFilter = () => {
  const now = new Date();

  return {
    isActive: true,
    $and: [
      {
        $or: [
          { startAt: null },
          { startAt: { $exists: false } },
          { startAt: { $lte: now } },
        ],
      },
      {
        $or: [
          { endAt: null },
          { endAt: { $exists: false } },
          { endAt: { $gte: now } },
        ],
      },
    ],
  };
};

const serializeBundle = (value) => {
  const bundle = value?.toObject ? value.toObject() : value;

  return {
    ...bundle,

    title: bundle?.title || bundle?.name || "",

    categories: bundle?.allowedCategories || [],

    fixedBundlePrice:
      bundle?.discountType === "fixed_bundle_price"
        ? Number(bundle.discountValue) || 0
        : 0,

    startsAt: bundle?.startAt || null,

    endsAt: bundle?.endAt || null,
  };
};

const uploadBundleImage = async (file, name) => {
  if (!file) return null;
  const result = await uploadOptimizedPublicImage(file, {
    folder: "bundles",
    baseName: String(name || "bundle").toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    alt: `${name || "Darb bundle"} — Darb`,
  });
  return { url: result.url, publicId: result.publicId, alt: name || "Darb bundle" };
};

const buildBundlePayload = async (body = {}, current = null, file = null) => {
  const name = String(
    body.name || body.title || ""
  ).trim();

  if (!name) {
    throw new Error("Bundle name is required.");
  }

  const bundleType =
    body.bundleType || "any_products";

  const validTypes = [
    "any_products",
    "specific_products",
    "category_products",
  ];

  if (!validTypes.includes(bundleType)) {
    throw new Error("Invalid bundle type.");
  }

  const discountType =
    body.discountType || "percentage";

  const validDiscountTypes = [
    "percentage",
    "fixed",
    "fixed_bundle_price",
    "free_shipping",
  ];

  if (!validDiscountTypes.includes(discountType)) {
    throw new Error("Invalid bundle discount type.");
  }

  const allowedProducts = await resolveProducts(
    body.allowedProducts ||
      body.products ||
      body.productIds
  );

  const allowedCategories = await resolveCategories(
    body.allowedCategories ||
      body.categories ||
      body.categoryIds
  );

  const specificItems = await buildSpecificItems(
    body.specificItems
  );

  const normalDiscountValue = parseNumber(
    body.discountValue,
    0
  );

  const fixedBundlePrice = parseNumber(
    body.fixedBundlePrice,
    normalDiscountValue
  );

  let image = current?.image || { url: "", publicId: "", alt: "" };
  if (parseBoolean(body.removeImage, false)) image = { url: "", publicId: "", alt: "" };
  if (file) image = await uploadBundleImage(file, name);

  return {
    name,
    title: String(body.title || current?.title || name).trim(),
    arabicTitle: String(body.arabicTitle ?? current?.arabicTitle ?? "").trim(),

    description: String(
      body.description || ""
    ).trim(),
    arabicDescription: String(
      body.arabicDescription ?? current?.arabicDescription ?? ""
    ).trim(),
    image,
    freeDelivery: parseBoolean(body.freeDelivery, current?.freeDelivery || false),

    bundleType,

    requiredQuantity: Math.max(
      parseNumber(body.requiredQuantity, 2),
      1
    ),

    specificItems,

    allowedProducts,

    allowedCategories,

    discountType,

    // For fixed_bundle_price, the existing Bundle model's
    // discountValue stores the final bundle price.
    discountValue:
      discountType === "fixed_bundle_price"
        ? fixedBundlePrice
        : normalDiscountValue,

    minOrderValue: parseNumber(
      body.minOrderValue,
      0
    ),

    maxApplications: parseNumber(
      body.maxApplications,
      0
    ),

    startAt: parseDate(
      body.startAt ?? body.startsAt
    ),

    endAt: parseDate(
      body.endAt ?? body.endsAt
    ),

    isActive: parseBoolean(
      body.isActive,
      true
    ),

    priority: parseNumber(
      body.priority,
      0
    ),

    allowCouponStacking: parseBoolean(
      false,
      false
    ),

    usageLimit: parseNumber(
      body.usageLimit,
      0
    ),
  };
};

const buildBundleFilter = (query = {}) => {
  const filter = {};

  if (query.status === "active") {
    filter.isActive = true;
  }

  if (query.status === "inactive") {
    filter.isActive = false;
  }

  if (query.bundleType) {
    filter.bundleType = query.bundleType;
  }

  if (query.discountType) {
    filter.discountType = query.discountType;
  }

  if (query.search?.trim()) {
    const regex = new RegExp(
      escapeRegex(query.search.trim()),
      "i"
    );

    filter.$or = [
      { name: regex },
      { description: regex },
    ];
  }

  return filter;
};

const populateBundle = (query) =>
  query
    .populate(
      "allowedProducts",
      "name arabicName slug sku price images"
    )
    .populate(
      "allowedCategories",
      "name arabicName slug"
    )
    .populate(
      "specificItems.product",
      "name arabicName slug sku price compareAtPrice sizeLabel sizeMl stock images variants categorySnapshot isActive isPlaceholder"
    );

const getPublicBundles = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database is unavailable.",
      });
    }

    const bundles = await populateBundle(
      Bundle.find(activeWindowFilter()).sort({
        priority: -1,
        createdAt: -1,
      })
    ).lean();

    return res.status(200).json({
      success: true,
      count: bundles.length,
      data: bundles.map(serializeBundle),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        getSafeInternalMessage(error, "Failed to fetch bundles."),
    });
  }
};

const getAdminBundles = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(200).json({
        success: true,
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          pages: 0,
        },
      });
    }

    const {
      page,
      limit,
      skip,
    } = getPagination(req.query);

    const filter = buildBundleFilter(
      req.query
    );

    const [bundles, total] =
      await Promise.all([
        populateBundle(
          Bundle.find(filter)
            .sort({
              priority: -1,
              createdAt: -1,
            })
            .skip(skip)
            .limit(limit)
        ).lean(),

        Bundle.countDocuments(filter),
      ]);

    return res.status(200).json({
      success: true,

      count: bundles.length,

      data: bundles.map(
        serializeBundle
      ),

      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(
          total / limit
        ),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        getSafeInternalMessage(error, "Failed to fetch admin bundles."),
    });
  }
};

const getAdminBundleById = async (
  req,
  res
) => {
  try {
    const bundle =
      await populateBundle(
        Bundle.findById(req.params.id)
      ).lean();

    if (!bundle) {
      return res.status(404).json({
        success: false,
        message: "Bundle not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: serializeBundle(bundle),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        getSafeInternalMessage(error, "Failed to fetch bundle."),
    });
  }
};

const createBundle = async (
  req,
  res
) => {
  let uploadedImagePublicId = "";
  let bundlePersisted = false;
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message:
          "Database is not connected.",
      });
    }

    const payload = await buildBundlePayload(
          req.body,
          null,
          req.file
        );
    if (req.file) uploadedImagePublicId = payload.image?.publicId || "";
    const bundle = await Bundle.create(payload);
    bundlePersisted = true;

    const populated =
      await populateBundle(
        Bundle.findById(bundle._id)
      );

    return res.status(201).json({
      success: true,
      message:
        "Bundle created successfully.",
      data:
        serializeBundle(populated),
    });
  } catch (error) {
    if (shouldCleanupUploadedMedia({ uploadedKey: uploadedImagePublicId, persisted: bundlePersisted })) await deletePublicMedia(uploadedImagePublicId).catch(() => {});
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Failed to create bundle.",
    });
  }
};

const updateBundle = async (
  req,
  res
) => {
  let uploadedImagePublicId = "";
  let bundlePersisted = false;
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message:
          "Database is not connected.",
      });
    }

    const bundle =
      await Bundle.findById(req.params.id).select("+image.publicId");

    if (!bundle) {
      return res.status(404).json({
        success: false,
        message: "Bundle not found.",
      });
    }

    const previousImagePublicId = bundle.image?.publicId || "";
    const payload = await buildBundlePayload(
        req.body,
        bundle,
        req.file
      );
    if (req.file) uploadedImagePublicId = payload.image?.publicId || "";
    Object.assign(bundle, payload);

    await bundle.save();
    bundlePersisted = true;
    if (shouldDeleteReplacedMedia({ previousKey: previousImagePublicId, nextKey: bundle.image?.publicId, persisted: bundlePersisted })) {
      await deletePublicMedia(previousImagePublicId).catch(() => {});
    }

    const populated =
      await populateBundle(
        Bundle.findById(bundle._id)
      );

    return res.status(200).json({
      success: true,
      message:
        "Bundle updated successfully.",
      data:
        serializeBundle(populated),
    });
  } catch (error) {
    if (shouldCleanupUploadedMedia({ uploadedKey: uploadedImagePublicId, persisted: bundlePersisted })) await deletePublicMedia(uploadedImagePublicId).catch(() => {});
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Failed to update bundle.",
    });
  }
};

const deleteBundle = async (
  req,
  res
) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message:
          "Database is not connected.",
      });
    }

    const bundle =
      await Bundle.findById(req.params.id).select("+image.publicId");

    if (!bundle) {
      return res.status(404).json({
        success: false,
        message: "Bundle not found.",
      });
    }

    if (
      req.query.hard === "true"
    ) {
      await bundle.deleteOne();
      if (bundle.image?.publicId) await deletePublicMedia(bundle.image.publicId).catch(() => {});

      return res.status(200).json({
        success: true,
        message:
          "Bundle permanently deleted successfully.",
      });
    }

    bundle.isActive = false;

    await bundle.save();

    return res.status(200).json({
      success: true,
      message:
        "Bundle deactivated successfully.",
      data:
        serializeBundle(bundle),
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Failed to delete bundle.",
    });
  }
};

module.exports = {
  getPublicBundles,
  getAdminBundles,
  getAdminBundleById,
  createBundle,
  updateBundle,
  deleteBundle,
};
