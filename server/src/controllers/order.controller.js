const mongoose = require("mongoose");

const Order = require("../models/Order");
const Product = require("../models/Product");
const Coupon = require("../models/Coupon");
const StoreSettings = require("../models/StoreSettings");
const OrderCounter = require("../models/OrderCounter");

const {
  sendOrderPlacedEmails,
  sendOrderStatusEmail,
} = require("../services/orderEmail.service");

const {
  calculateCartPricing,
  incrementDiscountUsage,
  decrementDiscountUsage,
} = require("../utils/calculateCart");

const isDatabaseConnected = () =>
  mongoose.connection.readyState === 1;

const ORDER_NUMBER_BASE = 1000;

const getNextOrderNumber = async (session = null) => {
  const options = {
    upsert: true,
    returnDocument: "after",
  };

  if (session) {
    options.session = session;
  }

  const counter = await OrderCounter.findOneAndUpdate(
    { _id: "orders" },
    { $inc: { seq: 1 } },
    options
  );

  const sequence =
    ORDER_NUMBER_BASE + Number(counter.seq || 0);

  return `DARB-${sequence}`;
};

const orderStatuses = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

const paymentStatuses = [
  "pending",
  "paid",
  "failed",
  "refunded",
];

const paymentMethodKeys = {
  cash_on_delivery: "cashOnDelivery",
  instapay: "instapay",
  vodafone_cash: "vodafoneCash",
  paymob_card: "paymobCard",
};

const getMainImage = (product) =>
  product.images?.find(
    (image) => image.isMain
  ) || product.images?.[0];

const getSettings = async (session = null) => {
  const query = StoreSettings.findOne({
    singletonKey: "main",
  });

  if (session) {
    query.session(session);
  }

  const settings = await query;

  return {
    delivery: {
      defaultFee:
        Number(
          settings?.delivery?.defaultFee
        ) || 0,

      freeDeliveryThreshold:
        Number(
          settings?.delivery
            ?.freeDeliveryThreshold
        ) || 0,
    },

    paymentMethods:
      settings?.paymentMethods || {
        cashOnDelivery: {
          enabled: true,
        },

        instapay: {
          enabled: false,
        },

        vodafoneCash: {
          enabled: false,
        },

        paymobCard: {
          enabled: false,
        },
      },

    orderSettings: {
      allowGuestCheckout:
        settings?.orderSettings
          ?.allowGuestCheckout !== false,
    },
  };
};

const getBaseDeliveryFee = (
  subtotal,
  settings
) => {
  const defaultFee =
    Number(
      settings.delivery.defaultFee
    ) || 0;

  const freeDeliveryThreshold =
    Number(
      settings.delivery
        .freeDeliveryThreshold
    ) || 0;

  if (
    freeDeliveryThreshold > 0 &&
    subtotal >= freeDeliveryThreshold
  ) {
    return 0;
  }

  return defaultFee;
};

const ensurePaymentMethodAllowed = (
  paymentMethod,
  settings
) => {
  const method =
    paymentMethod ||
    "cash_on_delivery";

  const settingsKey =
    paymentMethodKeys[method];

  if (!settingsKey) {
    throw new Error(
      "Invalid payment method."
    );
  }

  if (
    !settings.paymentMethods
      ?.[settingsKey]?.enabled
  ) {
    throw new Error(
      "The selected payment method is currently unavailable."
    );
  }

  return method;
};

const buildProductSnapshot = (
  product
) => {
  const image =
    getMainImage(product);

  return {
    name: product.name,

    slug: product.slug,

    image:
      image?.url || "",

    categoryName:
      product.category?.name ||
      product.categorySnapshot?.name ||
      "",

    categorySlug:
      product.category?.slug ||
      product.categorySnapshot?.slug ||
      "",

    sizeLabel:
      product.sizeLabel || "",

    sizeMl:
      product.sizeMl || 0,
  };
};

const buildSafeOrderItem = ({
  product,
  quantity,
  variant,
}) => {
  const unitPrice =
    Number(product.price) || 0;

  return {
    product:
      product._id,

    productDoc:
      product,

    productSnapshot:
      buildProductSnapshot(product),

    variant:
      variant || undefined,

    quantity,

    unitPrice,

    lineTotal:
      unitPrice * quantity,
  };
};

const findProductForOrderItem = async (
  item,
  session = null
) => {
  let query = null;

  if (
    item.product &&
    mongoose.Types.ObjectId.isValid(
      item.product
    )
  ) {
    query =
      Product.findById(
        item.product
      );
  } else if (item.slug) {
    query =
      Product.findOne({
        slug: String(item.slug)
          .trim()
          .toLowerCase(),
      });
  }

  if (!query) {
    return null;
  }

  query.populate(
    "category",
    "name slug"
  );

  if (session) {
    query.session(session);
  }

  return query;
};

const validateOrderItems = async (
  items = [],
  session = null
) => {
  if (
    !Array.isArray(items) ||
    !items.length
  ) {
    throw new Error(
      "Order items are required."
    );
  }

  const validatedItems = [];

  for (const item of items) {
    const quantity =
      Math.floor(
        Number(item.quantity) || 0
      );

    if (quantity <= 0) {
      throw new Error(
        "Each order item must have a valid quantity."
      );
    }

    const product =
      await findProductForOrderItem(
        item,
        session
      );

    if (!product) {
      throw new Error(
        `Product not found: ${
          item.name ||
          item.slug ||
          ""
        }`
      );
    }

    if (
      !product.isActive ||
      product.isPlaceholder
    ) {
      throw new Error(
        `${product.name} is not available for purchase.`
      );
    }

    if (
      Number(product.price) <= 0
    ) {
      throw new Error(
        `${product.name} does not have a valid price yet.`
      );
    }

    if (
      Number(product.stock) <
      quantity
    ) {
      throw new Error(
        `${product.name} does not have enough stock.`
      );
    }

    validatedItems.push(
      buildSafeOrderItem({
        product,
        quantity,
        variant:
          item.variant,
      })
    );
  }

  return validatedItems;
};

const getSubtotal = (
  items = []
) =>
  items.reduce(
    (sum, item) =>
      sum +
      (Number(
        item.lineTotal
      ) || 0),
    0
  );

const buildPricingForItems = async ({
  items,
  couponCode,
  session = null,
}) => {
  const subtotal =
    getSubtotal(items);

  const settings =
    await getSettings(session);

  const baseDeliveryFee =
    getBaseDeliveryFee(
      subtotal,
      settings
    );

  const pricing =
    await calculateCartPricing({
      items,
      couponCode,
      baseDeliveryFee,
      session,
    });

  return {
    pricing,
    settings,
  };
};

const serializePreviewItems = (
  items = []
) =>
  items.map((item) => ({
    product:
      item.product,

    productSnapshot:
      item.productSnapshot,

    variant:
      item.variant,

    quantity:
      item.quantity,

    unitPrice:
      item.unitPrice,

    lineTotal:
      item.lineTotal,
  }));

const buildStoredDiscounts = (
  discounts = []
) =>
  discounts.map(
    (discount) => ({
      sourceType:
        discount.sourceType,

      sourceId:
        discount.sourceId ||
        null,

      name:
        discount.name ||
        discount.title ||
        discount.code ||
        "Discount",

      code:
        discount.code ||
        "",

      amount:
        Number(
          discount.amount
        ) || 0,
    })
  );

const validateCustomerAndAddress = ({
  customer,
  shippingAddress,
}) => {
  if (
    !customer?.name?.trim()
  ) {
    throw new Error(
      "Customer name is required."
    );
  }

  if (
    !customer?.phone?.trim()
  ) {
    throw new Error(
      "Customer phone is required."
    );
  }

  if (
    !shippingAddress
      ?.governorate
      ?.trim()
  ) {
    throw new Error(
      "Governorate is required."
    );
  }

  if (
    !shippingAddress
      ?.city
      ?.trim()
  ) {
    throw new Error(
      "City is required."
    );
  }

  if (
    !shippingAddress
      ?.street
      ?.trim()
  ) {
    throw new Error(
      "Street address is required."
    );
  }
};

const enforceCouponPerCustomerLimit =
  async ({
    pricing,
    userId,
    customer,
    session,
  }) => {
    const appliedCoupon =
      pricing.discounts.find(
        (discount) =>
          discount.sourceType ===
            "coupon" &&
          discount.sourceId
      );

    if (!appliedCoupon) {
      return;
    }

    const couponQuery =
      Coupon.findById(
        appliedCoupon.sourceId
      );

    if (session) {
      couponQuery.session(
        session
      );
    }

    const coupon =
      await couponQuery;

    if (
      !coupon ||
      Number(
        coupon.perCustomerLimit
      ) <= 0
    ) {
      return;
    }

    const identityConditions = [];

    if (userId) {
      identityConditions.push({
        customer:
          userId,
      });
    }

    if (
      customer.email?.trim()
    ) {
      identityConditions.push({
        "customerSnapshot.email":
          customer.email
            .trim()
            .toLowerCase(),
      });
    }

    if (
      customer.phone?.trim()
    ) {
      identityConditions.push({
        "customerSnapshot.phone":
          customer.phone.trim(),
      });
    }

    if (
      !identityConditions.length
    ) {
      return;
    }

    const countQuery =
      Order.countDocuments({
        couponCode:
          coupon.code,

        orderStatus: {
          $ne: "cancelled",
        },

        $or:
          identityConditions,
      });

    if (session) {
      countQuery.session(
        session
      );
    }

    const previousUses =
      await countQuery;

    if (
      previousUses >=
      Number(
        coupon.perCustomerLimit
      )
    ) {
      throw new Error(
        "This coupon has already reached its per-customer usage limit."
      );
    }
  };

const reserveStock = async (
  items,
  session
) => {
  for (const item of items) {
    const result =
      await Product.updateOne(
        {
          _id:
            item.product,

          isActive:
            true,

          stock: {
            $gte:
              Number(
                item.quantity
              ),
          },
        },

        {
          $inc: {
            stock:
              -Number(
                item.quantity
              ),
          },
        },

        {
          session,
        }
      );

    if (
      result.modifiedCount !==
      1
    ) {
      throw new Error(
        `${item.productSnapshot.name} no longer has enough stock.`
      );
    }
  }
};

const restoreStock = async (
  items,
  session
) => {
  for (const item of items) {
    await Product.updateOne(
      {
        _id:
          item.product,
      },

      {
        $inc: {
          stock:
            Number(
              item.quantity
            ) || 0,
        },
      },

      {
        session,
      }
    );
  }
};

const previewOrder = async (
  req,
  res
) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,

        message:
          "Database is not connected. Order preview is unavailable for now.",
      });
    }

    const items =
      await validateOrderItems(
        req.body.items
      );

    const { pricing } =
      await buildPricingForItems({
        items,

        couponCode:
          req.body.couponCode,
      });

    return res.status(200).json({
      success: true,

      message:
        "Order preview calculated successfully.",

      data: {
        items:
          serializePreviewItems(
            items
          ),

        pricing,
      },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,

      message:
        error.message ||
        "Failed to preview order.",
    });
  }
};

const createOrder = async (
  req,
  res
) => {
  if (!isDatabaseConnected()) {
    return res.status(503).json({
      success: false,

      message:
        "Database is not connected. Order creation is unavailable.",
    });
  }

  const {
    customer,
    shippingAddress,
    paymentMethod,
    couponCode,
    customerNotes,
  } = req.body;

  try {
    validateCustomerAndAddress({
      customer,
      shippingAddress,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,

      message:
        error.message,
    });
  }

  const session =
    await mongoose.startSession();

  let createdOrder = null;

  try {
    await OrderCounter.init();

    await session.withTransaction(
      async () => {
        const validatedItems =
          await validateOrderItems(
            req.body.items,
            session
          );

        const {
          pricing,
          settings,
        } =
          await buildPricingForItems({
            items:
              validatedItems,

            couponCode,

            session,
          });

        if (
          !req.user &&
          settings
            .orderSettings
            .allowGuestCheckout ===
            false
        ) {
          throw new Error(
            "Guest checkout is currently disabled. Please log in first."
          );
        }

        const safePaymentMethod =
          ensurePaymentMethodAllowed(
            paymentMethod,
            settings
          );

        await enforceCouponPerCustomerLimit(
          {
            pricing,

            userId:
              req.user?._id ||
              null,

            customer,

            session,
          }
        );

        await reserveStock(
          validatedItems,
          session
        );

        const orderNumber =
          await getNextOrderNumber(
            session
          );

        const order =
          new Order({
            orderNumber,

            customer:
              req.user?._id ||
              null,

            customerSnapshot: {
              name:
                customer.name.trim(),

              phone:
                customer.phone.trim(),

              email:
                customer.email
                  ?.trim()
                  .toLowerCase() ||
                "",
            },

            shippingAddress: {
              governorate:
                shippingAddress
                  .governorate
                  .trim(),

              city:
                shippingAddress
                  .city
                  .trim(),

              street:
                shippingAddress
                  .street
                  .trim(),

              building:
                shippingAddress
                  .building
                  ?.trim() ||
                "",

              floor:
                shippingAddress
                  .floor
                  ?.trim() ||
                "",

              apartment:
                shippingAddress
                  .apartment
                  ?.trim() ||
                "",

              notes:
                shippingAddress
                  .notes
                  ?.trim() ||
                customerNotes
                  ?.trim() ||
                "",
            },

            items:
              serializePreviewItems(
                validatedItems
              ),

            subtotal:
              pricing.subtotal,

            discountTotal:
              pricing.discountTotal,

            deliveryFee:
              pricing.deliveryFee,

            total:
              pricing.total,

            discounts:
              buildStoredDiscounts(
                pricing.discounts
              ),

            couponCode:
              pricing.coupon
                ?.status ===
              "valid"
                ? pricing.coupon
                    .code
                : "",

            paymentMethod:
              safePaymentMethod,

            paymentStatus:
              "pending",

            orderStatus:
              "pending",

            customerNotes:
              customerNotes
                ?.trim() ||
              "",

            statusHistory: [
              {
                status:
                  "pending",

                note:
                  "Order placed by customer.",

                changedAt:
                  new Date(),
              },
            ],
          });

        await order.save({
          session,
        });

        await incrementDiscountUsage(
          {
            discounts:
              pricing.discounts,

            session,
          }
        );

        createdOrder =
          order;
      }
    );

    // Email is intentionally sent AFTER the database
    // transaction succeeds. An email failure must never
    // cancel or roll back a real customer order.
    try {
      await sendOrderPlacedEmails(
        createdOrder
      );
    } catch (emailError) {
      console.error(
        "Order was created, but order email failed:",
        emailError.message
      );
    }

    return res.status(201).json({
      success: true,

      message:
        "Order created successfully.",

      data:
        createdOrder,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,

      message:
        error.message ||
        "Failed to create order.",
    });
  } finally {
    await session.endSession();
  }
};

const getMyOrders = async (
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

    const orders =
      await Order.find({
        customer:
          req.user._id,
      })
        .sort({
          createdAt: -1,
        })
        .lean();

    return res.status(200).json({
      success: true,

      count:
        orders.length,

      data:
        orders,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,

      message:
        error.message ||
        "Failed to fetch your orders.",
    });
  }
};

const getMyOrderById = async (
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

    const order =
      await Order.findOne({
        _id:
          req.params.id,

        customer:
          req.user._id,
      }).lean();

    if (!order) {
      return res.status(404).json({
        success: false,

        message:
          "Order not found.",
      });
    }

    return res.status(200).json({
      success: true,

      data:
        order,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,

      message:
        error.message ||
        "Failed to fetch order.",
    });
  }
};

const buildAdminOrderFilter = (
  query = {}
) => {
  const filter = {};

  if (
    query.orderStatus
  ) {
    filter.orderStatus =
      query.orderStatus;
  }

  if (
    query.paymentStatus
  ) {
    filter.paymentStatus =
      query.paymentStatus;
  }

  if (
    query.paymentMethod
  ) {
    filter.paymentMethod =
      query.paymentMethod;
  }

  if (
    query.search?.trim()
  ) {
    const escaped =
      String(
        query.search.trim()
      ).replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

    const regex =
      new RegExp(
        escaped,
        "i"
      );

    filter.$or = [
      {
        orderNumber:
          regex,
      },

      {
        "customerSnapshot.name":
          regex,
      },

      {
        "customerSnapshot.phone":
          regex,
      },

      {
        "customerSnapshot.email":
          regex,
      },
    ];
  }

  return filter;
};

const getAdminOrders = async (
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

    const page =
      Math.max(
        Number(
          req.query.page
        ) || 1,
        1
      );

    const limit =
      Math.min(
        Math.max(
          Number(
            req.query.limit
          ) || 20,
          1
        ),
        80
      );

    const skip =
      (page - 1) *
      limit;

    const filter =
      buildAdminOrderFilter(
        req.query
      );

    const [orders, total] =
      await Promise.all([
        Order.find(filter)
          .sort({
            createdAt: -1,
          })
          .skip(skip)
          .limit(limit)
          .lean(),

        Order.countDocuments(
          filter
        ),
      ]);

    return res.status(200).json({
      success: true,

      count:
        orders.length,

      data:
        orders,

      pagination: {
        page,
        limit,
        total,

        pages:
          Math.ceil(
            total /
            limit
          ),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,

      message:
        error.message ||
        "Failed to fetch admin orders.",
    });
  }
};

const getAdminOrderById = async (
  req,
  res
) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(404).json({
        success: false,

        message:
          "Order not found because database is not connected.",
      });
    }

    const order =
      await Order.findById(
        req.params.id
      ).lean();

    if (!order) {
      return res.status(404).json({
        success: false,

        message:
          "Order not found.",
      });
    }

    return res.status(200).json({
      success: true,

      data:
        order,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,

      message:
        error.message ||
        "Failed to fetch order.",
    });
  }
};

const updateAdminOrderStatus = async (
  req,
  res
) => {
  if (!isDatabaseConnected()) {
    return res.status(503).json({
      success: false,

      message:
        "Database is not connected.",
    });
  }

  const {
    orderStatus,
    paymentStatus,
    note,
    adminNotes,
  } = req.body;

  if (
    orderStatus &&
    !orderStatuses.includes(
      orderStatus
    )
  ) {
    return res.status(400).json({
      success: false,

      message:
        "Invalid order status.",
    });
  }

  if (
    paymentStatus &&
    !paymentStatuses.includes(
      paymentStatus
    )
  ) {
    return res.status(400).json({
      success: false,

      message:
        "Invalid payment status.",
    });
  }

  const session =
    await mongoose.startSession();

  let updatedOrder = null;

  let shouldSendStatusEmail =
    false;

  try {
    await session.withTransaction(
      async () => {
        const order =
          await Order.findById(
            req.params.id
          ).session(session);

        if (!order) {
          throw new Error(
            "Order not found."
          );
        }

        if (
          order.orderStatus ===
            "cancelled" &&
          orderStatus &&
          orderStatus !==
            "cancelled"
        ) {
          throw new Error(
            "A cancelled order cannot be reopened. Create a new order instead."
          );
        }

        const isNewCancellation =
          orderStatus ===
            "cancelled" &&
          order.orderStatus !==
            "cancelled";

        if (
          isNewCancellation
        ) {
          await restoreStock(
            order.items,
            session
          );

          await decrementDiscountUsage(
            {
              discounts:
                order.discounts,

              session,
            }
          );
        }

        if (
          orderStatus &&
          orderStatus !==
            order.orderStatus
        ) {
          shouldSendStatusEmail =
            true;

          order.orderStatus =
            orderStatus;

          order.statusHistory.push(
            {
              status:
                orderStatus,

              note:
                note?.trim() ||
                "",

              changedBy:
                req.user?._id,

              changedAt:
                new Date(),
            }
          );
        }

        if (
          paymentStatus
        ) {
          order.paymentStatus =
            paymentStatus;
        }

        if (
          typeof adminNotes ===
          "string"
        ) {
          order.adminNotes =
            adminNotes.trim();
        }

        await order.save({
          session,
        });

        updatedOrder =
          order;
      }
    );

    // Same principle as order creation:
    // send only after MongoDB has committed the update.
    if (
      shouldSendStatusEmail &&
      updatedOrder
    ) {
      try {
        await sendOrderStatusEmail(
          updatedOrder
        );
      } catch (emailError) {
        console.error(
          "Order status updated, but status email failed:",
          emailError.message
        );
      }
    }

    return res.status(200).json({
      success: true,

      message:
        "Order updated successfully.",

      data:
        updatedOrder,
    });
  } catch (error) {
    const status =
      error.message ===
      "Order not found."
        ? 404
        : 400;

    return res.status(status).json({
      success: false,

      message:
        error.message ||
        "Failed to update order.",
    });
  } finally {
    await session.endSession();
  }
};

module.exports = {
  previewOrder,
  createOrder,
  getMyOrders,
  getMyOrderById,
  getAdminOrders,
  getAdminOrderById,
  updateAdminOrderStatus,
};