const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
      index: true,
    },

    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
      index: true,
    },

    displayName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    text: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 1200,
    },
    media: {
      type: { type: String, enum: ["none", "image", "video"], default: "none" },
      url: { type: String, trim: true, default: "" },
      publicId: { type: String, default: "", select: false },
      posterUrl: { type: String, trim: true, default: "" },
      alt: { type: String, trim: true, default: "" },
    },

    fragranceName: {
      type: String,
      trim: true,
      default: "",
      maxlength: 120,
    },

    source: {
      type: String,
      enum: ["customer", "admin"],
      required: true,
      default: "customer",
      index: true,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "hidden"],
      default: "pending",
      index: true,
    },

    isVerifiedPurchase: {
      type: Boolean,
      default: false,
      index: true,
    },

    reviewDate: {
      type: Date,
      default: Date.now,
      index: true,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

reviewSchema.index({
  status: 1,
  reviewDate: -1,
});

reviewSchema.index({
  customer: 1,
  source: 1,
});

const Review =
  mongoose.models.Review ||
  mongoose.model("Review", reviewSchema);

module.exports = Review;
