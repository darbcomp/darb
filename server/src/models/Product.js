const mongoose = require("mongoose");
const slugify = require("../utils/slugify");

const productImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, default: "" },
    alt: { type: String, default: "" },
    isMain: { type: Boolean, default: false },
  },
  { _id: false }
);

const scentNotesSchema = new mongoose.Schema(
  {
    top: [{ type: String, trim: true }],
    middle: [{ type: String, trim: true }],
    base: [{ type: String, trim: true }],
  },
  { _id: false }
);

const productVariantSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      trim: true,
      default: "",
    },
    sizeMl: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      min: 0,
      default: 0,
    },
    compareAtPrice: {
      type: Number,
      min: 0,
      default: 0,
    },
    stock: {
      type: Number,
      min: 0,
      default: 0,
    },
    sku: {
      type: String,
      trim: true,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    sku: {
      type: String,
      trim: true,
      default: "",
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Product category is required"],
      index: true,
    },
    categorySnapshot: {
      name: { type: String, default: "" },
      slug: { type: String, default: "" },
    },
    shortDescription: {
      type: String,
      trim: true,
      default: "",
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    price: {
      type: Number,
      required: [true, "Product price is required"],
      min: 0,
      default: 0,
    },
    compareAtPrice: {
      type: Number,
      min: 0,
      default: 0,
    },
    costPrice: {
      type: Number,
      min: 0,
      default: 0,
      select: false,
    },
    sizeLabel: {
      type: String,
      trim: true,
      default: "",
    },
    sizeMl: {
      type: Number,
      min: 0,
      default: 0,
    },
    concentration: {
      type: String,
      trim: true,
      default: "",
    },
    scentFamily: {
      type: String,
      trim: true,
      default: "",
    },
    scentNotes: {
      type: scentNotesSchema,
      default: () => ({
        top: [],
        middle: [],
        base: [],
      }),
    },
    images: {
      type: [productImageSchema],
      default: [],
    },
    variants: {
      type: [productVariantSchema],
      default: [],
    },
    stock: {
      type: Number,
      min: 0,
      default: 0,
      index: true,
    },
    lowStockThreshold: {
      type: Number,
      min: 0,
      default: 3,
    },
    tags: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isPlaceholder: {
      type: Boolean,
      default: false,
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    isBestSeller: {
      type: Boolean,
      default: false,
      index: true,
    },
    isNewArrival: {
      type: Boolean,
      default: false,
      index: true,
    },
    metaTitle: {
      type: String,
      trim: true,
      default: "",
    },
    metaDescription: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

productSchema.pre("validate", function () {
  if (!this.slug && this.name) {
    this.slug = slugify(this.name);
  }
});

productSchema.index({ name: "text", description: "text", tags: "text" });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ price: 1 });

module.exports = mongoose.model("Product", productSchema);