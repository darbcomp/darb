const { randomBytes, timingSafeEqual } = require("crypto");
const rateLimit = require("express-rate-limit");

const cookieSameSite = () => {
  const configured = String(process.env.COOKIE_SAME_SITE || "").toLowerCase();
  if (["lax", "strict", "none"].includes(configured)) return configured;
  return process.env.NODE_ENV === "production" ? "none" : "lax";
};

const csrfCookieOptions = () => ({
  // The browser does not need to read this cookie. The matching token is also
  // returned in an exposed response header, which works even when the frontend
  // and API live on different hosts during deployment.
  httpOnly: true,
  secure: process.env.NODE_ENV === "production" || cookieSameSite() === "none",
  sameSite: cookieSameSite(),
  maxAge: 30 * 24 * 60 * 60 * 1000,
  path: "/",
});

const ensureCsrfCookie = (req, res, next) => {
  const token = req.cookies?.darb_csrf || randomBytes(24).toString("hex");
  if (!req.cookies?.darb_csrf) {
    res.cookie("darb_csrf", token, csrfCookieOptions());
  }
  // Axios captures this header and sends it back on authenticated mutations.
  res.setHeader("x-csrf-token", token);
  next();
};

const equalTokens = (a, b) => {
  if (!a || !b) return false;
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && timingSafeEqual(left, right);
};

const csrfProtection = (req, res, next) => {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();
  // Guest endpoints do not use ambient authentication cookies and therefore do
  // not need CSRF protection. They are protected separately by validation/rate limits.
  if (!req.cookies?.token) return next();
  // Login/register create the authenticated session, so no authenticated cookie
  // exists yet. Keeping these explicit also makes the intended boundary clear.
  if (/^\/api\/auth\/(register|login|admin\/login)$/.test(req.path)) return next();
  // This public action is authorized by a signed, purpose-bound token rather
  // than ambient login state. It must also work when a signed-in customer
  // opens the email link without first loading an API CSRF token.
  if (req.path === "/api/marketing/unsubscribe") return next();

  const cookieToken = req.cookies?.darb_csrf;
  const headerToken = req.get("x-csrf-token");
  if (!equalTokens(cookieToken, headerToken)) {
    return res.status(403).json({
      success: false,
      message: "Your session security token is missing or expired. Refresh and try again.",
    });
  }
  return next();
};

const makeLimiter = ({ windowMs, limit, message }) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { success: false, message },
  });

const authLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 25,
  message: "Too many authentication attempts. Please try again later.",
});
const adminAuthLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: "Too many admin login attempts. Please try again later.",
});
const trackingLimiter = makeLimiter({
  windowMs: 10 * 60 * 1000,
  limit: 40,
  message: "Too many tracking attempts. Please wait and try again.",
});
const guestRewardLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 12,
  message: "Too many reward claim attempts. Please wait and try again.",
});
const orderCreateLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: "Too many order attempts. Please wait a little and try again.",
});
const marketingEventLimiter = makeLimiter({
  windowMs: 10 * 60 * 1000,
  limit: 120,
  message: "Too many measurement events. Please try again later.",
});
const waitlistLimiter = makeLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  message: "Too many waitlist requests. Please try again later.",
});
const couponValidationLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  message: "Too many coupon checks. Please wait and try again.",
});
const orderPreviewLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  message: "Too many checkout previews. Please wait and try again.",
});
const searchSuggestionLimiter = makeLimiter({
  windowMs: 10 * 60 * 1000,
  limit: 120,
  message: "Too many searches. Please wait and try again.",
});

module.exports = {
  cookieSameSite,
  csrfCookieOptions,
  ensureCsrfCookie,
  csrfProtection,
  authLimiter,
  adminAuthLimiter,
  trackingLimiter,
  guestRewardLimiter,
  orderCreateLimiter,
  marketingEventLimiter,
  waitlistLimiter,
  couponValidationLimiter,
  orderPreviewLimiter,
  searchSuggestionLimiter,
};
