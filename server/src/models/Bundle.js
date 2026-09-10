const mongoose = require("mongoose");

const bundleItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      min: 1,
      default: 1,
    },
  },
  { _id: false }
);

const bundleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Bundle name is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    image: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "", select: false },
      alt: { type: String, default: "" },
    },
    freeDelivery: { type: Boolean, default: false },
    bundleType: {
      type: String,
      enum: ["any_products", "specific_products", "category_products"],
      required: true,
      index: true,
    },
    requiredQuantity: {
      type: Number,
      min: 1,
      default: 1,
    },
    specificItems: {
      type: [bundleItemSchema],
      default: [],
    },
    allowedProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    allowedCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
      },
    ],
    discountType: {
      type: String,
      enum: ["percentage", "fixed", "fixed_bundle_price", "free_shipping"],
      required: true,
    },
    discountValue: {
      type: Number,
      min: 0,
      default: 0,
    },
    minOrderValue: {
      type: Number,
      min: 0,
      default: 0,
    },
    maxApplications: {
      type: Number,
      min: 0,
      default: 0,
    },
    startAt: {
      type: Date,
      default: null,
    },
    endAt: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    priority: {
      type: Number,
      default: 0,
    },
    allowCouponStacking: {
      type: Boolean,
      default: false,
    },
    usageLimit: {
      type: Number,
      min: 0,
      default: 0,
    },
    usedCount: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

bundleSchema.index({ isActive: 1, startAt: 1, endAt: 1 });
bundleSchema.index({ priority: -1 });

module.exports = mongoose.model("Bundle", bundleSchema);
