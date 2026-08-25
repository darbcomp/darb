const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, "Coupon code is required"],
      trim: true,
      uppercase: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      trim: true,
      default: "",
    },
    description: {
      type: String,
      trim: true,
      default: "",
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
    excludedProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    excludedCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
      },
    ],
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
    perCustomerLimit: {
      type: Number,
      min: 0,
      default: 1,
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
    allowWithOffers: {
      type: Boolean,
      default: false,
    },
    allowWithBundles: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

couponSchema.pre("validate", function () {
  if (this.code) {
    this.code = this.code.trim().toUpperCase();
  }
});

couponSchema.index({ isActive: 1, startAt: 1, endAt: 1 });

const Coupon =
  mongoose.models.Coupon || mongoose.model("Coupon", couponSchema);

module.exports = Coupon;