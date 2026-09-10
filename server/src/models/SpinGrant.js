const mongoose = require("mongoose");

const spinGrantSchema = new mongoose.Schema({
  source: { type: String, enum: ["signup", "order"], required: true, index: true },
  ownerUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
  ownerPhone: { type: String, default: "", trim: true, select: false, index: true },
  ownerPhoneLast4: { type: String, default: "", trim: true },
  sourceOrder: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null, index: true },
  status: { type: String, enum: ["available", "claimed"], default: "available", index: true },
  claimedAt: { type: Date, default: null },
  claimedByUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  entitlement: { type: mongoose.Schema.Types.ObjectId, ref: "Entitlement", default: null },
}, { timestamps: true });

spinGrantSchema.index(
  { sourceOrder: 1 },
  { unique: true, partialFilterExpression: { sourceOrder: { $type: "objectId" } } }
);
spinGrantSchema.index(
  { ownerUser: 1, source: 1 },
  { unique: true, partialFilterExpression: { source: "signup", ownerUser: { $type: "objectId" } } }
);
spinGrantSchema.index({ ownerUser: 1, status: 1, createdAt: 1 });
spinGrantSchema.index({ ownerPhone: 1, status: 1, createdAt: 1 });

module.exports = mongoose.models.SpinGrant || mongoose.model("SpinGrant", spinGrantSchema);
