const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productSnapshot: {
      name: { type: String, required: true },
      slug: { type: String, default: "" },
      image: { type: String, default: "" },
      categoryName: { type: String, default: "" },
      categorySlug: { type: String, default: "" },
      sizeLabel: { type: String, default: "" },
      sizeMl: { type: Number, default: 0 },
    },
    variant: {
      variantId: { type: String, default: "" },
      label: { type: String, default: "" },
      sizeMl: { type: Number, default: 0 },
      sku: { type: String, default: "" },
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    compareAtPrice: {
      type: Number,
      min: 0,
      default: 0,
    },
    lineTotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const customerSnapshotSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, default: "" },
  },
  { _id: false }
);

const shippingAddressSchema = new mongoose.Schema(
  {
    governorate: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    street: { type: String, required: true, trim: true },
    building: { type: String, trim: true, default: "" },
    floor: { type: String, trim: true, default: "" },
    apartment: { type: String, trim: true, default: "" },
    notes: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const discountSnapshotSchema = new mongoose.Schema(
  {
    sourceType: {
      type: String,
      enum: ["offer", "bundle", "coupon", "entitlement", "manual"],
      required: true,
    },
    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    name: {
      type: String,
      required: true,
    },
    code: {
      type: String,
      default: "",
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
    },
    note: {
      type: String,
      trim: true,
      default: "",
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const paymentProofSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["not_required", "submitted", "approved", "rejected"],
      default: "not_required",
      index: true,
    },

    // Private R2 object identifiers are intentionally hidden from normal queries.
    publicId: {
      type: String,
      default: "",
      select: false,
    },
    assetId: {
      type: String,
      default: "",
      select: false,
    },
    resourceType: {
      type: String,
      default: "image",
      select: false,
    },
    deliveryType: {
      type: String,
      default: "authenticated",
      select: false,
    },
    format: {
      type: String,
      default: "webp",
      select: false,
    },

    originalName: {
      type: String,
      trim: true,
      default: "",
    },
    bytes: {
      type: Number,
      min: 0,
      default: 0,
    },
    width: {
      type: Number,
      min: 0,
      default: 0,
    },
    height: {
      type: Number,
      min: 0,
      default: 0,
    },
    uploadedAt: {
      type: Date,
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    customerSnapshot: {
      type: customerSnapshotSchema,
      required: true,
    },
    shippingAddress: {
      type: shippingAddressSchema,
      required: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items) => items.length > 0,
        message: "Order must contain at least one item",
      },
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    discountTotal: {
      type: Number,
      min: 0,
      default: 0,
    },
    deliveryFee: {
      type: Number,
      min: 0,
      default: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    discounts: {
      type: [discountSnapshotSchema],
      default: [],
    },
    couponCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },
    paymentMethod: {
      type: String,
      enum: ["cash_on_delivery", "instapay", "vodafone_cash", "paymob_card"],
      default: "cash_on_delivery",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
      index: true,
    },
    paymentProof: {
      type: paymentProofSchema,
      default: () => ({
        status: "not_required",
      }),
    },
    orderStatus: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "shipped",
        "delivered",
        "cancelled",
      ],
      default: "pending",
      index: true,
    },
    customerNotes: {
      type: String,
      trim: true,
      default: "",
    },
    senderName: { type: String, trim: true, default: "" },
    gift: {
      isGift: { type: Boolean, default: false },
      message: { type: String, trim: true, maxlength: 500, default: "" },
    },
    promotion: {
      entitlement: { type: mongoose.Schema.Types.ObjectId, ref: "Entitlement", default: null },
      key: { type: String, default: "" },
      label: { type: String, default: "" },
      origin: { type: String, default: "" },
      freeTester: { type: Boolean, default: false },
    },
    marketingConsent: {
      granted: { type: Boolean, default: false },
      grantedAt: { type: Date, default: null },
      source: { type: String, default: "checkout" },
    },
    birthday: { type: Date, default: null, select: false },
    adminNotes: {
      type: String,
      trim: true,
      default: "",
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

orderSchema.pre("validate", function () {
  if (!this.orderNumber) {
    const random = Math.floor(1000 + Math.random() * 9000);
    this.orderNumber = `DARB-${Date.now()}-${random}`;
  }
});

orderSchema.index({ createdAt: -1 });
orderSchema.index({ orderStatus: 1, paymentStatus: 1 });
orderSchema.index({ "paymentProof.status": 1, createdAt: -1 });

module.exports = mongoose.model("Order", orderSchema);
