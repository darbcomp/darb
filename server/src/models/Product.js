const mongoose = require("mongoose");
const slugify = require("../utils/slugify");

const productImageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  publicId: { type: String, default: "" }, // R2 object key; kept for frontend compatibility
  storageKey: { type: String, default: "" },
  provider: { type: String, enum: ["r2", "legacy", ""], default: "r2" },
  alt: { type: String, default: "" },
  isMain: { type: Boolean, default: false },
}, { _id: false });

const scentNotesSchema = new mongoose.Schema({
  top: [{ type: String, trim: true }],
  middle: [{ type: String, trim: true }],
  base: [{ type: String, trim: true }],
}, { _id: false });

const productVariantSchema = new mongoose.Schema({
  label: { type: String, trim: true, default: "" },
  sizeMl: { type: Number, min: 0, default: 0 },
  price: { type: Number, min: 0, default: 0 },
  compareAtPrice: { type: Number, min: 0, default: 0 },
  stock: { type: Number, min: 0, default: 0 },
  sku: { type: String, trim: true, default: "" },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const productSchema = new mongoose.Schema({
  name: { type: String, required: [true, "Product name is required"], trim: true },
  arabicName: { type: String, trim: true, default: "" },
  slug: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
  sku: { type: String, trim: true, default: "" },
  productType: { type: String, enum: ["perfume", "musk"], default: "perfume", index: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: [true, "Product category is required"], index: true },
  categorySnapshot: {
    name: { type: String, default: "" },
    slug: { type: String, default: "" },
  },
  categories: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }], default: [], index: true },
  inspiredBy: { type: String, trim: true, default: "" },
  arabicInspiredBy: { type: String, trim: true, default: "" },
  shortDescription: { type: String, trim: true, default: "" },
  arabicShortDescription: { type: String, trim: true, default: "" },
  description: { type: String, trim: true, default: "" },
  arabicDescription: { type: String, trim: true, default: "" },
  price: { type: Number, required: [true, "Product price is required"], min: 0, default: 0 },
  compareAtPrice: { type: Number, min: 0, default: 0 },
  costPrice: { type: Number, min: 0, default: 0, select: false },
  sizeLabel: { type: String, trim: true, default: "" },
  sizeMl: { type: Number, min: 0, default: 0 },
  concentration: { type: String, trim: true, default: "" },
  scentFamily: { type: String, trim: true, default: "" },
  scentFamilies: { type: [String], default: [] },
  arabicScentFamilies: { type: [String], default: [] },
  bestFor: { type: [String], default: [] },
  arabicBestFor: { type: [String], default: [] },
  keyNotes: { type: [String], default: [] },
  arabicKeyNotes: { type: [String], default: [] },
  scentNotes: { type: scentNotesSchema, default: () => ({ top: [], middle: [], base: [] }) },
  arabicScentNotes: { type: scentNotesSchema, default: () => ({ top: [], middle: [], base: [] }) },
  images: {
    type: [productImageSchema],
    default: [],
    validate: {
      validator: (images) => images.length <= 10,
      message: "A product can have a maximum of 10 images.",
    },
  },
  variants: { type: [productVariantSchema], default: [] },
  stock: { type: Number, min: 0, default: 0, index: true },
  lowStockThreshold: { type: Number, min: 0, default: 3 },
  tags: { type: [String], default: [] },
  isActive: { type: Boolean, default: true, index: true },
  isPlaceholder: { type: Boolean, default: false, index: true },
  isFeatured: { type: Boolean, default: false, index: true },
  isBestSeller: { type: Boolean, default: false, index: true },
  isNewArrival: { type: Boolean, default: false, index: true },
  metaTitle: { type: String, trim: true, default: "" },
  metaDescription: { type: String, trim: true, default: "" },
}, { timestamps: true });

productSchema.pre("validate", function () {
  if (!this.slug && this.name) this.slug = slugify(this.name);
  this.scentFamilies = [...new Set((this.scentFamilies || []).map((v) => String(v).trim()).filter(Boolean))];
  this.bestFor = [...new Set((this.bestFor || []).map((v) => String(v).trim()).filter(Boolean))];
  this.keyNotes = [...new Set((this.keyNotes || []).map((v) => String(v).trim()).filter(Boolean))];
  this.arabicScentFamilies = [...new Set((this.arabicScentFamilies || []).map((v) => String(v).trim()).filter(Boolean))];
  this.arabicBestFor = [...new Set((this.arabicBestFor || []).map((v) => String(v).trim()).filter(Boolean))];
  this.arabicKeyNotes = [...new Set((this.arabicKeyNotes || []).map((v) => String(v).trim()).filter(Boolean))];
  if (!this.scentFamily && this.scentFamilies.length) this.scentFamily = this.scentFamilies.join(" • ");
  if ((!this.scentFamilies || !this.scentFamilies.length) && this.scentFamily) {
    this.scentFamilies = String(this.scentFamily).split(/\s*[•,]\s*/).map((v) => v.trim()).filter(Boolean);
  }
  if (this.images?.length && !this.images.some((image) => image.isMain)) this.images[0].isMain = true;
});

productSchema.index({ name: "text", arabicName: "text", inspiredBy: "text", arabicInspiredBy: "text", description: "text", arabicDescription: "text", tags: "text", scentFamilies: "text", arabicScentFamilies: "text", bestFor: "text", arabicBestFor: "text", keyNotes: "text", arabicKeyNotes: "text" });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ categories: 1, isActive: 1 });
productSchema.index({ productType: 1, isActive: 1 });
productSchema.index({ price: 1 });

module.exports = mongoose.models.Product || mongoose.model("Product", productSchema);
