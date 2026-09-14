const { getSafeInternalMessage, sendInternalError } = require("../utils/httpError");
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
  sendPaymentProofDecisionEmail,
  sendPaymentProofSubmittedEmails,
} = require("../services/transactionalEmail.service");

const {
  uploadPaymentProofToR2,
  deletePaymentProofFromR2,
  getPaymentProofTemporaryUrl,
  PAYMENT_PROOF_URL_TTL_SECONDS,
} = require("../services/paymentProof.service");

const {
  calculateCartPricing,
  incrementDiscountUsage,
  decrementDiscountUsage,
} = require("../utils/calculateCart");
const { findProductVariant } = require("../utils/productVariants");
const { sanitizePaymentProofForClient } = require("../utils/paymentProofResponse");
const { getGovernorateDeliveryFee } = require("../utils/shipping");
const { buildReserveStockOperation, buildRestoreStockOperation } = require("../utils/inventory");
const { applySelectedEntitlement, consumeEntitlement, restoreEntitlement, resolveEntitlementCodeForCheckout } = require("../services/entitlement.service");
const { ensureOrderSpinGrant } = require("../services/spinGrant.service");
const { buildOrderUserData, buildPurchaseCustomData, extractMetaContext, sendMetaEvent } = require("../services/metaCapi.service");
const { normalizeEgyptPhone, getEgyptPhoneIdentityVariants, formatEgyptPhoneForDisplay } = require("../utils/normalizePhone");
const { normalizeIdempotencyKey, isValidIdempotencyKey, isDuplicateKeyError, isOrderReplayOwner } = require("../utils/idempotency");
const { logUploadPhase } = require("../services/uploadDiagnostics.service");

const isDatabaseConnected = () => mongoose.connection.readyState === 1;

const ORDER_NUMBER_BASE = 1000;

const orderStatuses = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
];

const paymentStatuses = ["pending", "paid", "failed", "refunded"];

const isSafeOrderClientError = (error) =>
  !error?.code && /required|invalid|enter a valid|valid order request|not available|not found|not enough stock|requires a valid|does not have|coupon|reward|guest checkout|payment|sender name|too long|too many order items|already used|usage limit|settings changed/i.test(error?.message || "");

const sendOrderRequestError = (res, error, fallback) =>
  isSafeOrderClientError(error)
    ? res.status(400).json({ success: false, message: error.message })
    : sendInternalError(res, error, "Order request failed", fallback);

const cleanupPaymentProof = async (proof) => {
  if (!proof) return;
  try {
    await deletePaymentProofFromR2(proof);
  } catch (error) {
    console.error("Failed to clean up unreferenced payment proof:", error.message);
  }
};

const paymentMethodKeys = {
  cash_on_delivery: "cashOnDelivery",
  instapay: "instapay",
  vodafone_cash: "vodafoneCash",
  paymob_card: "paymobCard",
};

const fallbackPaymentMethods = {
  cashOnDelivery: {
    enabled: true,
    requireProof: false,
  },
  instapay: {
    enabled: true,
    requireProof: true,
  },
  vodafoneCash: {
    enabled: true,
    requireProof: true,
  },
  paymobCard: {
    enabled: false,
    requireProof: false,
  },
};

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

  const sequence = ORDER_NUMBER_BASE + Number(counter.seq || 0);
  return `DARB-${sequence}`;
};

const getMainImage = (product) =>
  product.images?.find((image) => image.isMain) || product.images?.[0];

const getSettings = async (session = null) => {
  const query = StoreSettings.findOne({ singletonKey: "main" }).select("+launchConfigVersion");

  if (session) {
    query.session(session);
  }

  const settings = await query;

  const needsDeliveryMigration = Number(settings?.launchConfigVersion || 0) < 2;

  return {
    delivery: {
      defaultFee: needsDeliveryMigration ? 100 : Number(settings?.delivery?.defaultFee) || 100,
      freeDeliveryThreshold: 0,
      governorateFees: {
        cairo: needsDeliveryMigration ? 100 : Number(settings?.delivery?.governorateFees?.cairo) || 100,
        giza: needsDeliveryMigration ? 100 : Number(settings?.delivery?.governorateFees?.giza) || 100,
        alexandria: needsDeliveryMigration ? 100 : Number(settings?.delivery?.governorateFees?.alexandria) || 100,
        other: needsDeliveryMigration ? 100 : Number(settings?.delivery?.governorateFees?.other) || 100,
      },
    },
    paymentMethods: settings?.paymentMethods || fallbackPaymentMethods,
    orderSettings: {
      allowGuestCheckout:
        settings?.orderSettings?.allowGuestCheckout !== false,
      autoConfirmPaidOrders: Boolean(
        settings?.orderSettings?.autoConfirmPaidOrders
      ),
    },
  };
};

const getBaseDeliveryFee = (_subtotal, settings, governorate = "") => {
  return getGovernorateDeliveryFee(governorate, settings.delivery.governorateFees);
};

const getPaymentMethodConfig = (paymentMethod, settings) => {
  const settingsKey = paymentMethodKeys[paymentMethod];

  if (!settingsKey) {
    return null;
  }

  return settings.paymentMethods?.[settingsKey] || fallbackPaymentMethods[settingsKey];
};

const ensurePaymentMethodAllowed = (paymentMethod, settings) => {
  const method = paymentMethod || "cash_on_delivery";
  if (method === "paymob_card") throw new Error("Card payment is not available at launch.");
  const settingsKey = paymentMethodKeys[method];

  if (!settingsKey) {
    throw new Error("Invalid payment method.");
  }

  const config =
    settings.paymentMethods?.[settingsKey] || fallbackPaymentMethods[settingsKey];

  if (!config?.enabled) {
    throw new Error("The selected payment method is currently unavailable.");
  }

  return method;
};

const buildProductSnapshot = (product, variant = null) => {
  const image = getMainImage(product);

  return {
    name: product.name,
    arabicName: product.arabicName || "",
    slug: product.slug,
    image: image?.url || "",
    categoryName:
      product.category?.name || product.categorySnapshot?.name || "",
    arabicCategoryName:
      product.category?.arabicName ||
      product.categorySnapshot?.arabicName ||
      "",
    categorySlug:
      product.category?.slug || product.categorySnapshot?.slug || "",
    sizeLabel: variant?.label || product.sizeLabel || "",
    sizeMl: variant?.sizeMl || product.sizeMl || 0,
  };
};

const buildSafeOrderItem = ({ product, quantity, variant }) => {
  const unitPrice = Number(variant.price) || 0;

  return {
    product: product._id,
    productDoc: product,
    productSnapshot: buildProductSnapshot(product, variant),
    variant: {
      variantId: variant.variantId,
      label: variant.label,
      sizeMl: variant.sizeMl,
      sku: variant.sku,
    },
    quantity,
    unitPrice,
    compareAtPrice: Number(variant.compareAtPrice) || 0,
    lineTotal: unitPrice * quantity,
  };
};

const findProductForOrderItem = async (item, session = null) => {
  let query = null;

  if (item.product && mongoose.Types.ObjectId.isValid(item.product)) {
    query = Product.findById(item.product);
  } else if (item.slug) {
    query = Product.findOne({
      slug: String(item.slug).trim().toLowerCase(),
    });
  }

  if (!query) {
    return null;
  }

  query.populate("category", "name arabicName slug");
  query.populate("categories", "name arabicName slug");

  if (session) {
    query.session(session);
  }

  return query;
};

const validateOrderItems = async (items = [], session = null) => {
  if (!Array.isArray(items) || !items.length) {
    throw new Error("Order items are required.");
  }
  if (items.length > 50) throw new Error("Too many order items were submitted.");

  const validatedItems = [];

  for (const item of items) {
    const quantity = Math.floor(Number(item.quantity) || 0);

    if (quantity <= 0) {
      throw new Error("Each order item must have a valid quantity.");
    }

    const product = await findProductForOrderItem(item, session);

    if (!product) {
      throw new Error(
        `Product not found: ${item.name || item.slug || ""}`
      );
    }

    if (!product.isActive || product.isPlaceholder) {
      throw new Error(`${product.name} is not available for purchase.`);
    }

    const requestedVariantId = item.variantId || item.variant?.variantId || item.variant?._id || "";
    const variant = findProductVariant(product, requestedVariantId);
    if (!variant) {
      throw new Error(`${product.name} requires a valid size selection.`);
    }

    if (Number(variant.price) <= 0) {
      throw new Error(`${product.name} does not have a valid price yet.`);
    }

    if (Number(variant.stock) < quantity) {
      throw new Error(`${product.name} does not have enough stock.`);
    }

    validatedItems.push(
      buildSafeOrderItem({
        product,
        quantity,
        variant,
      })
    );
  }

  return validatedItems;
};

const getSubtotal = (items = []) =>
  items.reduce((sum, item) => sum + (Number(item.lineTotal) || 0), 0);

const buildPricingForItems = async ({ items, couponCode, entitlementId = "", userId = null, customerPhone = "", governorate = "", deliveryConfirmed = true, session = null }) => {
  const subtotal = getSubtotal(items);
  const settings = await getSettings(session);
  const baseDeliveryFee = deliveryConfirmed
    ? getBaseDeliveryFee(subtotal, settings, governorate)
    : 0;

  const codeResolution = !entitlementId
    ? await resolveEntitlementCodeForCheckout({
        userId,
        guestPhone: customerPhone,
        code: couponCode,
        session,
      })
    : { isEntitlementCode: false, entitlement: null };
  if (codeResolution.isEntitlementCode && !codeResolution.entitlement) {
    if (codeResolution.reason === "checkout_details_required") {
      throw new Error("Enter or use the checkout details tied to this reward.");
    }
    throw new Error("This reward is not available for these checkout details.");
  }
  const codedEntitlement = codeResolution.entitlement;
  const selectedEntitlementId = entitlementId || codedEntitlement?._id;
  let pricing = await calculateCartPricing({
    items,
    couponCode: codeResolution.isEntitlementCode ? "" : couponCode,
    baseDeliveryFee,
    session,
  });
  const applied = await applySelectedEntitlement({ pricing, items, entitlementId: selectedEntitlementId, userId, guestPhone: customerPhone, session });
  pricing = deliveryConfirmed
    ? { ...applied.pricing, deliveryConfirmed: true }
    : {
        ...applied.pricing,
        baseDeliveryFee: null,
        deliveryFee: null,
        total: null,
        totalBeforeDelivery: Math.max(
          applied.pricing.subtotal - applied.pricing.discountTotal,
          0
        ),
        deliveryConfirmed: false,
      };
  return { pricing, settings, entitlement: applied.entitlement, freeTester: applied.freeTester };
};

const serializePreviewItems = (items = []) =>
  items.map((item) => ({
    product: item.product,
    productSnapshot: item.productSnapshot,
    variant: item.variant,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    compareAtPrice: item.compareAtPrice,
    lineTotal: item.lineTotal,
  }));

const buildStoredDiscounts = (discounts = []) =>
  discounts.map((discount) => ({
    sourceType: discount.sourceType,
    sourceId: discount.sourceId || null,
    name:
      discount.name || discount.title || discount.code || "Discount",
    code: discount.code || "",
    amount: Number(discount.amount) || 0,
  }));

const validateCustomerAndAddress = ({ customer, shippingAddress }) => {
  if (!customer?.name?.trim()) {
    throw new Error("Customer name is required.");
  }

  if (!customer?.phone?.trim()) {
    throw new Error("Customer phone is required.");
  }

  if (!shippingAddress?.governorate?.trim()) {
    throw new Error("Governorate is required.");
  }

  if (!shippingAddress?.city?.trim()) {
    throw new Error("City is required.");
  }

  if (!shippingAddress?.street?.trim()) {
    throw new Error("Street address is required.");
  }

  const limits = [
    [customer.name, 120, "Customer name"],
    [customer.email, 254, "Customer email"],
    [shippingAddress.governorate, 80, "Governorate"],
    [shippingAddress.city, 120, "City"],
    [shippingAddress.street, 300, "Street address"],
    [shippingAddress.building, 80, "Building"],
    [shippingAddress.floor, 40, "Floor"],
    [shippingAddress.apartment, 40, "Apartment"],
    [shippingAddress.notes, 1000, "Address notes"],
  ];
  for (const [value, max, label] of limits) {
    if (String(value || "").length > max) throw new Error(`${label} is too long.`);
  }
};

const parseOrderCreateBody = (req) => {
  if (req.body?.orderData !== undefined) {
    if (typeof req.body.orderData !== "string") {
      throw new Error("Invalid order payload.");
    }

    try {
      const parsed = JSON.parse(req.body.orderData);

      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Invalid order payload.");
      }

      return parsed;
    } catch (error) {
      if (error.message === "Invalid order payload.") {
        throw error;
      }

      throw new Error("Invalid order payload.");
    }
  }

  return req.body || {};
};

const sanitizeOrderForClient = (order) => {
  if (!order) {
    return order;
  }

  const plain = typeof order.toObject === "function" ? order.toObject() : { ...order };
  plain.paymentProof = sanitizePaymentProofForClient(plain.paymentProof, { includeSenderName: true });
  if (plain.customerSnapshot?.phone) {
    plain.customerSnapshot = {
      ...plain.customerSnapshot,
      phone: formatEgyptPhoneForDisplay(plain.customerSnapshot.phone),
    };
  }
  delete plain.birthday;
  delete plain.requestId;
  delete plain.metaPurchaseEventId;
  return plain;
};

const findOrderByRequestId = (requestId) =>
  Order.findOne({ requestId }).select("+requestId +metaPurchaseEventId");

const sendOrderReplay = (req, res, order, phone) => {
  if (!isOrderReplayOwner(order, { userId: req.user?._id || null, phone })) {
    return res.status(409).json({
      success: false,
      message: "This order request ID is already in use. Please start a new checkout attempt.",
    });
  }
  return sendOrderSuccess(res, order, { replay: true });
};

const sendOrderSuccess = (res, order, { replay = false } = {}) => {
  const hasProof = order?.paymentProof?.status && order.paymentProof.status !== "not_required";
  return res.status(replay ? 200 : 201).json({
    success: true,
    message: replay
      ? "Order already created successfully."
      : hasProof
        ? "Order created successfully. Your payment proof is awaiting review."
        : "Order created successfully.",
    data: sanitizeOrderForClient(order),
    ...(order?.metaPurchaseEventId ? { metaEventId: order.metaPurchaseEventId } : {}),
  });
};

const enforceCouponPerCustomerLimit = async ({
  pricing,
  userId,
  customer,
  session,
}) => {
  const appliedCoupon = pricing.discounts.find(
    (discount) =>
      discount.sourceType === "coupon" && discount.sourceId
  );

  if (!appliedCoupon) {
    return;
  }

  const couponQuery = Coupon.findById(appliedCoupon.sourceId);

  if (session) {
    couponQuery.session(session);
  }

  const coupon = await couponQuery;

  if (!coupon || Number(coupon.perCustomerLimit) <= 0) {
    return;
  }

  const identityConditions = [];

  if (userId) {
    identityConditions.push({ customer: userId });
  }

  if (customer.email?.trim()) {
    identityConditions.push({
      "customerSnapshot.email": customer.email.trim().toLowerCase(),
    });
  }

  if (customer.phone?.trim()) {
    const phoneVariants = getEgyptPhoneIdentityVariants(customer.phone);
    if (phoneVariants.length) {
      identityConditions.push({ "customerSnapshot.phone": { $in: phoneVariants } });
    }
  }

  if (!identityConditions.length) {
    return;
  }

  const countQuery = Order.countDocuments({
    couponCode: coupon.code,
    orderStatus: { $ne: "cancelled" },
    $or: identityConditions,
  });

  if (session) {
    countQuery.session(session);
  }

  const previousUses = await countQuery;

  if (previousUses >= Number(coupon.perCustomerLimit)) {
    throw new Error(
      "This coupon has already reached its per-customer usage limit."
    );
  }
};

const reserveStock = async (items, session) => {
  for (const item of items) {
    const operation = buildReserveStockOperation(item);
    const result = await Product.updateOne(
      operation.filter,
      operation.update,
      { session }
    );

    if (result.modifiedCount !== 1) {
      throw new Error(
        `${item.productSnapshot.name} no longer has enough stock.`
      );
    }
  }
};

const restoreStock = async (items, session) => {
  for (const item of items) {
    const operation = buildRestoreStockOperation(item);
    await Product.updateOne(
      operation.filter,
      operation.update,
      { session }
    );
  }
};

const previewOrder = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message:
          "Database is not connected. Order preview is unavailable for now.",
      });
    }

    const items = await validateOrderItems(req.body.items);
    const pricingOnly = req.body.pricingOnly === true;
    const { pricing } = await buildPricingForItems({
      items,
      couponCode: pricingOnly ? "" : req.body.couponCode,
      entitlementId: pricingOnly ? "" : req.body.entitlementId,
      userId: req.user?._id || null,
      customerPhone: pricingOnly ? "" : req.body.customer?.phone || "",
      governorate: pricingOnly ? "" : req.body.shippingAddress?.governorate,
      deliveryConfirmed: !pricingOnly,
    });

    return res.status(200).json({
      success: true,
      message: "Order preview calculated successfully.",
      data: {
        items: serializePreviewItems(items),
        pricing,
      },
    });
  } catch (error) {
    return sendOrderRequestError(res, error, "Failed to preview order.");
  }
};

const createOrder = async (req, res) => {
  if (!isDatabaseConnected()) {
    return res.status(503).json({
      success: false,
      message: "Database is not connected. Order creation is unavailable.",
    });
  }

  let body;
  let uploadedPaymentProof = null;
  let transactionCommitted = false;
  let requestId = "";
  let metaContext = null;
  let persistenceStarted = false;

  try {
    body = parseOrderCreateBody(req);
    requestId = normalizeIdempotencyKey(body.requestId);
    if (!isValidIdempotencyKey(requestId)) {
      throw new Error("A valid order request ID is required.");
    }
    const canonicalPhone = normalizeEgyptPhone(body.customer?.phone);
    if (String(body.customer?.phone || "").length > 40) throw new Error("Customer phone is too long.");
    if (!canonicalPhone) throw new Error("Enter a valid Egyptian mobile number.");
    body.customer = { ...body.customer, phone: canonicalPhone };
    const existingOrder = await findOrderByRequestId(requestId);
    if (existingOrder) {
      if (req.uploadDiagnostic) logUploadPhase({ ...req.uploadDiagnostic, phase: "order_persisted" });
      return sendOrderReplay(req, res, existingOrder, canonicalPhone);
    }
    if (body.customer.email && (String(body.customer.email).trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.customer.email).trim()))) {
      throw new Error("Enter a valid customer email address.");
    }
    if (String(body.customerNotes || "").length > 1000) throw new Error("Customer notes are too long.");
    if (String(body.paymentSenderName || "").length > 120) throw new Error("Sender name is too long.");
    metaContext = extractMetaContext(body.trackingContext, req);
    validateCustomerAndAddress({
      customer: body.customer,
      shippingAddress: body.shippingAddress,
    });

    const preliminarySettings = await getSettings();
    const preliminaryPaymentMethod = ensurePaymentMethodAllowed(
      body.paymentMethod,
      preliminarySettings
    );
    const preliminaryPaymentConfig = getPaymentMethodConfig(
      preliminaryPaymentMethod,
      preliminarySettings
    );
    const requiresProof = Boolean(preliminaryPaymentConfig?.requireProof);

    if (requiresProof && !req.file) {
      throw new Error(
        "A payment screenshot is required for the selected payment method."
      );
    }

    if (requiresProof && !String(body.paymentSenderName || "").trim()) {
      throw new Error("Sender name is required for transfer payments.");
    }

    if (!requiresProof && req.file) {
      throw new Error(
        "A payment screenshot is not required for the selected payment method."
      );
    }

    if (req.file) {
      uploadedPaymentProof = await uploadPaymentProofToR2(req.file, req.uploadDiagnostic);
    }
  } catch (error) {
    if (uploadedPaymentProof) {
      await cleanupPaymentProof(uploadedPaymentProof);
    }

    if (req.uploadDiagnostic && !error.uploadDiagnosticLogged) {
      logUploadPhase({ ...req.uploadDiagnostic, phase: "failed", failureStage: "processing", errorCategory: "unknown" });
    }

    return sendOrderRequestError(res, error, "Invalid order request.");
  }

  const {
    customer,
    shippingAddress,
    paymentMethod,
    couponCode,
    customerNotes,
  } = body;

  let session = null;
  let createdOrder = null;

  try {
    session = await mongoose.startSession();

    await OrderCounter.init();

    await session.withTransaction(async () => {
      const validatedItems = await validateOrderItems(body.items, session);

      const { pricing, settings, entitlement, freeTester } = await buildPricingForItems({
        items: validatedItems,
        couponCode,
        entitlementId: body.entitlementId,
        userId: req.user?._id || null,
        customerPhone: customer.phone,
        governorate: shippingAddress.governorate,
        session,
      });

      if (
        !req.user &&
        settings.orderSettings.allowGuestCheckout === false
      ) {
        throw new Error(
          "Guest checkout is currently disabled. Please log in first."
        );
      }

      const safePaymentMethod = ensurePaymentMethodAllowed(
        paymentMethod,
        settings
      );
      const paymentConfig = getPaymentMethodConfig(
        safePaymentMethod,
        settings
      );
      const requiresProof = Boolean(paymentConfig?.requireProof);

      if (requiresProof && !uploadedPaymentProof) {
        throw new Error(
          "A payment screenshot is required for the selected payment method."
        );
      }

      if (!requiresProof && uploadedPaymentProof) {
        throw new Error(
          "Payment settings changed. Please refresh checkout and try again."
        );
      }

      await enforceCouponPerCustomerLimit({
        pricing,
        userId: req.user?._id || null,
        customer,
        session,
      });

      await reserveStock(validatedItems, session);

      const orderNumber = await getNextOrderNumber(session);

      const order = new Order({
        orderNumber,
        requestId,
        metaPurchaseEventId: metaContext?.eventId || "",
        customer: req.user?._id || null,
        customerSnapshot: {
          name: customer.name.trim(),
          phone: customer.phone.trim(),
          email: customer.email?.trim().toLowerCase() || "",
        },
        shippingAddress: {
          governorate: shippingAddress.governorate.trim(),
          city: shippingAddress.city.trim(),
          street: shippingAddress.street.trim(),
          building: shippingAddress.building?.trim() || "",
          floor: shippingAddress.floor?.trim() || "",
          apartment: shippingAddress.apartment?.trim() || "",
          notes:
            shippingAddress.notes?.trim() || customerNotes?.trim() || "",
        },
        items: serializePreviewItems(validatedItems),
        subtotal: pricing.subtotal,
        discountTotal: pricing.discountTotal,
        deliveryFee: pricing.deliveryFee,
        total: pricing.total,
        discounts: buildStoredDiscounts(pricing.discounts),
        couponCode:
          pricing.coupon?.status === "valid" ? pricing.coupon.code : "",
        paymentMethod: safePaymentMethod,
        paymentStatus: "pending",
        paymentProof: uploadedPaymentProof || {
          status: "not_required",
        },
        orderStatus: "pending",
        customerNotes: customerNotes?.trim() || "",
        gift: {
          isGift: Boolean(body.isGift || body.gift?.isGift),
          message: String(body.giftMessage || body.gift?.message || "").trim().slice(0, 500),
        },
        promotion: entitlement ? {
          entitlement: entitlement._id,
          key: entitlement.key,
          label: entitlement.label,
          origin: entitlement.origin,
          freeTester,
        } : {
          label: pricing.discounts[0]?.name || "",
          origin: pricing.discounts[0]?.sourceType || "",
          freeTester: false,
        },
        marketingConsent: {
          granted: Boolean(body.marketingConsent),
          grantedAt: body.marketingConsent ? new Date() : null,
          source: "checkout",
        },
        birthday: body.birthday ? new Date(body.birthday) : null,
        statusHistory: [
          {
            status: "pending",
            note: uploadedPaymentProof
              ? "Order placed with payment proof submitted for review."
              : "Order placed by customer.",
            changedAt: new Date(),
          },
        ],
      });

      if (uploadedPaymentProof) {
        order.paymentProof.senderName = String(body.paymentSenderName || "").trim();
      }

      persistenceStarted = true;
      await order.save({ session });

      await consumeEntitlement(entitlement?._id, req.user?._id, order._id, session, customer.phone);

      await incrementDiscountUsage({
        discounts: pricing.discounts,
        session,
      });

      createdOrder = order;
    });

    transactionCommitted = true;
    if (req.uploadDiagnostic) logUploadPhase({ ...req.uploadDiagnostic, phase: "order_persisted" });

    try {
      await sendOrderPlacedEmails(createdOrder);
    } catch (emailError) {
      console.error(
        "Order was created, but order email failed:",
        emailError.message
      );
    }

    if (uploadedPaymentProof) {
      await sendPaymentProofSubmittedEmails(createdOrder, { isResubmission: false });
    }

    if (metaContext) {
      await sendMetaEvent({
        eventName: "Purchase",
        eventId: metaContext.eventId,
        eventSourceUrl: metaContext.eventSourceUrl,
        customData: buildPurchaseCustomData(createdOrder),
        userData: buildOrderUserData(createdOrder, metaContext),
      });
    }

    return sendOrderSuccess(res, createdOrder);
  } catch (error) {
    if (uploadedPaymentProof && !transactionCommitted) {
      await cleanupPaymentProof(uploadedPaymentProof);
    }

    if (requestId && isDuplicateKeyError(error)) {
      const existingOrder = await findOrderByRequestId(requestId);
      if (existingOrder) {
        if (req.uploadDiagnostic) logUploadPhase({ ...req.uploadDiagnostic, phase: "order_persisted" });
        return sendOrderReplay(req, res, existingOrder, body?.customer?.phone || "");
      }
    }

    if (req.uploadDiagnostic) {
      logUploadPhase({
        ...req.uploadDiagnostic,
        phase: "failed",
        failureStage: persistenceStarted ? "database" : "processing",
        errorCategory: persistenceStarted ? "database" : "unknown",
      });
    }

    return sendOrderRequestError(res, error, "Failed to create order.");
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

const getMyOrders = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database is not connected.",
      });
    }

    const orders = await Order.find({ customer: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: orders.length,
      data: orders.map(sanitizeOrderForClient),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: getSafeInternalMessage(error, "Failed to fetch your orders."),
    });
  }
};

const getMyOrderById = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database is not connected.",
      });
    }

    const order = await Order.findOne({
      _id: req.params.id,
      customer: req.user._id,
    }).lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: sanitizeOrderForClient(order),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: getSafeInternalMessage(error, "Failed to fetch order."),
    });
  }
};

const buildAdminOrderFilter = (query = {}) => {
  const filter = {};

  if (query.orderStatus) {
    filter.orderStatus = query.orderStatus;
  }

  if (query.paymentStatus) {
    filter.paymentStatus = query.paymentStatus;
  }

  if (query.paymentMethod) {
    filter.paymentMethod = query.paymentMethod;
  }

  if (query.paymentProofStatus) {
    filter["paymentProof.status"] = query.paymentProofStatus;
  }

  if (query.search?.trim()) {
    const escaped = String(query.search.trim()).replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );
    const regex = new RegExp(escaped, "i");

    filter.$or = [
      { orderNumber: regex },
      { "customerSnapshot.name": regex },
      { "customerSnapshot.phone": regex },
      { "customerSnapshot.email": regex },
    ];
  }

  return filter;
};

const getAdminOrders = async (req, res) => {
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

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 80);
    const skip = (page - 1) * limit;
    const filter = buildAdminOrderFilter(req.query);

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
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
      message: getSafeInternalMessage(error, "Failed to fetch admin orders."),
    });
  }
};

const getAdminOrderById = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(404).json({
        success: false,
        message: "Order not found because database is not connected.",
      });
    }

    const order = await Order.findById(req.params.id).lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: getSafeInternalMessage(error, "Failed to fetch order."),
    });
  }
};

const getAdminPaymentProofUrl = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database is not connected.",
      });
    }

    const order = await Order.findById(req.params.id).select(
      "+paymentProof.publicId +paymentProof.assetId +paymentProof.resourceType +paymentProof.deliveryType +paymentProof.format"
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    if (
      !order.paymentProof ||
      order.paymentProof.status === "not_required" ||
      !order.paymentProof.publicId
    ) {
      return res.status(404).json({
        success: false,
        message: "This order does not have a payment proof.",
      });
    }

    const url = await getPaymentProofTemporaryUrl(order.paymentProof);

    return res.status(200).json({
      success: true,
      data: {
        url,
        expiresInSeconds: PAYMENT_PROOF_URL_TTL_SECONDS,
        status: order.paymentProof.status,
      },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to open payment proof.",
    });
  }
};

const reviewAdminPaymentProof = async (req, res) => {
  if (!isDatabaseConnected()) {
    return res.status(503).json({
      success: false,
      message: "Database is not connected.",
    });
  }

  const action = String(req.body.action || "").trim().toLowerCase();
  const reason = String(req.body.reason || "").trim();

  if (!["approve", "reject"].includes(action)) {
    return res.status(400).json({
      success: false,
      message: "Payment proof action must be approve or reject.",
    });
  }

  const session = await mongoose.startSession();
  let updatedOrder = null;
  let autoConfirmed = false;
  let previousProofStatus = "";

  try {
    await session.withTransaction(async () => {
      const order = await Order.findById(req.params.id).session(session);

      if (!order) {
        throw new Error("Order not found.");
      }

      if (
        !order.paymentProof ||
        order.paymentProof.status === "not_required"
      ) {
        throw new Error("This order does not have a payment proof to review.");
      }

      if (order.orderStatus === "cancelled") {
        throw new Error("A cancelled order payment proof cannot be reviewed.");
      }

      previousProofStatus = order.paymentProof.status || "";

      if (action === "approve") {
        order.paymentProof.status = "approved";
        order.paymentProof.reviewedAt = new Date();
        order.paymentProof.reviewedBy = req.user?._id || null;
        order.paymentProof.rejectionReason = "";
        order.paymentStatus = "paid";

        if (order.orderStatus === "pending") {
          order.orderStatus = "confirmed";
          order.statusHistory.push({
            status: "confirmed",
            note: "Payment proof approved. Order auto-confirmed.",
            changedBy: req.user?._id || null,
            changedAt: new Date(),
          });
          autoConfirmed = true;
        }
      } else {
        order.paymentProof.status = "rejected";
        order.paymentProof.reviewedAt = new Date();
        order.paymentProof.reviewedBy = req.user?._id || null;
        order.paymentProof.rejectionReason = reason;
        order.paymentStatus = "pending";
      }

      await order.save({ session });
      if (order.orderStatus === "confirmed") {
        await ensureOrderSpinGrant(order, session);
      }
      updatedOrder = order;
    });

    if (updatedOrder) {
      await sendPaymentProofDecisionEmail(updatedOrder, {
        action,
        autoConfirmed,
        previousProofStatus,
        reason,
      });
    }

    return res.status(200).json({
      success: true,
      message:
        action === "approve"
          ? "Payment proof approved and payment marked as paid."
          : "Payment proof rejected. Payment remains pending.",
      data: sanitizeOrderForClient(updatedOrder),
    });
  } catch (error) {
    const status = error.message === "Order not found." ? 404 : 400;

    return res.status(status).json({
      success: false,
      message: error.message || "Failed to review payment proof.",
    });
  } finally {
    await session.endSession();
  }
};

const updateAdminOrderStatus = async (req, res) => {
  if (!isDatabaseConnected()) {
    return res.status(503).json({
      success: false,
      message: "Database is not connected.",
    });
  }

  const { orderStatus, paymentStatus, note, adminNotes } = req.body;

  if (orderStatus && !orderStatuses.includes(orderStatus)) {
    return res.status(400).json({
      success: false,
      message: "Invalid order status.",
    });
  }

  if (paymentStatus && !paymentStatuses.includes(paymentStatus)) {
    return res.status(400).json({
      success: false,
      message: "Invalid payment status.",
    });
  }

  const session = await mongoose.startSession();
  let updatedOrder = null;
  let shouldSendStatusEmail = false;

  try {
    await session.withTransaction(async () => {
      const order = await Order.findById(req.params.id).session(session);

      if (!order) {
        throw new Error("Order not found.");
      }

      if (
        order.orderStatus === "cancelled" &&
        orderStatus &&
        orderStatus !== "cancelled"
      ) {
        throw new Error(
          "A cancelled order cannot be reopened. Create a new order instead."
        );
      }

      if (
        paymentStatus === "paid" &&
        ["submitted", "rejected"].includes(order.paymentProof?.status)
      ) {
        throw new Error(
          "Approve the submitted payment proof before marking this order as paid."
        );
      }

      const isNewCancellation =
        orderStatus === "cancelled" && order.orderStatus !== "cancelled";

      if (orderStatus && orderStatus !== order.orderStatus) {
        const allowedTransitions = {
          pending: ["confirmed", "cancelled"],
          confirmed: ["shipped", "cancelled"],
          shipped: ["delivered"],
          delivered: [],
          cancelled: [],
        };
        if (!allowedTransitions[order.orderStatus]?.includes(orderStatus)) {
          throw new Error(`Order cannot move from ${order.orderStatus} to ${orderStatus}.`);
        }
      }

      if (isNewCancellation) {
        await restoreStock(order.items, session);
        await restoreEntitlement(order, session);
        await decrementDiscountUsage({
          discounts: order.discounts,
          session,
        });
      }

      if (orderStatus && orderStatus !== order.orderStatus) {
        shouldSendStatusEmail = true;
        order.orderStatus = orderStatus;
        order.statusHistory.push({
          status: orderStatus,
          note: note?.trim() || "",
          changedBy: req.user?._id,
          changedAt: new Date(),
        });
      }

      if (paymentStatus) {
        order.paymentStatus = paymentStatus;
      }

      if (typeof adminNotes === "string") {
        order.adminNotes = adminNotes.trim();
      }

      await order.save({ session });
      if (order.orderStatus === "confirmed") {
        await ensureOrderSpinGrant(order, session);
      }
      updatedOrder = order;
    });

    if (shouldSendStatusEmail && updatedOrder) {
      try {
        await sendOrderStatusEmail(updatedOrder);
      } catch (emailError) {
        console.error(
          "Order status updated, but status email failed:",
          emailError.message
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: "Order updated successfully.",
      data: sanitizeOrderForClient(updatedOrder),
    });
  } catch (error) {
    const status = error.message === "Order not found." ? 404 : 400;

    return res.status(status).json({
      success: false,
      message: error.message || "Failed to update order.",
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
  getAdminPaymentProofUrl,
  reviewAdminPaymentProof,
  updateAdminOrderStatus,
};
