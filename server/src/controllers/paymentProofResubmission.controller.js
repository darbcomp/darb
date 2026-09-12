const mongoose = require("mongoose");

const Order = require("../models/Order");
const { normalizeEgyptPhone, formatEgyptPhoneForDisplay } = require("../utils/normalizePhone");
const { sendInternalError } = require("../utils/httpError");
const { sendPaymentProofSubmittedEmails } = require("../services/transactionalEmail.service");
const { sanitizePaymentProofForClient } = require("../utils/paymentProofResponse");
const { logUploadPhase } = require("../services/uploadDiagnostics.service");

const {
  uploadPaymentProofToR2,
  deletePaymentProofFromR2,
} = require("../services/paymentProof.service");

const isDatabaseConnected = () =>
  mongoose.connection.readyState === 1;

const PAYMENT_PROOF_PRIVATE_SELECT =
  "+paymentProof.publicId +paymentProof.assetId +paymentProof.resourceType +paymentProof.deliveryType +paymentProof.format";

const isSafeProofError = (error) =>
  !error?.code && /order not found|cancelled order|already marked as paid|only be uploaded after|choose a payment screenshot/i.test(error?.message || "");

const sendProofError = (res, error) => {
  if (isSafeProofError(error)) {
    const status = error.message === "Order not found." ? 404 : 400;
    return res.status(status).json({ success: false, message: error.message });
  }
  return sendInternalError(res, error, "Payment proof resubmission failed", "Failed to resubmit payment proof.");
};

const sanitizeOrderForClient = (order) => {
  if (!order) {
    return order;
  }

  const plain =
    typeof order.toObject === "function"
      ? order.toObject()
      : { ...order };

  plain.paymentProof =
    sanitizePaymentProofForClient(
      plain.paymentProof
    );

  if (plain.customerSnapshot?.phone) {
    plain.customerSnapshot = {
      ...plain.customerSnapshot,
      phone: formatEgyptPhoneForDisplay(plain.customerSnapshot.phone),
    };
  }

  return plain;
};

const validatePaymentProofResubmission = (
  order
) => {
  if (!order) {
    throw new Error(
      "Order not found."
    );
  }

  if (
    order.orderStatus ===
    "cancelled"
  ) {
    throw new Error(
      "A cancelled order cannot receive a new payment proof."
    );
  }

  if (
    order.paymentStatus ===
    "paid"
  ) {
    throw new Error(
      "This order is already marked as paid."
    );
  }

  if (
    !order.paymentProof ||
    order.paymentProof.status !==
      "rejected"
  ) {
    throw new Error(
      "A new payment proof can only be uploaded after the previous proof was rejected."
    );
  }
};

const replaceRejectedPaymentProof =
  async ({
    order,
    file,
    diagnostic,
  }) => {
    if (!file?.buffer) {
      throw new Error(
        "Please choose a payment screenshot to upload."
      );
    }

    validatePaymentProofResubmission(
      order
    );

    const previousProof =
      order.paymentProof?.toObject
        ? order.paymentProof.toObject()
        : {
            ...(order.paymentProof ||
              {}),
          };

    let newProof = null;

    try {
      newProof =
        await uploadPaymentProofToR2(
          file,
          diagnostic
        );

      order.paymentProof =
        newProof;

      order.paymentStatus =
        "pending";

      await order.save();
      if (diagnostic) logUploadPhase({ ...diagnostic, phase: "order_persisted" });
    } catch (error) {
      if (newProof) {
        if (diagnostic) logUploadPhase({ ...diagnostic, phase: "failed", failureStage: "database", errorCategory: "database" });
        try {
          await deletePaymentProofFromR2(
            newProof
          );
        } catch (
          cleanupError
        ) {
          console.error(
            "Failed to clean up replacement payment proof:",
            cleanupError.message
          );
        }
      }
      if (diagnostic && !newProof && !error.uploadDiagnosticLogged) {
        logUploadPhase({ ...diagnostic, phase: "failed", failureStage: "processing", errorCategory: "unknown" });
      }

      throw error;
    }

    /*
      Only delete the old rejected
      screenshot AFTER MongoDB has
      successfully saved the new one.
    */

    if (
      previousProof?.publicId
    ) {
      try {
        await deletePaymentProofFromR2(
          previousProof
        );
      } catch (
        cleanupError
      ) {
        console.error(
          "Replacement proof saved, but old proof cleanup failed:",
          cleanupError.message
        );
      }
    }

    await sendPaymentProofSubmittedEmails(order, { isResubmission: true });

    return order;
  };

/* =========================================================
   GUEST — GET PAYMENT PROOF STATUS
========================================================= */

const getGuestPaymentProofStatus =
  async (
    req,
    res
  ) => {
    try {
      if (
        !isDatabaseConnected()
      ) {
        return res
          .status(503)
          .json({
            success: false,

            message:
              "Database is not connected.",
          });
      }

      const orderNumber =
        String(
          req.body
            .orderNumber ||
            ""
        )
          .trim()
          .toUpperCase();

      const phone = normalizeEgyptPhone(req.body.phone);

      if (
        !orderNumber ||
        !phone
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Order number and phone number are required.",
          });
      }

      const order = await Order.findOne({ orderNumber }).lean();

      if (!order || normalizeEgyptPhone(order.customerSnapshot?.phone) !== phone) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Order not found. Check the order number and phone number.",
          });
      }

      return res
        .status(200)
        .json({
          success: true,

          data: {
            orderNumber:
              order.orderNumber,

            orderStatus:
              order.orderStatus,

            paymentMethod:
              order.paymentMethod,

            paymentStatus:
              order.paymentStatus,

            total:
              order.total,

            paymentProof:
              sanitizePaymentProofForClient(
                order.paymentProof
              ),
          },
        });
    } catch (error) {
      return sendInternalError(res, error, "Payment proof status lookup failed", "Failed to load payment proof status.");
    }
  };

/* =========================================================
   GUEST — RESUBMIT REJECTED PROOF
========================================================= */

const resubmitGuestPaymentProof =
  async (
    req,
    res
  ) => {
    try {
      if (
        !isDatabaseConnected()
      ) {
        return res
          .status(503)
          .json({
            success: false,

            message:
              "Database is not connected.",
          });
      }

      const orderNumber =
        String(
          req.body
            .orderNumber ||
            ""
        )
          .trim()
          .toUpperCase();

      const phone = normalizeEgyptPhone(req.body.phone);

      if (
        !orderNumber ||
        !phone
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Order number and phone number are required.",
          });
      }

      /*
        Guest ownership check:
        exact order number +
        exact checkout phone.
      */

      const order = await Order.findOne({ orderNumber }).select(PAYMENT_PROOF_PRIVATE_SELECT);

      if (!order || normalizeEgyptPhone(order.customerSnapshot?.phone) !== phone) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Order not found. Check the order number and phone number.",
          });
      }

      const updatedOrder =
        await replaceRejectedPaymentProof(
          {
            order,
            file: req.file,
            diagnostic: req.uploadDiagnostic,
          }
        );

      return res
        .status(200)
        .json({
          success: true,

          message:
            "New payment proof submitted successfully. Darb will review it again.",

          data:
            sanitizeOrderForClient(
              updatedOrder
            ),
        });
    } catch (error) {
      return sendProofError(res, error);
    }
  };

/* =========================================================
   LOGGED-IN CUSTOMER — RESUBMIT
========================================================= */

const resubmitMyPaymentProof =
  async (
    req,
    res
  ) => {
    try {
      if (
        !isDatabaseConnected()
      ) {
        return res
          .status(503)
          .json({
            success: false,

            message:
              "Database is not connected.",
          });
      }

      const order =
        await Order.findOne({
          _id: req.params.id,

          customer:
            req.user._id,
        }).select(
          PAYMENT_PROOF_PRIVATE_SELECT
        );

      if (!order) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Order not found.",
          });
      }

      const updatedOrder =
        await replaceRejectedPaymentProof(
          {
            order,
            file: req.file,
            diagnostic: req.uploadDiagnostic,
          }
        );

      return res
        .status(200)
        .json({
          success: true,

          message:
            "New payment proof submitted successfully. Darb will review it again.",

          data:
            sanitizeOrderForClient(
              updatedOrder
            ),
        });
    } catch (error) {
      return sendProofError(res, error);
    }
  };

module.exports = {
  getGuestPaymentProofStatus,
  resubmitGuestPaymentProof,
  resubmitMyPaymentProof,
};
