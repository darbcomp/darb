const mongoose = require("mongoose");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const { createFirstOrderEntitlement } = require("../services/entitlement.service");
const { ensureSignupSpinGrant, getUserAvailableSpinCount } = require("../services/spinGrant.service");
const { cookieSameSite } = require("../middleware/security.middleware");
const { extractMetaContext, sendMetaEvent } = require("../services/metaCapi.service");
const { normalizeEgyptPhone, getEgyptPhoneIdentityVariants, formatEgyptPhoneForDisplay } = require("../utils/normalizePhone");
const { sendInternalError } = require("../utils/httpError");
const { sendRegistrationEmails } = require("../services/transactionalEmail.service");

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
    phone: formatEgyptPhoneForDisplay(user.phone),
    role: user.role,
    addresses: user.addresses || [],
    spinAvailable,
    marketingConsent: user.marketingConsent || { granted: false },
  };
};

const sendAuthResponse = async (res, user, message = "Authenticated successfully", metaEventId = "") => {
  res.cookie("token", generateToken(user._id), authCookieOptions());
  return res.status(200).json({
    success: true,
    message,
    data: { user: await publicUser(user) },
    ...(metaEventId ? { metaEventId } : {}),
  });
};

const registerCustomer = async (req, res) => {
  try {
    if (!isDatabaseConnected()) return res.status(503).json({ success: false, message: "Database is unavailable." });
    const { name, email, phone, password, marketingConsent = false, trackingContext } = req.body;
    const metaContext = extractMetaContext(trackingContext, req);
    if (!name || !password || (!email && !phone)) return res.status(400).json({ success: false, message: "Name, password, and either email or phone are required." });
    if (String(name).trim().length > 120) return res.status(400).json({ success: false, message: "Name is too long." });
    if (phone && String(phone).length > 40) return res.status(400).json({ success: false, message: "Phone number is too long." });
    if (String(password).length < 8) return res.status(400).json({ success: false, message: "Password must be at least 8 characters." });
    if (String(password).length > 128) return res.status(400).json({ success: false, message: "Password must be 128 characters or fewer." });
    const cleanEmail = email ? String(email).toLowerCase().trim() : undefined;
    if (cleanEmail && (cleanEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail))) return res.status(400).json({ success: false, message: "Enter a valid email address." });
    const cleanPhone = phone ? normalizeEgyptPhone(phone) : undefined;
    if (phone && !cleanPhone) return res.status(400).json({ success: false, message: "Enter a valid Egyptian mobile number." });
    const existingUser = await User.findOne({ $or: [
      ...(cleanEmail ? [{ email: cleanEmail }] : []),
      ...(cleanPhone ? [{ phone: { $in: getEgyptPhoneIdentityVariants(cleanPhone) } }] : []),
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

    if (metaContext) {
      await sendMetaEvent({
        eventName: "CompleteRegistration",
        eventId: metaContext.eventId,
        eventSourceUrl: metaContext.eventSourceUrl,
        customData: { status: "completed" },
        userData: {
          email: user.email,
          phone: user.phone,
          externalId: user._id,
          ...metaContext,
        },
      });
    }

    await sendRegistrationEmails(user);

    return sendAuthResponse(res, user, "Account created successfully.", metaContext?.eventId || "");
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ success: false, message: "An account with this email or phone already exists." });
    return sendInternalError(res, error, "Customer registration failed", "Registration failed.");
  }
};

const loginCustomer = async (req, res) => {
  try {
    if (!isDatabaseConnected()) return res.status(503).json({ success: false, message: "Database is unavailable." });
    const { identifier, email, phone, password } = req.body;
    const loginValue = identifier || email || phone;
    if (!loginValue || !password) return res.status(400).json({ success: false, message: "Email/phone and password are required." });
    if (String(loginValue).length > 254 || String(password).length > 128) return res.status(400).json({ success: false, message: "Invalid login details." });
    const cleanValue = String(loginValue).trim().toLowerCase();
    const normalizedPhone = normalizeEgyptPhone(loginValue);
    const identities = [{ email: cleanValue }];
    if (normalizedPhone) identities.push({ phone: { $in: getEgyptPhoneIdentityVariants(normalizedPhone) } });
    const user = await User.findOne({ role: "customer", isActive: true, $or: identities }).select("+password");
    if (!user || !(await user.matchPassword(password))) return res.status(401).json({ success: false, message: "Invalid login details." });
    user.lastLoginAt = new Date();
    await user.save();
    await ensureSignupSpinGrant(user._id).catch((error) => {
      console.error("Signup spin reconciliation failed during login:", error.message);
    });
    return sendAuthResponse(res, user, "Logged in successfully.");
  } catch (error) {
    return sendInternalError(res, error, "Customer login failed", "Login failed.");
  }
};

const loginAdmin = async (req, res) => {
  try {
    if (!isDatabaseConnected()) return res.status(503).json({ success: false, message: "Database is unavailable." });
    const { identifier, email, phone, password } = req.body;
    const loginValue = identifier || email || phone;
    if (!loginValue || !password) return res.status(400).json({ success: false, message: "Email/phone and password are required." });
    if (String(loginValue).length > 254 || String(password).length > 128) return res.status(400).json({ success: false, message: "Invalid admin login details." });
    const cleanValue = String(loginValue).trim().toLowerCase();
    const normalizedPhone = normalizeEgyptPhone(loginValue);
    const identities = [{ email: cleanValue }];
    if (normalizedPhone) identities.push({ phone: { $in: getEgyptPhoneIdentityVariants(normalizedPhone) } });
    const user = await User.findOne({ role: "admin", isActive: true, $or: identities }).select("+password");
    if (!user || !(await user.matchPassword(password))) return res.status(401).json({ success: false, message: "Invalid admin login details." });
    user.lastLoginAt = new Date();
    await user.save();
    return sendAuthResponse(res, user, "Admin logged in successfully.");
  } catch (error) {
    return sendInternalError(res, error, "Admin login failed", "Admin login failed.");
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
