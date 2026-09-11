const mongoose = require("mongoose");

const Order = require("../models/Order");
const { normalizeEgyptPhone } = require("../utils/normalizePhone");
const { sendInternalError } = require("../utils/httpError");

const isDatabaseConnected = () =>
  mongoose.connection.readyState === 1;

const normalizeOrderNumber = (value) => {
  const clean = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

  if (/^\d+$/.test(clean)) {
    return `DARB-${clean}`;
  }

  return clean;
};

const buildSafeTrackingOrder = (order) => {
  const history = [
    ...(order.statusHistory || []),
  ]
    .sort(
      (a, b) =>
        new Date(a.changedAt || 0) -
        new Date(b.changedAt || 0)
    )
    .map((entry) => ({
      status: entry.status,
      changedAt: entry.changedAt,
    }));

  return {
    orderNumber: order.orderNumber,

    orderStatus: order.orderStatus,

    paymentStatus:
      order.paymentStatus,

    createdAt: order.createdAt,

    updatedAt: order.updatedAt,

    items: (order.items || []).map(
      (item) => ({
        name:
          item.productSnapshot?.name ||
          "Darb Fragrance",

        slug:
          item.productSnapshot?.slug ||
          "",

        image:
          item.productSnapshot?.image ||
          "",

        sizeLabel:
          item.productSnapshot
            ?.sizeLabel ||
          (item.productSnapshot
            ?.sizeMl
            ? `${item.productSnapshot.sizeMl} ML`
            : ""),

        quantity:
          Number(item.quantity) || 1,

        unitPrice:
          Number(item.unitPrice) || 0,

        lineTotal:
          Number(item.lineTotal) || 0,
      })
    ),

    subtotal:
      Number(order.subtotal) || 0,

    discountTotal:
      Number(order.discountTotal) || 0,

    deliveryFee:
      Number(order.deliveryFee) || 0,

    total:
      Number(order.total) || 0,

    statusHistory: history,
  };
};

const trackOrder = async (
  req,
  res
) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message:
          "Order tracking is temporarily unavailable.",
      });
    }

    const orderNumber =
      normalizeOrderNumber(
        req.body.orderNumber
      );

    const phone =
      normalizeEgyptPhone(
        req.body.phone
      );

    if (
      !orderNumber ||
      !/^DARB-\d+$/.test(
        orderNumber
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Enter a valid Darb order number, for example DARB-1001.",
      });
    }

    if (
      !phone
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Enter the phone number used when placing the order.",
      });
    }

    /*
      We find the order internally,
      then verify the stored phone.

      IMPORTANT:
      No order information is returned
      unless BOTH values match.
    */
    const order =
      await Order.findOne({
        orderNumber,
      })
        .select(
          [
            "orderNumber",
            "customerSnapshot.phone",
            "orderStatus",
            "paymentStatus",
            "items",
            "subtotal",
            "discountTotal",
            "deliveryFee",
            "total",
            "statusHistory",
            "createdAt",
            "updatedAt",
          ].join(" ")
        )
        .lean();

    const storedPhone =
      normalizeEgyptPhone(
        order?.customerSnapshot?.phone
      );

    if (
      !order ||
      storedPhone !== phone
    ) {
      /*
        Same response whether:
        - order doesn't exist
        - phone is incorrect

        This avoids revealing whether
        a guessed order number exists.
      */
      return res.status(404).json({
        success: false,
        message:
          "We couldn't find an order matching those details. Check the order number and phone number and try again.",
      });
    }

    return res.status(200).json({
      success: true,

      message:
        "Order found successfully.",

      data:
        buildSafeTrackingOrder(
          order
        ),
    });
  } catch (error) {
    return sendInternalError(res, error, "Order tracking failed", "Failed to track order.");
  }
};

module.exports = {
  trackOrder,
};
