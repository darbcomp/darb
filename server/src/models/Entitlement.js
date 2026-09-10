const mongoose = require("mongoose");

const entitlementSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  key: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: ["percentage", "category_percentage", "free_shipping", "free_tester"],
    required: true,
  },
  origin: { type: String, enum: ["first_order", "spin", "policy"], required: true, index: true },
  label: { type: String, required: true, trim: true },
  code: { type: String, trim: true, uppercase: true, default: "" },
  value: { type: Number, min: 0, default: 0 },
  categorySlug: { type: String, trim: true, lowercase: true, default: "" },
  minSubtotal: { type: Number, min: 0, default: 0 },
  status: { type: String, enum: ["available", "used", "expired"], default: "available", index: true },
  expiresAt: { type: Date, default: null, index: true },
  usedAt: { type: Date, default: null },
  usedOrder: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null },
}, { timestamps: true });

entitlementSchema.index({ user: 1, key: 1 }, { unique: true });
module.exports = mongoose.models.Entitlement || mongoose.model("Entitlement", entitlementSchema);
