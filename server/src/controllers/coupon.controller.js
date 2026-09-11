const { getSafeInternalMessage, sendInternalError } = require("../utils/httpError");
const mongoose = require("mongoose");
const Coupon = require("../models/Coupon");
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

  return Number.isNaN(date.getTime())
    ? null
    : date;
};

const getPagination = (query = {}) => {
  const page = Math.max(
    Number(query.page) || 1,
    1
  );

  const limit = Math.min(
    Math.max(Number(query.limit) || 20, 1),
    80
  );

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
    (item) =>
      !mongoose.Types.ObjectId.isValid(item)
  );

  const $or = [];

  if (objectIds.length) {
    $or.push({
      _id: {
        $in: objectIds,
      },
    });
  }

  for (const item of textValues) {
    $or.push(
      {
        slug: item.toLowerCase(),
      },
      {
        sku: item,
      },
      {
        name: new RegExp(
          `^${escapeRegex(item)}$`,
          "i"
        ),
      }
    );
  }

  const products =
    await Product.find({
      $or,
    }).select("_id");

  return products.map(
    (product) => product._id
  );
};

const resolveCategories = async (
  value
) => {
  const items = parseArray(value);

  if (!items.length) return [];

  const objectIds = items.filter(
    (item) =>
      mongoose.Types.ObjectId.isValid(
        item
      )
  );

  const textValues = items.filter(
    (item) =>
      !mongoose.Types.ObjectId.isValid(
        item
      )
  );

  const $or = [];

  if (objectIds.length) {
    $or.push({
      _id: {
        $in: objectIds,
      },
    });
  }

  for (const item of textValues) {
    $or.push(
      {
        slug: item.toLowerCase(),
      },
      {
        name: new RegExp(
          `^${escapeRegex(item)}$`,
          "i"
        ),
      }
    );
  }

  const categories =
    await Category.find({
      $or,
    }).select("_id");

  return categories.map(
    (category) => category._id
  );
};

const serializeCoupon = (value) => {
  const coupon =
    value?.toObject
      ? value.toObject()
      : value;

  return {
    ...coupon,

    startsAt:
      coupon?.startAt || null,

    endsAt:
      coupon?.endAt || null,
  };
};

const isCouponCurrentlyValid = (
  coupon
) => {
  const now = new Date();

  if (!coupon?.isActive) {
    return false;
  }

  if (
    coupon.startAt &&
    new Date(coupon.startAt) > now
  ) {
    return false;
  }

  if (
    coupon.endAt &&
    new Date(coupon.endAt) < now
  ) {
    return false;
  }

  if (
    Number(coupon.usageLimit) > 0 &&
    Number(coupon.usedCount) >=
      Number(coupon.usageLimit)
  ) {
    return false;
  }

  return true;
};

const calculateDiscount = ({
  coupon,
  eligibleSubtotal,
}) => {
  const subtotal = Math.max(
    Number(eligibleSubtotal) || 0,
    0
  );

  if (
    coupon.discountType ===
    "free_shipping"
  ) {
    return {
      discountTotal: 0,
      freeShipping: true,
    };
  }

  let discountTotal = 0;

  if (
    coupon.discountType ===
    "percentage"
  ) {
    discountTotal =
      subtotal *
      ((Number(
        coupon.discountValue
      ) || 0) /
        100);
  }

  if (
    coupon.discountType === "fixed"
  ) {
    discountTotal =
      Number(
        coupon.discountValue
      ) || 0;
  }

  if (
    Number(
      coupon.maxDiscountAmount
    ) > 0
  ) {
    discountTotal = Math.min(
      discountTotal,
      Number(
        coupon.maxDiscountAmount
      )
    );
  }

  return {
    discountTotal: Math.min(
      Math.max(
        discountTotal,
        0
      ),
      subtotal
    ),

    freeShipping: false,
  };
};

const buildCouponPayload = async (
  body = {}
) => {
  const code = String(
    body.code || ""
  )
    .trim()
    .toUpperCase();

  if (!code) {
    throw new Error(
      "Coupon code is required."
    );
  }

  return {
    code,

    name: String(
      body.name || code
    ).trim(),

    description: String(
      body.description || ""
    ).trim(),

    discountType:
      body.discountType ||
      "percentage",

    discountValue: parseNumber(
      body.discountValue,
      0
    ),

    minOrderValue: parseNumber(
      body.minOrderValue,
      0
    ),

    maxDiscountAmount:
      parseNumber(
        body.maxDiscountAmount,
        0
      ),

    allowedProducts:
      await resolveProducts(
        body.allowedProducts ||
          body.productIds
      ),

    excludedProducts:
      await resolveProducts(
        body.excludedProducts
      ),

    allowedCategories:
      await resolveCategories(
        body.allowedCategories ||
          body.categoryIds
      ),

    excludedCategories:
      await resolveCategories(
        body.excludedCategories
      ),

    usageLimit: parseNumber(
      body.usageLimit,
      0
    ),

    perCustomerLimit:
      parseNumber(
        body.perCustomerLimit,
        1
      ),

    startAt: parseDate(
      body.startAt ??
        body.startsAt
    ),

    endAt: parseDate(
      body.endAt ??
        body.endsAt
    ),

    isActive: parseBoolean(
      body.isActive,
      true
    ),

    allowWithOffers:
      parseBoolean(
        body.allowWithOffers,
        false
      ),

    allowWithBundles:
      parseBoolean(
        body.allowWithBundles,
        false
      ),
  };
};

const buildCouponFilter = (
  query = {}
) => {
  const filter = {};

  if (
    query.status === "active"
  ) {
    filter.isActive = true;
  }

  if (
    query.status === "inactive"
  ) {
    filter.isActive = false;
  }

  if (query.discountType) {
    filter.discountType =
      query.discountType;
  }

  if (query.search?.trim()) {
    const regex = new RegExp(
      escapeRegex(
        query.search.trim()
      ),
      "i"
    );

    filter.$or = [
      { code: regex },
      { name: regex },
      { description: regex },
    ];
  }

  return filter;
};

const populateCoupon = (query) =>
  query
    .populate(
      "allowedProducts",
      "name slug price images category"
    )
    .populate(
      "excludedProducts",
      "name slug price images category"
    )
    .populate(
      "allowedCategories",
      "name slug"
    )
    .populate(
      "excludedCategories",
      "name slug"
    );

const getProductId = (product) =>
  String(
    product?._id ||
      product ||
      ""
  );

const getCategoryId = (product) =>
  String(
    product?.category?._id ||
      product?.category ||
      ""
  );

const couponAppliesToProduct = (
  coupon,
  product
) => {
  const productId =
    getProductId(product);

  const categoryId =
    getCategoryId(product);

  const allowedProducts =
    (
      coupon.allowedProducts || []
    ).map((item) =>
      String(
        item?._id || item
      )
    );

  const excludedProducts =
    (
      coupon.excludedProducts || []
    ).map((item) =>
      String(
        item?._id || item
      )
    );

  const allowedCategories =
    (
      coupon.allowedCategories ||
      []
    ).map((item) =>
      String(
        item?._id || item
      )
    );

  const excludedCategories =
    (
      coupon.excludedCategories ||
      []
    ).map((item) =>
      String(
        item?._id || item
      )
    );

  if (
    allowedProducts.length &&
    !allowedProducts.includes(
      productId
    )
  ) {
    return false;
  }

  if (
    allowedCategories.length &&
    !allowedCategories.includes(
      categoryId
    )
  ) {
    return false;
  }

  if (
    excludedProducts.includes(
      productId
    )
  ) {
    return false;
  }

  if (
    excludedCategories.includes(
      categoryId
    )
  ) {
    return false;
  }

  return true;
};

const buildValidationCart = async (
  items = []
) => {
  if (
    !Array.isArray(items) ||
    !items.length
  ) {
    return [];
  }

  const result = [];

  for (const item of items) {
    const quantity = Math.max(
      parseNumber(
        item.quantity,
        1
      ),
      1
    );

    let product = null;

    if (
      item.product &&
      mongoose.Types.ObjectId.isValid(
        item.product
      )
    ) {
      product =
        await Product.findById(
          item.product
        )
          .select(
            "_id slug price category"
          )
          .lean();
    }

    if (
      !product &&
      item.slug
    ) {
      product =
        await Product.findOne({
          slug: String(
            item.slug
          ).toLowerCase(),
        })
          .select(
            "_id slug price category"
          )
          .lean();
    }

    if (product) {
      result.push({
        product,
        quantity,
      });
    }
  }

  return result;
};

const validateCoupon = async (
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

    const code = String(
      req.body.code || ""
    )
      .trim()
      .toUpperCase();

    if (!code) {
      return res.status(400).json({
        success: false,
        message:
          "Coupon code is required.",
      });
    }

    if (code.length > 64 || !/^[A-Z0-9_-]+$/.test(code)) {
      return res.status(400).json({ success: false, message: "Enter a valid coupon code." });
    }

    const coupon =
      await Coupon.findOne({
        code,
      });

    if (
      !coupon ||
      !isCouponCurrentlyValid(
        coupon
      )
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Coupon is invalid or expired.",
      });
    }

    const validationCart =
      await buildValidationCart(
        req.body.items
      );

    const hasTargeting =
      coupon.allowedProducts.length >
        0 ||
      coupon.excludedProducts.length >
        0 ||
      coupon.allowedCategories.length >
        0 ||
      coupon.excludedCategories.length >
        0;

    let subtotal = Math.max(
      parseNumber(
        req.body.subtotal,
        0
      ),
      0
    );

    let eligibleSubtotal =
      subtotal;

    if (
      validationCart.length
    ) {
      subtotal =
        validationCart.reduce(
          (sum, item) =>
            sum +
            (Number(
              item.product.price
            ) || 0) *
              item.quantity,
          0
        );

      eligibleSubtotal =
        validationCart
          .filter((item) =>
            couponAppliesToProduct(
              coupon,
              item.product
            )
          )
          .reduce(
            (sum, item) =>
              sum +
              (Number(
                item.product.price
              ) || 0) *
                item.quantity,
            0
          );
    } else if (hasTargeting) {
      return res.status(400).json({
        success: false,
        message:
          "Cart items are required to validate a product/category-specific coupon.",
      });
    }

    if (
      Number(
        coupon.minOrderValue
      ) > 0 &&
      subtotal <
        coupon.minOrderValue
    ) {
      return res.status(400).json({
        success: false,

        message:
          `Minimum order value for this coupon is ${coupon.minOrderValue}.`,
      });
    }

    if (
      eligibleSubtotal <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Coupon does not apply to these cart items.",
      });
    }

    return res.status(200).json({
      success: true,

      message:
        "Coupon is valid.",

      data: {
        coupon:
          serializeCoupon(
            coupon
          ),

        discount:
          calculateDiscount({
            coupon,
            eligibleSubtotal,
          }),
      },
    });
  } catch (error) {
    return sendInternalError(res, error, "Coupon validation failed", "Failed to validate coupon.");
  }
};

const getAdminCoupons = async (
  req,
  res
) => {
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
    } = getPagination(
      req.query
    );

    const filter =
      buildCouponFilter(
        req.query
      );

    const [coupons, total] =
      await Promise.all([
        populateCoupon(
          Coupon.find(filter)
            .sort({
              createdAt: -1,
            })
            .skip(skip)
            .limit(limit)
        ).lean(),

        Coupon.countDocuments(
          filter
        ),
      ]);

    return res.status(200).json({
      success: true,

      count: coupons.length,

      data: coupons.map(
        serializeCoupon
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
        getSafeInternalMessage(error, "Failed to fetch admin coupons."),
    });
  }
};

const getAdminCouponById = async (
  req,
  res
) => {
  try {
    const coupon =
      await populateCoupon(
        Coupon.findById(
          req.params.id
        )
      ).lean();

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message:
          "Coupon not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data:
        serializeCoupon(coupon),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        getSafeInternalMessage(error, "Failed to fetch coupon."),
    });
  }
};

const createCoupon = async (
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

    const payload =
      await buildCouponPayload(
        req.body
      );

    if (
      await Coupon.exists({
        code: payload.code,
      })
    ) {
      return res.status(409).json({
        success: false,
        message:
          "A coupon with this code already exists.",
      });
    }

    const coupon =
      await Coupon.create(
        payload
      );

    return res.status(201).json({
      success: true,

      message:
        "Coupon created successfully.",

      data:
        serializeCoupon(
          coupon
        ),
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Failed to create coupon.",
    });
  }
};

const updateCoupon = async (
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

    const coupon =
      await Coupon.findById(
        req.params.id
      );

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message:
          "Coupon not found.",
      });
    }

    const payload =
      await buildCouponPayload(
        req.body
      );

    if (
      await Coupon.exists({
        code: payload.code,

        _id: {
          $ne: coupon._id,
        },
      })
    ) {
      return res.status(409).json({
        success: false,
        message:
          "A coupon with this code already exists.",
      });
    }

    Object.assign(
      coupon,
      payload
    );

    await coupon.save();

    return res.status(200).json({
      success: true,

      message:
        "Coupon updated successfully.",

      data:
        serializeCoupon(
          coupon
        ),
    });
  } catch (error) {
    return res.status(400).json({
      success: false,

      message:
        error.message ||
        "Failed to update coupon.",
    });
  }
};

const deleteCoupon = async (
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

    const coupon =
      await Coupon.findById(
        req.params.id
      );

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message:
          "Coupon not found.",
      });
    }

    if (
      req.query.hard === "true"
    ) {
      await coupon.deleteOne();

      return res.status(200).json({
        success: true,
        message:
          "Coupon permanently deleted successfully.",
      });
    }

    coupon.isActive = false;

    await coupon.save();

    return res.status(200).json({
      success: true,

      message:
        "Coupon deactivated successfully.",

      data:
        serializeCoupon(
          coupon
        ),
    });
  } catch (error) {
    return res.status(400).json({
      success: false,

      message:
        error.message ||
        "Failed to delete coupon.",
    });
  }
};

module.exports = {
  validateCoupon,
  getAdminCoupons,
  getAdminCouponById,
  createCoupon,
  updateCoupon,
  deleteCoupon,
};
