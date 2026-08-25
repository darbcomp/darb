require("dotenv").config();

const mongoose = require("mongoose");
const { v2: cloudinary } = require("cloudinary");

const testMongoDB = async () => {
  console.log("\n==============================");
  console.log("Testing MongoDB connection...");
  console.log("==============================");

  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing from server/.env");
  }

  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
  });

  console.log("✅ MongoDB connected successfully");
  console.log(`Database: ${mongoose.connection.name}`);
  console.log(`Host: ${mongoose.connection.host}`);
};

const testCloudinary = async () => {
  console.log("\n==============================");
  console.log("Testing Cloudinary connection...");
  console.log("==============================");

  const {
    CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET,
  } = process.env;

  if (
    !CLOUDINARY_CLOUD_NAME ||
    !CLOUDINARY_API_KEY ||
    !CLOUDINARY_API_SECRET
  ) {
    throw new Error(
      "One or more Cloudinary credentials are missing from server/.env"
    );
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });

  const result = await cloudinary.api.ping();

  if (result?.status !== "ok") {
    throw new Error("Cloudinary did not return an OK status.");
  }

  console.log("✅ Cloudinary connected successfully");
  console.log(`Cloud Name: ${CLOUDINARY_CLOUD_NAME}`);
};

const runTests = async () => {
  console.log("\nDARB CONNECTION TEST");
  console.log("Starting...\n");

  let mongoSuccess = false;
  let cloudinarySuccess = false;

  try {
    await testMongoDB();
    mongoSuccess = true;
  } catch (error) {
    console.error("\n❌ MongoDB connection failed");
    console.error(error.message);
  }

  try {
    await testCloudinary();
    cloudinarySuccess = true;
  } catch (error) {
    console.error("\n❌ Cloudinary connection failed");
    console.error(error.message);
  }

  console.log("\n==============================");
  console.log("FINAL RESULT");
  console.log("==============================");

  console.log(
    `MongoDB:    ${mongoSuccess ? "✅ CONNECTED" : "❌ FAILED"}`
  );

  console.log(
    `Cloudinary: ${cloudinarySuccess ? "✅ CONNECTED" : "❌ FAILED"}`
  );

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  console.log("\nConnection test finished.\n");

  if (!mongoSuccess || !cloudinarySuccess) {
    process.exit(1);
  }

  process.exit(0);
};

runTests();