const mongoose = require("mongoose");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const { createFirstOrderEntitlement } = require("../services/entitlement.service");
const { ensureSignupSpinGrant, getUserAvailableSpinCount } = require("../services/spinGrant.service");
const { cookieSameSite } = require("../middleware/security.middleware");

const isDatabaseConnected = () => mongoose.connection.readyState === 1;
const authCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production" || cookieSameSite() === "none",
  sameSite: cookieSameSite(),
  maxAge: 30 * 24 * 60 * 60 * 1000,
  path: "/",
});

const publicUser = async (user) => {
  let spinAvailable = false;
  try {
    spinAvailable = (await getUserAvailableSpinCount(user._id)) > 0;
  } catch (error) {
    console.error("Spin availability lookup failed:", error.message);
  }

  return {
    _id: user._id,
    name: user.name,
    email: user.email || "",
    phone: user.phone || "",
    role: user.role,
    addresses: user.addresses || [],
    spinAvailable,
    marketingConsent: user.marketingConsent || { granted: false },
  };
};

const sendAuthResponse = async (res, user, message = "Authenticated successfully") => {
  res.cookie("token", generateToken(user._id), authCookieOptions());
  return res.status(200).json({ success: true, message, data: { user: await publicUser(user) } });
};

const registerCustomer = async (req, res) => {
  try {
    if (!isDatabaseConnected()) return res.status(503).json({ success: false, message: "Database is unavailable." });
    const { name, email, phone, password, marketingConsent = false } = req.body;
    if (!name || !password || (!email && !phone)) return res.status(400).json({ success: false, message: "Name, password, and either email or phone are required." });
    if (String(password).length < 8) return res.status(400).json({ success: false, message: "Password must be at least 8 characters." });
    const cleanEmail = email ? String(email).toLowerCase().trim() : undefined;
    const cleanPhone = phone ? String(phone).trim() : undefined;
    const existingUser = await User.findOne({ $or: [
      ...(cleanEmail ? [{ email: cleanEmail }] : []),
      ...(cleanPhone ? [{ phone: cleanPhone }] : []),
    ] });
    if (existingUser) return res.status(409).json({ success: false, message: "An account with this email or phone already exists." });
    const user = await User.create({
      name: String(name).trim(),
      email: cleanEmail,
      phone: cleanPhone,
      password,
      role: "customer",
      marketingConsent: {
        granted: Boolean(marketingConsent),
        grantedAt: marketingConsent ? new Date() : null,
        source: marketingConsent ? "registration" : "",
      },
    });
    const provisioning = await Promise.allSettled([
      createFirstOrderEntitlement(user._id),
      ensureSignupSpinGrant(user._id),
    ]);
    provisioning
      .filter((result) => result.status === "rejected")
      .forEach((result) => console.error("Post-registration reward provisioning failed:", result.reason?.message || result.reason));

    return sendAuthResponse(res, user, "Account created successfully.");
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Registration failed." });
  }
};

const loginCustomer = async (req, res) => {
  try {
    if (!isDatabaseConnected()) return res.status(503).json({ success: false, message: "Database is unavailable." });
    const { identifier, email, phone, password } = req.body;
    const loginValue = identifier || email || phone;
    if (!loginValue || !password) return res.status(400).json({ success: false, message: "Email/phone and password are required." });
    const cleanValue = String(loginValue).trim().toLowerCase();
    const user = await User.findOne({ role: "customer", isActive: true, $or: [{ email: cleanValue }, { phone: String(loginValue).trim() }] }).select("+password");
    if (!user || !(await user.matchPassword(password))) return res.status(401).json({ success: false, message: "Invalid login details." });
    user.lastLoginAt = new Date();
    await user.save();
    await ensureSignupSpinGrant(user._id).catch((error) => {
      console.error("Signup spin reconciliation failed during login:", error.message);
    });
    return sendAuthResponse(res, user, "Logged in successfully.");
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Login failed." });
  }
};

const loginAdmin = async (req, res) => {
  try {
    if (!isDatabaseConnected()) return res.status(503).json({ success: false, message: "Database is unavailable." });
    const { identifier, email, phone, password } = req.body;
    const loginValue = identifier || email || phone;
    if (!loginValue || !password) return res.status(400).json({ success: false, message: "Email/phone and password are required." });
    const cleanValue = String(loginValue).trim().toLowerCase();
    const user = await User.findOne({ role: "admin", isActive: true, $or: [{ email: cleanValue }, { phone: String(loginValue).trim() }] }).select("+password");
    if (!user || !(await user.matchPassword(password))) return res.status(401).json({ success: false, message: "Invalid admin login details." });
    user.lastLoginAt = new Date();
    await user.save();
    return sendAuthResponse(res, user, "Admin logged in successfully.");
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Admin login failed." });
  }
};

const getMe = async (req, res) => res.status(200).json({ success: true, data: { user: await publicUser(req.user) } });

const logout = async (_req, res) => {
  const base = { httpOnly: true, secure: process.env.NODE_ENV === "production" || cookieSameSite() === "none", sameSite: cookieSameSite(), path: "/" };
  res.clearCookie("token", base);
  res.clearCookie("darb_csrf", { ...base, httpOnly: false });
  return res.status(200).json({ success: true, message: "Logged out successfully." });
};

module.exports = { registerCustomer, loginCustomer, loginAdmin, getMe, logout };
