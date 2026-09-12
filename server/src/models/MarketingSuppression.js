const mongoose = require("mongoose");

const marketingSuppressionSchema = new mongoose.Schema({
  normalizedEmail: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
  reason: { type: String, trim: true, default: "unsubscribe" },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true });

module.exports = mongoose.models.MarketingSuppression
  || mongoose.model("MarketingSuppression", marketingSuppressionSchema);
