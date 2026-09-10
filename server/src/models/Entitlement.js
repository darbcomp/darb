const mongoose = require("mongoose");

const entitlementSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
  ownerPhone: { type: String, trim: true, default: "", select: false, index: true },
  sourceGrant: { type: mongoose.Schema.Types.ObjectId, ref: "SpinGrant", default: null, index: true },
  key: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: ["percentage", "category_percentage", "free_shipping", "free_tester"],
    required: true,
  },
  origin: { type: String, enum: ["first_order", "spin", "policy"], required: true, index: true },
  label: { type: String, required: true, trim: true },
  code: { type: String, trim: true, uppercase: true, default: "", index: true },
  value: { type: Number, min: 0, default: 0 },
  categorySlug: { type: String, trim: true, lowercase: true, default: "" },
  minSubtotal: { type: Number, min: 0, default: 0 },
  status: { type: String, enum: ["available", "used", "expired"], default: "available", index: true },
  expiresAt: { type: Date, default: null, index: true },
  usedAt: { type: Date, default: null },
  usedOrder: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null },
}, { timestamps: true });

entitlementSchema.index(
  { sourceGrant: 1 },
  { name: "unique_spin_source_grant", unique: true, partialFilterExpression: { sourceGrant: { $type: "objectId" } } }
);
entitlementSchema.index(
  { user: 1, origin: 1 },
  { name: "unique_first_order_reward_per_user", unique: true, partialFilterExpression: { origin: "first_order", user: { $type: "objectId" } } }
);
entitlementSchema.index(
  { user: 1, origin: 1 },
  { name: "unique_policy_reward_per_user", unique: true, partialFilterExpression: { origin: "policy", user: { $type: "objectId" } } }
);
entitlementSchema.index({ user: 1, status: 1, expiresAt: 1 });
entitlementSchema.index({ ownerPhone: 1, code: 1, status: 1 });

module.exports = mongoose.models.Entitlement || mongoose.model("Entitlement", entitlementSchema);
