const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const addressSchema = new mongoose.Schema({
  label: { type: String, trim: true, default: "Address" },
  governorate: { type: String, trim: true, default: "" },
  city: { type: String, trim: true, default: "" },
  street: { type: String, trim: true, default: "" },
  building: { type: String, trim: true, default: "" },
  floor: { type: String, trim: true, default: "" },
  apartment: { type: String, trim: true, default: "" },
  notes: { type: String, trim: true, default: "" },
  isDefault: { type: Boolean, default: false },
}, { _id: true });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, trim: true, lowercase: true, unique: true, sparse: true, default: undefined },
  phone: { type: String, trim: true, unique: true, sparse: true, default: undefined },
  password: { type: String, required: true, minlength: 6, select: false },
  role: { type: String, enum: ["customer", "admin"], default: "customer", index: true },
  addresses: { type: [addressSchema], default: [] },
  birthday: { type: Date, default: null, select: false },
  marketingConsent: {
    granted: { type: Boolean, default: false },
    grantedAt: { type: Date, default: null },
    source: { type: String, default: "" },
  },
  isActive: { type: Boolean, default: true, index: true },
  lastLoginAt: { type: Date, default: null },
}, { timestamps: true });

userSchema.pre("validate", function () {
  if (!this.email && !this.phone) this.invalidate("email", "Either an email address or phone number is required.");
});
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return bcrypt.compare(enteredPassword, this.password);
};
userSchema.methods.toSafeObject = function () {
  return {
    _id: this._id,
    name: this.name,
    email: this.email || "",
    phone: this.phone || "",
    role: this.role,
    addresses: this.addresses || [],
    marketingConsent: this.marketingConsent || { granted: false },
    isActive: this.isActive,
    lastLoginAt: this.lastLoginAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
