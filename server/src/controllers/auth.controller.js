const mongoose = require("mongoose");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");

const isDatabaseConnected = () => mongoose.connection.readyState === 1;

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

const sendAuthResponse = (res, user, message = "Authenticated successfully") => {
  const token = generateToken(user._id);

  res.cookie("token", token, cookieOptions);

  return res.status(200).json({
    success: true,
    message,
    token,
    data: {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email || "",
        phone: user.phone || "",
        role: user.role,
      },
    },
  });
};

const registerCustomer = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database is not connected. Registration is unavailable for now.",
      });
    }

    const { name, email, phone, password } = req.body;

    if (!name || !password || (!email && !phone)) {
      return res.status(400).json({
        success: false,
        message: "Name, password, and either email or phone are required.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters.",
      });
    }

    const existingUser = await User.findOne({
      $or: [
        ...(email ? [{ email: email.toLowerCase().trim() }] : []),
        ...(phone ? [{ phone: phone.trim() }] : []),
      ],
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email or phone already exists.",
      });
    }

    const user = await User.create({
      name: name.trim(),
      email: email ? email.toLowerCase().trim() : undefined,
      phone: phone ? phone.trim() : undefined,
      password,
      role: "customer",
    });

    return sendAuthResponse(res, user, "Account created successfully.");
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Registration failed.",
    });
  }
};

const loginCustomer = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database is not connected. Login is unavailable for now.",
      });
    }

    const { identifier, email, phone, password } = req.body;
    const loginValue = identifier || email || phone;

    if (!loginValue || !password) {
      return res.status(400).json({
        success: false,
        message: "Email/phone and password are required.",
      });
    }

    const cleanValue = loginValue.trim().toLowerCase();

    const user = await User.findOne({
      role: "customer",
      isActive: true,
      $or: [{ email: cleanValue }, { phone: loginValue.trim() }],
    }).select("+password");

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({
        success: false,
        message: "Invalid login details.",
      });
    }

    user.lastLoginAt = new Date();
    await user.save();

    return sendAuthResponse(res, user, "Logged in successfully.");
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Login failed.",
    });
  }
};

const loginAdmin = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database is not connected. Admin login is unavailable for now.",
      });
    }

    const { identifier, email, phone, password } = req.body;
    const loginValue = identifier || email || phone;

    if (!loginValue || !password) {
      return res.status(400).json({
        success: false,
        message: "Email/phone and password are required.",
      });
    }

    const cleanValue = loginValue.trim().toLowerCase();

    const user = await User.findOne({
      role: "admin",
      isActive: true,
      $or: [{ email: cleanValue }, { phone: loginValue.trim() }],
    }).select("+password");

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({
        success: false,
        message: "Invalid admin login details.",
      });
    }

    user.lastLoginAt = new Date();
    await user.save();

    return sendAuthResponse(res, user, "Admin logged in successfully.");
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Admin login failed.",
    });
  }
};

const getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      user: {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email || "",
        phone: req.user.phone || "",
        role: req.user.role,
        addresses: req.user.addresses || [],
      },
    },
  });
};

const logout = async (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });

  return res.status(200).json({
    success: true,
    message: "Logged out successfully.",
  });
};

module.exports = {
  registerCustomer,
  loginCustomer,
  loginAdmin,
  getMe,
  logout,
};