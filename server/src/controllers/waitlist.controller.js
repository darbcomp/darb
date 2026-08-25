const mongoose = require("mongoose");
const Waitlist = require("../models/Waitlist");
const Product = require("../models/Product");

const isDatabaseConnected = () => mongoose.connection.readyState === 1;

const allowedStatuses = [
  "waiting",
  "notified",
  "contacted",
  "converted",
  "cancelled",
];

const escapeRegex = (value = "") => {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const getPagination = (query) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 80);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

const findProduct = async ({ product, productId, slug, productSlug }) => {
  const id = product || productId;
  const cleanSlug = slug || productSlug;

  if (id && mongoose.Types.ObjectId.isValid(id)) {
    const productById = await Product.findById(id).populate(
      "category",
      "name slug"
    );

    if (productById) return productById;
  }

  if (cleanSlug) {
    const productBySlug = await Product.findOne({ slug: cleanSlug }).populate(
      "category",
      "name slug"
    );

    if (productBySlug) return productBySlug;
  }

  return null;
};

const getMainImage = (product) => {
  return product.images?.find((image) => image.isMain) || product.images?.[0];
};

const buildProductSnapshot = (product, fallback = {}) => {
  if (!product) {
    return {
      name: fallback.productName || fallback.name || "Darb Product",
      slug: fallback.productSlug || fallback.slug || "",
      image: fallback.image || "",
      categoryName: fallback.categoryName || "",
      categorySlug: fallback.categorySlug || "",
      sizeLabel: fallback.sizeLabel || "",
      sizeMl: Number(fallback.sizeMl) || 0,
    };
  }

  const mainImage = getMainImage(product);

  return {
    name: product.name || "Darb Product",
    slug: product.slug || "",
    image: mainImage?.url || "",
    categoryName: product.category?.name || product.categorySnapshot?.name || "",
    categorySlug: product.category?.slug || product.categorySnapshot?.slug || "",
    sizeLabel: product.sizeLabel || "",
    sizeMl: Number(product.sizeMl) || 0,
  };
};

const buildAdminFilter = (query = {}) => {
  const filter = {};

  if (query.status) filter.status = query.status;
  if (query.source) filter.source = query.source;

  if (query.search) {
    const searchRegex = new RegExp(escapeRegex(query.search.trim()), "i");

    filter.$or = [
      { name: searchRegex },
      { phone: searchRegex },
      { email: searchRegex },
      { "productSnapshot.name": searchRegex },
      { "productSnapshot.slug": searchRegex },
      { "productSnapshot.categoryName": searchRegex },
      { note: searchRegex },
    ];
  }

  return filter;
};

const createWaitlistRequest = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message:
          "Database is not connected. Waitlist requests are unavailable for now.",
      });
    }

    const {
      product,
      productId,
      slug,
      productSlug,
      productName,
      name,
      phone,
      email,
      source = "product_page",
      note = "",
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name is required.",
      });
    }

    if (!phone?.trim() && !email?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Phone or email is required.",
      });
    }

    const foundProduct = await findProduct({
      product,
      productId,
      slug,
      productSlug,
    });

    if (!foundProduct && !productName && !productSlug && !slug) {
      return res.status(400).json({
        success: false,
        message: "Product information is required.",
      });
    }

    const cleanPhone = phone?.trim() || "";
    const cleanEmail = email?.trim().toLowerCase() || "";
    const snapshot = buildProductSnapshot(foundProduct, {
      productName,
      productSlug,
      slug,
    });

    const duplicateFilter = {
      status: { $in: ["waiting", "notified", "contacted"] },
      "productSnapshot.slug": snapshot.slug,
      $or: [],
    };

    if (cleanPhone) duplicateFilter.$or.push({ phone: cleanPhone });
    if (cleanEmail) duplicateFilter.$or.push({ email: cleanEmail });

    if (duplicateFilter.$or.length > 0 && snapshot.slug) {
      const existingRequest = await Waitlist.findOne(duplicateFilter);

      if (existingRequest) {
        return res.status(200).json({
          success: true,
          message:
            "You are already on the waitlist for this product. We will contact you when it is available.",
          data: existingRequest,
        });
      }
    }

    const waitlistRequest = await Waitlist.create({
      product: foundProduct?._id || null,
      productSnapshot: snapshot,
      name: name.trim(),
      phone: cleanPhone,
      email: cleanEmail,
      status: "waiting",
      source,
      note: note?.trim() || "",
    });

    return res.status(201).json({
      success: true,
      message:
        "Waitlist request added successfully. We will contact you when this product is available.",
      data: waitlistRequest,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to create waitlist request.",
    });
  }
};

const getAdminWaitlist = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(200).json({
        success: true,
        message: "Database not connected. Returning empty waitlist.",
        data: [],
        pagination: {
          page: 1,
          limit: Number(req.query.limit) || 20,
          total: 0,
          pages: 0,
        },
        summary: {
          waiting: 0,
          notified: 0,
          contacted: 0,
          converted: 0,
          cancelled: 0,
          total: 0,
        },
      });
    }

    const { page, limit, skip } = getPagination(req.query);
    const filter = buildAdminFilter(req.query);

    const [requests, total, statusCounts] = await Promise.all([
      Waitlist.find(filter)
        .populate("product", "name slug price stock isActive isPlaceholder images")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Waitlist.countDocuments(filter),

      Waitlist.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const summary = {
      waiting: 0,
      notified: 0,
      contacted: 0,
      converted: 0,
      cancelled: 0,
      total: 0,
    };

    statusCounts.forEach((item) => {
      summary[item._id] = item.count;
      summary.total += item.count;
    });

    return res.status(200).json({
      success: true,
      count: requests.length,
      data: requests,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      summary,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch waitlist.",
    });
  }
};

const getAdminWaitlistRequestById = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(404).json({
        success: false,
        message: "Waitlist request not found because database is not connected.",
      });
    }

    const waitlistRequest = await Waitlist.findById(req.params.id)
      .populate("product", "name slug price stock isActive isPlaceholder images")
      .lean();

    if (!waitlistRequest) {
      return res.status(404).json({
        success: false,
        message: "Waitlist request not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: waitlistRequest,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch waitlist request.",
    });
  }
};

const updateAdminWaitlistRequest = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message:
          "Database is not connected. Waitlist updates are unavailable for now.",
      });
    }

    const { status, note, adminNote } = req.body;

    const waitlistRequest = await Waitlist.findById(req.params.id);

    if (!waitlistRequest) {
      return res.status(404).json({
        success: false,
        message: "Waitlist request not found.",
      });
    }

    if (status) {
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid waitlist status.",
        });
      }

      waitlistRequest.status = status;

      if (status === "notified") {
        waitlistRequest.notifiedAt = new Date();
      }

      if (status === "contacted") {
        waitlistRequest.contactedAt = new Date();
      }
    }

    if (typeof note === "string") {
      waitlistRequest.note = note.trim();
    }

    if (typeof adminNote === "string") {
      waitlistRequest.adminNote = adminNote.trim();
    }

    await waitlistRequest.save();

    const updatedRequest = await Waitlist.findById(waitlistRequest._id)
      .populate("product", "name slug price stock isActive isPlaceholder images")
      .lean();

    return res.status(200).json({
      success: true,
      message: "Waitlist request updated successfully.",
      data: updatedRequest,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to update waitlist request.",
    });
  }
};

const deleteAdminWaitlistRequest = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message:
          "Database is not connected. Waitlist deletion is unavailable for now.",
      });
    }

    const waitlistRequest = await Waitlist.findById(req.params.id);

    if (!waitlistRequest) {
      return res.status(404).json({
        success: false,
        message: "Waitlist request not found.",
      });
    }

    if (req.query.hard === "true") {
      await waitlistRequest.deleteOne();

      return res.status(200).json({
        success: true,
        message: "Waitlist request permanently deleted successfully.",
      });
    }

    waitlistRequest.status = "cancelled";
    await waitlistRequest.save();

    return res.status(200).json({
      success: true,
      message: "Waitlist request cancelled successfully.",
      data: waitlistRequest,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to delete waitlist request.",
    });
  }
};

module.exports = {
  createWaitlistRequest,
  getAdminWaitlist,
  getAdminWaitlistRequestById,
  updateAdminWaitlistRequest,
  deleteAdminWaitlistRequest,
};