const { getSafeInternalMessage } = require("../utils/httpError");
const mongoose = require("mongoose");
const Offer = require("../models/Offer");
const Product = require("../models/Product");
const Category = require("../models/Category");

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

  const raw = Array.isArray(value)
    ? value
    : Array.isArray(parseMaybeJSON(value, null))
      ? parseMaybeJSON(value, [])
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
  return { page, limit, skip: (page - 1) * limit };
};

const resolveProducts = async (value) => {
  const items = parseArray(value);
  if (!items.length) return [];

  const objectIds = items.filter((item) => mongoose.Types.ObjectId.isValid(item));
  const textValues = items.filter(
    (item) => !mongoose.Types.ObjectId.isValid(item)
  );
  const $or = [];

  if (objectIds.length) $or.push({ _id: { $in: objectIds } });

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

  const objectIds = items.filter((item) => mongoose.Types.ObjectId.isValid(item));
  const textValues = items.filter(
    (item) => !mongoose.Types.ObjectId.isValid(item)
  );
  const $or = [];

  if (objectIds.length) $or.push({ _id: { $in: objectIds } });

  for (const item of textValues) {
    $or.push(
      { slug: item.toLowerCase() },
      { name: new RegExp(`^${escapeRegex(item)}$`, "i") }
    );
  }

  const categories = await Category.find({ $or }).select("_id");
  return categories.map((category) => category._id);
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

const serializeOffer = (value) => {
  const offer = value?.toObject ? value.toObject() : value;

  return {
    ...offer,
    title: offer?.title || offer?.name || "",
    scope: offer?.offerType || "sitewide",
    startsAt: offer?.startAt || null,
    endsAt: offer?.endAt || null,
  };
};

const buildOfferPayload = async (body = {}) => {
  const name = String(body.name || body.title || "").trim();

  if (!name) throw new Error("Offer name is required.");

  const offerType = body.offerType || body.scope || "sitewide";
  const validTypes = ["sitewide", "category", "product", "free_shipping"];

  if (!validTypes.includes(offerType)) {
    throw new Error("Invalid offer type.");
  }

  const discountType =
    offerType === "free_shipping"
      ? "free_shipping"
      : body.discountType || "percentage";

  const products = await resolveProducts(body.products || body.productIds);
  const categories = await resolveCategories(
    body.categories || body.categoryIds
  );

  return {
    name,
    title: String(body.title || name).trim(),
    arabicTitle: String(body.arabicTitle || "").trim(),
    description: String(body.description || "").trim(),
    arabicDescription: String(body.arabicDescription || "").trim(),
    offerType,
    discountType,
    discountValue: parseNumber(body.discountValue, 0),
    products,
    categories,
    minQuantity: parseNumber(body.minQuantity, 0),
    minOrderValue: parseNumber(body.minOrderValue, 0),
    maxDiscountAmount: parseNumber(body.maxDiscountAmount, 0),
    startAt: parseDate(body.startAt ?? body.startsAt),
    endAt: parseDate(body.endAt ?? body.endsAt),
    isActive: parseBoolean(body.isActive, true),
    priority: parseNumber(body.priority, 0),
    allowStacking: parseBoolean(body.allowStacking, false),
    usageLimit: parseNumber(body.usageLimit, 0),
  };
};

const buildOfferFilter = (query = {}) => {
  const filter = {};

  if (query.status === "active") filter.isActive = true;
  if (query.status === "inactive") filter.isActive = false;

  if (query.offerType || query.scope) {
    filter.offerType = query.offerType || query.scope;
  }

  if (query.discountType) filter.discountType = query.discountType;

  if (query.search?.trim()) {
    const regex = new RegExp(escapeRegex(query.search.trim()), "i");
    filter.$or = [{ name: regex }, { description: regex }];
  }

  return filter;
};

const populateOffer = (query) =>
  query
    .populate("products", "name slug price images")
    .populate("categories", "name slug");

const getPublicOffers = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database is unavailable.",
      });
    }

    const offers = await populateOffer(
      Offer.find(activeWindowFilter()).sort({
        priority: -1,
        createdAt: -1,
      })
    ).lean();

    return res.status(200).json({
      success: true,
      count: offers.length,
      data: offers.map(serializeOffer),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: getSafeInternalMessage(error, "Failed to fetch offers."),
    });
  }
};

const getAdminOffers = async (req, res) => {
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

    const { page, limit, skip } = getPagination(req.query);
    const filter = buildOfferFilter(req.query);

    const [offers, total] = await Promise.all([
      populateOffer(
        Offer.find(filter)
          .sort({
            priority: -1,
            createdAt: -1,
          })
          .skip(skip)
          .limit(limit)
      ).lean(),

      Offer.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      count: offers.length,
      data: offers.map(serializeOffer),
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
      message: getSafeInternalMessage(error, "Failed to fetch admin offers."),
    });
  }
};

const getAdminOfferById = async (req, res) => {
  try {
    const offer = await populateOffer(Offer.findById(req.params.id)).lean();

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "Offer not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: serializeOffer(offer),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: getSafeInternalMessage(error, "Failed to fetch offer."),
    });
  }
};

const createOffer = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database is not connected.",
      });
    }

    const offer = await Offer.create(
      await buildOfferPayload(req.body)
    );

    const populated = await populateOffer(
      Offer.findById(offer._id)
    );

    return res.status(201).json({
      success: true,
      message: "Offer created successfully.",
      data: serializeOffer(populated),
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to create offer.",
    });
  }
};

const updateOffer = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database is not connected.",
      });
    }

    const offer = await Offer.findById(req.params.id);

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "Offer not found.",
      });
    }

    Object.assign(
      offer,
      await buildOfferPayload(req.body)
    );

    await offer.save();

    const populated = await populateOffer(
      Offer.findById(offer._id)
    );

    return res.status(200).json({
      success: true,
      message: "Offer updated successfully.",
      data: serializeOffer(populated),
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to update offer.",
    });
  }
};

const deleteOffer = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database is not connected.",
      });
    }

    const offer = await Offer.findById(req.params.id);

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "Offer not found.",
      });
    }

    if (req.query.hard === "true") {
      await offer.deleteOne();

      return res.status(200).json({
        success: true,
        message: "Offer permanently deleted successfully.",
      });
    }

    offer.isActive = false;
    await offer.save();

    return res.status(200).json({
      success: true,
      message: "Offer deactivated successfully.",
      data: serializeOffer(offer),
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to delete offer.",
    });
  }
};

module.exports = {
  getPublicOffers,
  getAdminOffers,
  getAdminOfferById,
  createOffer,
  updateOffer,
  deleteOffer,
};
