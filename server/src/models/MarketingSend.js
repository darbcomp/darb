const mongoose = require("mongoose");

const marketingSendSchema = new mongoose.Schema({
  requestId: { type: String, required: true, unique: true, index: true },
  promotionType: { type: String, enum: ["offer", "bundle", "coupon"], required: true },
  promotion: { type: mongoose.Schema.Types.ObjectId, required: true },
  status: { type: String, enum: ["processing", "completed", "failed"], default: "processing" },
  eligibleCount: { type: Number, default: 0 },
  attemptedCount: { type: Number, default: 0 },
  sentCount: { type: Number, default: 0 },
  failedCount: { type: Number, default: 0 },
  initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  completedAt: { type: Date, default: null },
}, { timestamps: true });

marketingSendSchema.index({ promotionType: 1, promotion: 1, createdAt: -1 });

module.exports = mongoose.models.MarketingSend || mongoose.model("MarketingSend", marketingSendSchema);
