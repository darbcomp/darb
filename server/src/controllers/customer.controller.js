const mongoose = require("mongoose");
const User = require("../models/User");
const Order = require("../models/Order");
const { getSafeInternalMessage } = require("../utils/httpError");
const { formatEgyptPhoneForDisplay, normalizeEgyptPhone } = require("../utils/normalizePhone");

const isDatabaseConnected = () => mongoose.connection.readyState === 1;
const escapeRegex = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildCustomerPipeline = ({ query = {}, customerKey = "", includeOrders = false } = {}) => {
  const userCollection = User.collection.name;
  const normalizedSearch = String(query.search || "").trim();
  const pipeline = [
    { $match: { role: "customer" } },
    {
      $project: {
        identityKey: {
          $cond: [
            { $gt: [{ $strLenCP: { $ifNull: ["$phone", ""] } }, 0] },
            { $concat: ["phone:", "$phone"] },
            { $concat: ["user:", { $toString: "$_id" }] },
          ],
        },
        registeredUser: {
          _id: "$_id", name: "$name", phone: "$phone", email: "$email",
          isActive: "$isActive", marketingConsent: "$marketingConsent", createdAt: "$createdAt",
        },
        order: { $literal: null },
      },
    },
    {
      $unionWith: {
        coll: Order.collection.name,
        pipeline: [
          { $lookup: { from: userCollection, localField: "customer", foreignField: "_id", as: "linkedUser" } },
          { $set: { linkedUser: { $arrayElemAt: ["$linkedUser", 0] } } },
          {
            $project: {
              identityKey: {
                $cond: [
                  { $gt: [{ $strLenCP: { $ifNull: ["$linkedUser.phone", ""] } }, 0] },
                  { $concat: ["phone:", "$linkedUser.phone"] },
                  {
                    $cond: [
                      { $ne: ["$customer", null] },
                      { $concat: ["user:", { $toString: "$customer" }] },
                      { $concat: ["phone:", "$customerSnapshot.phone"] },
                    ],
                  },
                ],
              },
              registeredUser: { $literal: null },
              order: {
                _id: "$_id", orderNumber: "$orderNumber", createdAt: "$createdAt", total: "$total",
                orderStatus: "$orderStatus", paymentMethod: "$paymentMethod", paymentStatus: "$paymentStatus",
                customerName: "$customerSnapshot.name", phone: "$customerSnapshot.phone",
                email: "$customerSnapshot.email", marketingConsent: "$marketingConsent",
              },
            },
          },
        ],
      },
    },
    { $match: { identityKey: { $ne: "phone:" } } },
    {
      $group: {
        _id: "$identityKey",
        registeredUsers: { $push: "$registeredUser" },
        orderRows: { $push: "$order" },
      },
    },
    {
      $set: {
        registeredUsers: { $filter: { input: "$registeredUsers", as: "user", cond: { $ne: ["$$user", null] } } },
        orders: { $filter: { input: "$orderRows", as: "order", cond: { $ne: ["$$order", null] } } },
      },
    },
    {
      $set: {
        registeredUser: { $arrayElemAt: ["$registeredUsers", 0] },
        latestOrder: {
          $reduce: {
            input: "$orders",
            initialValue: null,
            in: {
              $cond: [
                { $or: [{ $eq: ["$$value", null] }, { $gt: ["$$this.createdAt", "$$value.createdAt"] }] },
                "$$this",
                "$$value",
              ],
            },
          },
        },
      },
    },
    {
      $set: {
        registered: { $ne: ["$registeredUser", null] },
        name: { $ifNull: ["$registeredUser.name", "$latestOrder.customerName"] },
        phone: { $ifNull: ["$registeredUser.phone", "$latestOrder.phone"] },
        email: { $ifNull: ["$registeredUser.email", "$latestOrder.email"] },
        isActive: { $ifNull: ["$registeredUser.isActive", true] },
        marketingConsent: {
          $or: [
            { $eq: ["$registeredUser.marketingConsent.granted", true] },
            { $anyElementTrue: { $map: { input: "$orders", as: "order", in: { $eq: ["$$order.marketingConsent.granted", true] } } } },
          ],
        },
        orderCount: { $size: "$orders" },
        totalSpent: {
          $reduce: {
            input: "$orders", initialValue: 0,
            in: { $add: ["$$value", { $cond: [{ $ne: ["$$this.orderStatus", "cancelled"] }, "$$this.total", 0] }] },
          },
        },
        firstOrder: { $min: "$orders.createdAt" },
        lastOrder: { $max: "$orders.createdAt" },
      },
    },
  ];

  if (customerKey) pipeline.push({ $match: { _id: customerKey } });
  if (normalizedSearch) {
    const regex = new RegExp(escapeRegex(normalizedSearch), "i");
    const normalizedPhoneSearch = normalizeEgyptPhone(normalizedSearch);
    const matches = [{ name: regex }, { phone: regex }, { email: regex }];
    if (normalizedPhoneSearch) matches.push({ phone: new RegExp(escapeRegex(normalizedPhoneSearch), "i") });
    pipeline.push({ $match: { $or: matches } });
  }
  if (query.type === "registered") pipeline.push({ $match: { registered: true } });
  if (query.type === "guest") pipeline.push({ $match: { registered: false } });
  if (query.marketingConsent === "true") pipeline.push({ $match: { marketingConsent: true } });
  if (query.marketingConsent === "false") pipeline.push({ $match: { marketingConsent: false } });
  if (query.hasOrders === "true") pipeline.push({ $match: { orderCount: { $gt: 0 } } });
  if (query.hasOrders === "false") pipeline.push({ $match: { orderCount: 0 } });

  pipeline.push({ $sort: { lastOrder: -1, name: 1 } });
  if (!includeOrders) pipeline.push({ $unset: ["orders", "orderRows", "registeredUsers", "registeredUser", "latestOrder"] });
  return pipeline;
};

const serializeCustomer = (customer) => ({
  customerKey: customer._id,
  name: customer.name || "Customer",
  phone: formatEgyptPhoneForDisplay(customer.phone || ""),
  email: customer.email || "",
  registered: Boolean(customer.registered),
  isActive: customer.isActive !== false,
  marketingConsent: Boolean(customer.marketingConsent),
  orderCount: Number(customer.orderCount) || 0,
  totalSpent: Number(customer.totalSpent) || 0,
  firstOrder: customer.firstOrder || null,
  lastOrder: customer.lastOrder || null,
  orders: (customer.orders || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((order) => ({
    orderNumber: order.orderNumber, createdAt: order.createdAt, total: order.total,
    orderStatus: order.orderStatus, paymentMethod: order.paymentMethod, paymentStatus: order.paymentStatus,
  })),
});

const getAdminCustomers = async (req, res) => {
  try {
    if (!isDatabaseConnected()) return res.status(200).json({ success: true, data: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } });
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
    const pipeline = buildCustomerPipeline({ query: req.query });
    pipeline.push({ $facet: { data: [{ $skip: (page - 1) * limit }, { $limit: limit }], count: [{ $count: "total" }] } });
    const [result] = await User.aggregate(pipeline);
    const total = result?.count?.[0]?.total || 0;
    return res.status(200).json({ success: true, data: (result?.data || []).map(serializeCustomer), pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    return res.status(500).json({ success: false, message: getSafeInternalMessage(error, "Failed to load customers.") });
  }
};

const getAdminCustomer = async (req, res) => {
  try {
    if (!isDatabaseConnected()) return res.status(404).json({ success: false, message: "Customer not found." });
    const [customer] = await User.aggregate(buildCustomerPipeline({ customerKey: decodeURIComponent(req.params.key), includeOrders: true }));
    if (!customer) return res.status(404).json({ success: false, message: "Customer not found." });
    return res.status(200).json({ success: true, data: serializeCustomer(customer) });
  } catch (error) {
    return res.status(500).json({ success: false, message: getSafeInternalMessage(error, "Failed to load customer.") });
  }
};

module.exports = { buildCustomerPipeline, getAdminCustomer, getAdminCustomers, serializeCustomer };
