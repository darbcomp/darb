const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");

const isDatabaseConnected = () => mongoose.connection.readyState === 1;
const getTokenFromRequest = (req) => req.cookies?.token || null;

const protect = async (req, res, next) => {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return res.status(401).json({ success: false, message: "Not authorized. Sign in first." });
    if (!process.env.JWT_SECRET) return res.status(500).json({ success: false, message: "Authentication is not configured." });
    if (!isDatabaseConnected()) return res.status(503).json({ success: false, message: "Database is unavailable." });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user || !user.isActive) return res.status(401).json({ success: false, message: "Not authorized." });
    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ success: false, message: "Not authorized. Your session may have expired." });
  }
};

const optionalAuth = async (req, _res, next) => {
  try {
    const token = getTokenFromRequest(req);
    if (!token || !process.env.JWT_SECRET || !isDatabaseConnected()) return next();
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (user?.isActive) req.user = user;
  } catch {
    // Optional auth deliberately falls through as guest.
  }
  return next();
};

module.exports = { protect, optionalAuth };
