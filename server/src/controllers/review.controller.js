const mongoose = require("mongoose");

const Review = require("../models/Review");
const Order = require("../models/Order");
const Product = require("../models/Product");
const { uploadOptimizedPublicImage, deletePublicMedia } = require("../services/mediaStorage.service");

const isDatabaseConnected = () =>
  mongoose.connection.readyState === 1;

const cleanText = (value) =>
  typeof value === "string"
    ? value.trim()
    : "";

const uploadReviewImage = async (file) => {
  if (!file) return { type: "none", url: "", publicId: "", posterUrl: "", alt: "" };
  const result = await uploadOptimizedPublicImage(file, {
    folder: "reviews",
    baseName: "review",
    alt: "Darb review",
  });
  return { type: "image", url: result.url, publicId: result.publicId, posterUrl: "", alt: "Darb review" };
};

const parseRating = (value) => {
  const rating = Number(value);

  if (
    !Number.isFinite(rating) ||
    rating < 1 ||
    rating > 5
  ) {
    throw new Error(
      "Rating must be between 1 and 5."
    );
  }

  return rating;
};

const getPagination = (
  query = {},
  defaultLimit = 12
) => {
  const page = Math.max(
    Number(query.page) || 1,
    1
  );

  const limit = Math.min(
    Math.max(
      Number(query.limit) ||
        defaultLimit,
      1
    ),
    50
  );

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

const buildCustomerIdentityConditions = (
  user
) => {
  const conditions = [];

  if (user?._id) {
    conditions.push({
      customer: user._id,
    });
  }

  if (user?.email) {
    conditions.push({
      "customerSnapshot.email":
        String(user.email)
          .trim()
          .toLowerCase(),
    });
  }

  if (user?.phone) {
    conditions.push({
      "customerSnapshot.phone":
        String(user.phone).trim(),
    });
  }

  return conditions;
};

const buildEligibleOrderFilter = (
  user,
  productId = null
) => {
  const identityConditions =
    buildCustomerIdentityConditions(user);

  if (
    identityConditions.length === 0
  ) {
    return null;
  }

  const filter = {
    orderStatus: {
      $ne: "cancelled",
    },

    $or: identityConditions,
  };

  if (productId) {
    filter["items.product"] =
      productId;
  }

  return filter;
};

const findEligibleOrder = async (
  user,
  productId = null
) => {
  const filter =
    buildEligibleOrderFilter(
      user,
      productId
    );

  if (!filter) return null;

  return Order.findOne(filter)
    .sort({
      createdAt: -1,
    })
    .lean();
};

const serializePublicReview = (
  review
) => {
  return {
    _id: review._id,

    displayName:
      review.displayName,

    rating: review.rating,

    text: review.text,

    fragrance: review.product
      ? {
          _id:
            review.product._id ||
            review.product,

          name:
            review.product.name ||
            review.fragranceName ||
            "",

          slug:
            review.product.slug ||
            "",
        }
      : review.fragranceName
        ? {
            _id: null,
            name:
              review.fragranceName,
            slug: "",
          }
        : null,

    source: review.source,

    isVerifiedPurchase:
      Boolean(
        review.isVerifiedPurchase
      ),

    reviewDate:
      review.reviewDate,

    createdAt: review.createdAt,
    media: review.media || { type: "none", url: "" },
  };
};

/* =========================================================
   PUBLIC
========================================================= */

const getPublicReviews = async (
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
          limit:
            Number(req.query.limit) ||
            12,
          total: 0,
          pages: 0,
        },
      });
    }

    const { page, limit, skip } =
      getPagination(req.query, 12);

    const filter = {
      status: "approved",
    };

    const requestedProduct = cleanText(req.query.product || req.query.productId);
    if (requestedProduct) {
      if (mongoose.Types.ObjectId.isValid(requestedProduct)) {
        filter.product = new mongoose.Types.ObjectId(requestedProduct);
      } else {
        const product = await Product.findOne({ slug: requestedProduct.toLowerCase() }).select("_id").lean();
        if (!product) {
          return res.status(200).json({
            success: true,
            data: [],
            pagination: { page, limit, total: 0, pages: 0 },
          });
        }
        filter.product = product._id;
      }
    }

    const [reviews, total, ratingSummary] =
      await Promise.all([
        Review.find(filter)
          .populate(
            "product",
            "name slug"
          )
          .sort({
            reviewDate: -1,
            createdAt: -1,
          })
          .skip(skip)
          .limit(limit)
          .lean(),

        Review.countDocuments(
          filter
        ),
        Review.aggregate([
          { $match: filter },
          {
            $group: {
              _id: null,
              averageRating: {
                $avg: "$rating",
              },
              count: { $sum: 1 },
            },
          },
        ]),
      ]);

    return res.status(200).json({
      success: true,

      count: reviews.length,

      data: reviews.map(
        serializePublicReview
      ),

      summary: {
        averageRating:
          ratingSummary[0]
            ?.averageRating || 0,
        count:
          ratingSummary[0]?.count || 0,
      },

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
        error.message ||
        "Failed to load reviews.",
    });
  }
};

/* =========================================================
   CUSTOMER ELIGIBILITY
========================================================= */

const getReviewEligibility = async (
  req,
  res
) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message:
          "Database is unavailable.",
      });
    }

    const identityConditions =
      buildCustomerIdentityConditions(
        req.user
      );

    if (
      identityConditions.length === 0
    ) {
      return res.status(200).json({
        success: true,
        data: {
          eligible: false,
          canReview: false,
          hasOrder: false,
          existingReview: null,
          purchasedProducts: [],
        },
      });
    }

    const orders =
      await Order.find({
        orderStatus: {
          $ne: "cancelled",
        },

        $or: identityConditions,
      })
        .select(
          "orderNumber orderStatus items.product items.productSnapshot createdAt"
        )
        .sort({
          createdAt: -1,
        })
        .lean();

    const existingReview =
      await Review.findOne({
        customer: req.user._id,

        source: "customer",

        status: {
          $in: [
            "pending",
            "approved",
          ],
        },
      })
        .populate(
          "product",
          "name slug"
        )
        .sort({
          createdAt: -1,
        })
        .lean();

    const productMap = new Map();

    orders.forEach((order) => {
      (order.items || []).forEach(
        (item) => {
          const productId =
            item.product
              ? String(item.product)
              : "";

          if (!productId) return;

          if (
            !productMap.has(
              productId
            )
          ) {
            productMap.set(
              productId,
              {
                _id: productId,

                name:
                  item
                    .productSnapshot
                    ?.name || "",

                slug:
                  item
                    .productSnapshot
                    ?.slug || "",
              }
            );
          }
        }
      );
    });

    const hasOrder =
      orders.length > 0;

    const canReview =
      hasOrder &&
      !existingReview;

    return res.status(200).json({
      success: true,

      data: {
        eligible: hasOrder,

        hasOrder,

        canReview,

        existingReview:
          existingReview
            ? {
                _id:
                  existingReview._id,

                status:
                  existingReview.status,

                rating:
                  existingReview.rating,

                text:
                  existingReview.text,

                fragrance:
                  existingReview
                    .product
                    ? {
                        _id:
                          existingReview
                            .product
                            ._id,

                        name:
                          existingReview
                            .product
                            .name,

                        slug:
                          existingReview
                            .product
                            .slug,
                      }
                    : existingReview.fragranceName
                      ? {
                          name:
                            existingReview.fragranceName,
                        }
                      : null,
              }
            : null,

        purchasedProducts:
          Array.from(
            productMap.values()
          ),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to check review eligibility.",
    });
  }
};

/* =========================================================
   CUSTOMER REVIEW
========================================================= */

const createCustomerReview = async (
  req,
  res
) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message:
          "Database is unavailable.",
      });
    }

    const existingReview =
      await Review.findOne({
        customer: req.user._id,

        source: "customer",

        status: {
          $in: [
            "pending",
            "approved",
          ],
        },
      });

    if (existingReview) {
      return res.status(409).json({
        success: false,

        message:
          existingReview.status ===
          "pending"
            ? "You already have a review waiting for approval."
            : "You already have an approved review.",
      });
    }

    const rating = parseRating(
      req.body.rating
    );

    const text = cleanText(
      req.body.text
    );

    if (text.length < 5) {
      return res.status(400).json({
        success: false,
        message:
          "Please write a little more about your experience.",
      });
    }

    const requestedProductId =
      cleanText(
        req.body.productId ||
          req.body.product
      );

    let product = null;

    if (requestedProductId) {
      if (
        !mongoose.Types.ObjectId.isValid(
          requestedProductId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid fragrance.",
        });
      }

      product =
        await Product.findById(
          requestedProductId
        )
          .select(
            "_id name slug"
          )
          .lean();

      if (!product) {
        return res.status(404).json({
          success: false,
          message:
            "Fragrance not found.",
        });
      }
    }

    /*
      If a fragrance is selected, this
      additionally proves that exact
      fragrance exists in the customer's
      order history.
    */
    const eligibleOrder =
      await findEligibleOrder(
        req.user,
        product?._id || null
      );

    if (!eligibleOrder) {
      return res.status(403).json({
        success: false,

        message: product
          ? "You can only review a fragrance that appears in one of your Darb orders."
          : "You need a Darb order before you can write a review.",
      });
    }

    const media = await uploadReviewImage(req.file);

    const review =
      await Review.create({
        customer: req.user._id,

        order:
          eligibleOrder._id,

        product:
          product?._id || null,

        displayName:
          cleanText(
            req.body.displayName
          ) ||
          cleanText(req.user.name) ||
          "Darb Customer",

        rating,

        text,

        fragranceName:
          product?.name || "",

        source: "customer",

        status: "pending",

        isVerifiedPurchase: true,

        reviewDate: new Date(),
        media,
      });

    return res.status(201).json({
      success: true,

      message:
        "Thank you. Your review has been submitted and is waiting for approval.",

      data: review,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,

      message:
        error.message ||
        "Failed to submit review.",
    });
  }
};

const getMyReview = async (
  req,
  res
) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message:
          "Database is unavailable.",
      });
    }

    const review =
      await Review.findOne({
        customer: req.user._id,
        source: "customer",
      })
        .populate(
          "product",
          "name slug"
        )
        .sort({
          createdAt: -1,
        })
        .lean();

    return res.status(200).json({
      success: true,
      data: review || null,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,

      message:
        error.message ||
        "Failed to load your review.",
    });
  }
};

/* =========================================================
   ADMIN LIST
========================================================= */

const getAdminReviews = async (
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
          limit:
            Number(req.query.limit) ||
            20,
          total: 0,
          pages: 0,
        },
      });
    }

    const { page, limit, skip } =
      getPagination(req.query, 20);

    const filter = {};

    if (req.query.status) {
      filter.status =
        req.query.status;
    }

    if (req.query.source) {
      filter.source =
        req.query.source;
    }

    if (
      req.query.verified ===
      "true"
    ) {
      filter.isVerifiedPurchase =
        true;
    }

    if (
      req.query.verified ===
      "false"
    ) {
      filter.isVerifiedPurchase =
        false;
    }

    if (
      cleanText(req.query.search)
    ) {
      const escaped =
        cleanText(
          req.query.search
        ).replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );

      const regex = new RegExp(
        escaped,
        "i"
      );

      filter.$or = [
        {
          displayName: regex,
        },
        {
          text: regex,
        },
        {
          fragranceName: regex,
        },
      ];
    }

    const [reviews, total] =
      await Promise.all([
        Review.find(filter)
          .populate(
            "customer",
            "name email phone"
          )
          .populate(
            "order",
            "orderNumber orderStatus createdAt"
          )
          .populate(
            "product",
            "name slug"
          )
          .populate(
            "approvedBy",
            "name email"
          )
          .sort({
            createdAt: -1,
          })
          .skip(skip)
          .limit(limit)
          .lean(),

        Review.countDocuments(
          filter
        ),
      ]);

    return res.status(200).json({
      success: true,

      count: reviews.length,

      data: reviews,

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
        error.message ||
        "Failed to load admin reviews.",
    });
  }
};

/* =========================================================
   ADMIN MANUAL REVIEW
========================================================= */

const createAdminReview = async (
  req,
  res
) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message:
          "Database is unavailable.",
      });
    }

    const displayName =
      cleanText(
        req.body.displayName
      );

    const text = cleanText(
      req.body.text
    );

    if (!displayName) {
      return res.status(400).json({
        success: false,
        message:
          "Display name is required.",
      });
    }

    if (text.length < 5) {
      return res.status(400).json({
        success: false,
        message:
          "Review text is required.",
      });
    }

    const rating = parseRating(
      req.body.rating
    );

    const requestedProductId =
      cleanText(
        req.body.productId ||
          req.body.product
      );

    let product = null;

    if (requestedProductId) {
      if (
        !mongoose.Types.ObjectId.isValid(
          requestedProductId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid fragrance.",
        });
      }

      product =
        await Product.findById(
          requestedProductId
        )
          .select(
            "_id name slug"
          )
          .lean();

      if (!product) {
        return res.status(404).json({
          success: false,
          message:
            "Fragrance not found.",
        });
      }
    }

    const requestedStatus =
      [
        "pending",
        "approved",
        "hidden",
      ].includes(req.body.status)
        ? req.body.status
        : "approved";

    const reviewDate =
      req.body.reviewDate
        ? new Date(
            req.body.reviewDate
          )
        : new Date();

    if (
      Number.isNaN(
        reviewDate.getTime()
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid review date.",
      });
    }

    const review =
      await Review.create({
        customer: null,

        order: null,

        product:
          product?._id || null,

        displayName,

        rating,

        text,

        fragranceName:
          product?.name ||
          cleanText(
            req.body.fragranceName
          ),

        source: "admin",

        status: requestedStatus,

        /*
          Manual admin testimonials
          must never automatically
          pretend to be verified.
        */
        isVerifiedPurchase: false,

        reviewDate,

        approvedAt:
          requestedStatus ===
          "approved"
            ? new Date()
            : null,

        approvedBy:
          requestedStatus ===
          "approved"
            ? req.user._id
            : null,
        media: { type: "none", url: "", publicId: "", posterUrl: "", alt: "" },
      });

    return res.status(201).json({
      success: true,

      message:
        "Manual review created successfully.",

      data: review,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,

      message:
        error.message ||
        "Failed to create review.",
    });
  }
};

/* =========================================================
   ADMIN UPDATE
========================================================= */

const updateAdminReview = async (
  req,
  res
) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message:
          "Database is unavailable.",
      });
    }

    const review = await Review.findById(req.params.id).select("+media.publicId");

    if (!review) {
      return res.status(404).json({
        success: false,
        message:
          "Review not found.",
      });
    }

    if (
      req.body.displayName !==
      undefined
    ) {
      const displayName =
        cleanText(
          req.body.displayName
        );

      if (!displayName) {
        return res.status(400).json({
          success: false,
          message:
            "Display name cannot be empty.",
        });
      }

      review.displayName =
        displayName;
    }

    if (
      req.body.rating !==
      undefined
    ) {
      review.rating =
        parseRating(
          req.body.rating
        );
    }

    if (
      req.body.text !== undefined
    ) {
      const text = cleanText(
        req.body.text
      );

      if (text.length < 5) {
        return res.status(400).json({
          success: false,
          message:
            "Review text is too short.",
        });
      }

      review.text = text;
    }

    if (
      req.body.productId !==
        undefined ||
      req.body.product !== undefined
    ) {
      const productId =
        cleanText(
          req.body.productId ||
            req.body.product
        );

      if (!productId) {
        review.product = null;

        if (
          review.source ===
          "admin"
        ) {
          review.fragranceName =
            cleanText(
              req.body
                .fragranceName
            );
        }
      } else {
        if (
          !mongoose.Types.ObjectId.isValid(
            productId
          )
        ) {
          return res
            .status(400)
            .json({
              success: false,
              message:
                "Invalid fragrance.",
            });
        }

        const product =
          await Product.findById(
            productId
          )
            .select("_id name")
            .lean();

        if (!product) {
          return res
            .status(404)
            .json({
              success: false,
              message:
                "Fragrance not found.",
            });
        }

        review.product =
          product._id;

        review.fragranceName =
          product.name;
      }
    } else if (
      review.source === "admin" &&
      req.body.fragranceName !==
        undefined
    ) {
      review.fragranceName =
        cleanText(
          req.body.fragranceName
        );
    }

    if (
      req.body.reviewDate !==
      undefined
    ) {
      const date = new Date(
        req.body.reviewDate
      );

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid review date.",
        });
      }

      review.reviewDate = date;
    }

    if (
      req.body.status !== undefined
    ) {
      const allowedStatuses = [
        "pending",
        "approved",
        "hidden",
      ];

      if (
        !allowedStatuses.includes(
          req.body.status
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid review status.",
        });
      }

      review.status =
        req.body.status;

      if (
        req.body.status ===
        "approved"
      ) {
        review.approvedAt =
          new Date();

        review.approvedBy =
          req.user._id;
      } else {
        review.approvedAt = null;
        review.approvedBy = null;
      }
    }

    /*
      IMPORTANT:
      isVerifiedPurchase is deliberately
      not editable here.

      Customer reviews earn it from
      real order verification only.
    */

    await review.save();

    const populated =
      await Review.findById(
        review._id
      )
        .populate(
          "customer",
          "name email phone"
        )
        .populate(
          "order",
          "orderNumber orderStatus"
        )
        .populate(
          "product",
          "name slug"
        )
        .lean();

    return res.status(200).json({
      success: true,

      message:
        "Review updated successfully.",

      data: populated,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,

      message:
        error.message ||
        "Failed to update review.",
    });
  }
};

/* =========================================================
   ADMIN DELETE
========================================================= */

const deleteAdminReview = async (
  req,
  res
) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message:
          "Database is unavailable.",
      });
    }

    const review = await Review.findById(req.params.id).select("+media.publicId");

    if (!review) {
      return res.status(404).json({
        success: false,
        message:
          "Review not found.",
      });
    }

    await review.deleteOne();
    if (review.media?.type === "image" && review.media.publicId) await deletePublicMedia(review.media.publicId).catch(() => {});

    return res.status(200).json({
      success: true,
      message:
        "Review deleted successfully.",
    });
  } catch (error) {
    return res.status(400).json({
      success: false,

      message:
        error.message ||
        "Failed to delete review.",
    });
  }
};

module.exports = {
  getPublicReviews,

  getReviewEligibility,
  createCustomerReview,
  getMyReview,

  getAdminReviews,
  createAdminReview,
  updateAdminReview,
  deleteAdminReview,
};
