const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Offer name is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    offerType: {
      type: String,
      enum: ["sitewide", "category", "product", "free_shipping"],
      required: true,
      index: true,
    },
    discountType: {
      type: String,
      enum: ["percentage", "fixed", "free_shipping"],
      required: true,
    },
    discountValue: {
      type: Number,
      min: 0,
      default: 0,
    },
    categories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
      },
    ],
    products: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    minQuantity: {
      type: Number,
      min: 0,
      default: 0,
    },
    minOrderValue: {
      type: Number,
      min: 0,
      default: 0,
    },
    maxDiscountAmount: {
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
    allowStacking: {
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

offerSchema.index({ isActive: 1, startAt: 1, endAt: 1 });
offerSchema.index({ priority: -1 });

module.exports = mongoose.model("Offer", offerSchema);