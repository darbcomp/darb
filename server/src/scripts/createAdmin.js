require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const normalizeEmail = (email = "") => {
  return email.trim().toLowerCase();
};

const createAdmin = async () => {
  try {
    console.log("\n================================");
    console.log("DARB ADMIN SETUP");
    console.log("================================\n");

    const {
      MONGO_URI,
      ADMIN_NAME,
      ADMIN_EMAIL,
      ADMIN_PASSWORD,
      ADMIN_PHONE,
    } = process.env;

    if (!MONGO_URI) {
      throw new Error("MONGO_URI is missing from server/.env");
    }

    if (!ADMIN_NAME?.trim()) {
      throw new Error("ADMIN_NAME is missing from server/.env");
    }

    if (!ADMIN_EMAIL?.trim()) {
      throw new Error("ADMIN_EMAIL is missing from server/.env");
    }

    if (!ADMIN_PASSWORD) {
      throw new Error("ADMIN_PASSWORD is missing from server/.env");
    }

    if (ADMIN_PASSWORD.length < 8) {
      throw new Error(
        "ADMIN_PASSWORD should be at least 8 characters long."
      );
    }

    if (bcrypt.truncates(String(ADMIN_PASSWORD))) {
      throw new Error(
        "ADMIN_PASSWORD is too long. Use 72 UTF-8 bytes or fewer."
      );
    }

    const email = normalizeEmail(ADMIN_EMAIL);

    await mongoose.connect(MONGO_URI);

    console.log("✅ MongoDB connected");
    console.log(`Database: ${mongoose.connection.name}\n`);

    let admin = await User.findOne({ email }).select("+password");

    if (admin) {
      console.log("Existing account found.");
      console.log("Updating it as Darb admin...\n");

      admin.name = ADMIN_NAME.trim();
      admin.email = email;
      admin.password = ADMIN_PASSWORD;
      admin.role = "admin";
      admin.isActive = true;

      if (ADMIN_PHONE?.trim()) {
        admin.phone = ADMIN_PHONE.trim();
      }

      await admin.save();

      console.log("✅ Existing account updated successfully.");
    } else {
      const adminData = {
        name: ADMIN_NAME.trim(),
        email,
        password: ADMIN_PASSWORD,
        role: "admin",
        isActive: true,
      };

      if (ADMIN_PHONE?.trim()) {
        adminData.phone = ADMIN_PHONE.trim();
      }

      admin = await User.create(adminData);

      console.log("✅ New Darb admin created successfully.");
    }

    console.log("\n================================");
    console.log("ADMIN READY");
    console.log("================================");
    console.log(`Name:  ${admin.name}`);
    console.log(`Email: ${admin.email}`);
    console.log(`Role:  ${admin.role}`);
    console.log(`ID:    ${admin._id}`);
    console.log("================================\n");

    console.log("Your password was NOT printed for security.\n");
  } catch (error) {
    console.error("\n❌ Darb admin setup failed\n");
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
};

createAdmin();