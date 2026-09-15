const { getSafeInternalMessage } = require("../utils/httpError");
const mongoose = require("mongoose");
const Product = require("../models/Product");
const Category = require("../models/Category");
const Order = require("../models/Order");
const Waitlist = require("../models/Waitlist");
const Coupon = require("../models/Coupon");
const Bundle = require("../models/Bundle");
const Offer = require("../models/Offer");
const User = require("../models/User");
const Review = require("../models/Review");

const isDatabaseConnected = () => mongoose.connection.readyState === 1;

const emptyDashboardData = {
  summary: {
    totalRevenue: 0,
    totalOrders: 0,
    pendingOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
    totalProducts: 0,
    activeProducts: 0,
    placeholderProducts: 0,
    totalCategories: 0,
    waitlistCount: 0,
    activeCoupons: 0,
    activeOffers: 0,
    activeBundles: 0,
    totalCustomers: 0,
    paymentProofsToReview: 0,
    lowStockVariants: 0,
    pendingReviews: 0,
  },
  recentOrders: [],
  ordersByStatus: [],
  paymentByStatus: [],
  topProducts: [],
  categoryPerformance: [],
  waitlistDemand: [],
  couponUsage: [],
};

const getAdminDashboard = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database is unavailable.",
      });
    }

    const [
      totalOrders,
      pendingOrders,
      deliveredOrders,
      cancelledOrders,
      totalProducts,
      activeProducts,
      placeholderProducts,
      totalCategories,
      waitlistCount,
      activeCoupons,
      activeOffers,
      activeBundles,
      totalCustomers,
      paymentProofsToReview,
      lowStockResult,
      pendingReviews,
      revenueResult,
      recentOrders,
      ordersByStatus,
      paymentByStatus,
      topProducts,
      categoryPerformance,
      waitlistDemand,
      couponUsage,
    ] = await Promise.all([
      Order.countDocuments({}),
      Order.countDocuments({ orderStatus: "pending" }),
      Order.countDocuments({ orderStatus: "delivered" }),
      Order.countDocuments({ orderStatus: "cancelled" }),

      Product.countDocuments({}),
      Product.countDocuments({ isActive: true }),
      Product.countDocuments({ isPlaceholder: true }),

      Category.countDocuments({}),

      Waitlist.countDocuments({ status: { $in: ["waiting", "notified", "contacted"] } }),

      Coupon.countDocuments({ isActive: true }),
      Offer.countDocuments({ isActive: true }),
      Bundle.countDocuments({ isActive: true }),

      User.countDocuments({ role: "customer" }),
      Order.countDocuments({ "paymentProof.status": "submitted", orderStatus: { $ne: "cancelled" } }),
      Product.aggregate([
        { $match: { isActive: true, isPlaceholder: { $ne: true } } },
        { $project: {
          count: {
            $cond: [
              { $gt: [{ $size: { $ifNull: ["$variants", []] } }, 0] },
              {
                $size: {
                  $filter: {
                    input: "$variants",
                    as: "variant",
                    cond: {
                      $and: [
                        { $eq: ["$$variant.isActive", true] },
                        { $gt: ["$$variant.stock", 0] },
                        { $lte: ["$$variant.stock", "$lowStockThreshold"] },
                      ],
                    },
                  },
                },
              },
              { $cond: [{ $and: [{ $gt: ["$stock", 0] }, { $lte: ["$stock", "$lowStockThreshold"] }] }, 1, 0] },
            ],
          },
        } },
        { $group: { _id: null, total: { $sum: "$count" } } },
      ]),
      Review.countDocuments({ status: "pending" }),

      Order.aggregate([
        {
          $match: {
            orderStatus: { $ne: "cancelled" },
            paymentStatus: "paid",
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$total" },
          },
        },
      ]),

      Order.find({})
        .sort({ createdAt: -1 })
        .limit(8)
        .select(
          "orderNumber customerSnapshot total paymentMethod paymentStatus orderStatus createdAt items"
        )
        .lean(),

      Order.aggregate([
        {
          $group: {
            _id: "$orderStatus",
            count: { $sum: 1 },
            revenue: {
              $sum: {
                $cond: [
                  { $and: [{ $eq: ["$paymentStatus", "paid"] }, { $ne: ["$orderStatus", "cancelled"] }] },
                  "$total",
                  0,
                ],
              },
            },
          },
        },
        {
          $sort: { count: -1 },
        },
      ]),

      Order.aggregate([
        {
          $group: {
            _id: "$paymentStatus",
            count: { $sum: 1 },
            revenue: {
              $sum: {
                $cond: [
                  { $and: [{ $eq: ["$paymentStatus", "paid"] }, { $ne: ["$orderStatus", "cancelled"] }] },
                  "$total",
                  0,
                ],
              },
            },
          },
        },
        {
          $sort: { count: -1 },
        },
      ]),

      Order.aggregate([
        {
          $match: {
            orderStatus: { $ne: "cancelled" },
            paymentStatus: "paid",
          },
        },
        {
          $unwind: "$items",
        },
        {
          $group: {
            _id: "$items.productSnapshot.slug",
            name: { $first: "$items.productSnapshot.name" },
            slug: { $first: "$items.productSnapshot.slug" },
            image: { $first: "$items.productSnapshot.image" },
            quantitySold: { $sum: "$items.quantity" },
            revenue: { $sum: "$items.lineTotal" },
          },
        },
        {
          $sort: {
            quantitySold: -1,
            revenue: -1,
          },
        },
        {
          $limit: 8,
        },
      ]),

      Order.aggregate([
        {
          $match: {
            orderStatus: { $ne: "cancelled" },
            paymentStatus: "paid",
          },
        },
        {
          $unwind: "$items",
        },
        {
          $group: {
            _id: "$items.productSnapshot.categorySlug",
            categoryName: { $first: "$items.productSnapshot.categoryName" },
            categorySlug: { $first: "$items.productSnapshot.categorySlug" },
            quantitySold: { $sum: "$items.quantity" },
            revenue: { $sum: "$items.lineTotal" },
          },
        },
        {
          $sort: {
            revenue: -1,
          },
        },
      ]),

      Waitlist.aggregate([
        {
          $group: {
            _id: "$productSnapshot.slug",
            productName: { $first: "$productSnapshot.name" },
            productSlug: { $first: "$productSnapshot.slug" },
            image: { $first: "$productSnapshot.image" },
            count: { $sum: 1 },
          },
        },
        {
          $sort: {
            count: -1,
          },
        },
        {
          $limit: 8,
        },
      ]),

      Order.aggregate([
        {
          $match: {
            couponCode: { $exists: true, $ne: "" },
            orderStatus: { $ne: "cancelled" },
            paymentStatus: "paid",
          },
        },
        {
          $group: {
            _id: "$couponCode",
            uses: { $sum: 1 },
            revenue: { $sum: "$total" },
            discountGiven: { $sum: "$discountTotal" },
          },
        },
        {
          $sort: {
            uses: -1,
          },
        },
        {
          $limit: 8,
        },
      ]),
    ]);

    const totalRevenue = revenueResult[0]?.totalRevenue || 0;

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalRevenue,
          totalOrders,
          pendingOrders,
          deliveredOrders,
          cancelledOrders,
          totalProducts,
          activeProducts,
          placeholderProducts,
          totalCategories,
          waitlistCount,
          activeCoupons,
          activeOffers,
          activeBundles,
          totalCustomers,
          paymentProofsToReview,
          lowStockVariants: lowStockResult[0]?.total || 0,
          pendingReviews,
        },
        recentOrders,
        ordersByStatus,
        paymentByStatus,
        topProducts,
        categoryPerformance,
        waitlistDemand,
        couponUsage,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: getSafeInternalMessage(error, "Failed to load admin dashboard."),
    });
  }
};

module.exports = {
  getAdminDashboard,
};
