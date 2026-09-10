require("dotenv").config();
const mongoose = require("mongoose");
const { testR2Connection } = require("../config/r2");

const run = async () => {
  let mongoOk = false;
  let r2Ok = false;
  try {
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI is missing from server/.env");
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
    mongoOk = true;
    console.log(`✅ MongoDB: ${mongoose.connection.name}`);
  } catch (error) {
    console.error("❌ MongoDB:", error.message);
  }
  try {
    const result = await testR2Connection();
    r2Ok = true;
    console.log(`✅ Cloudflare R2 public: ${result.publicBucket}`);
    console.log(`✅ Cloudflare R2 private: ${result.privateBucket}`);
    console.log(`   Media base: ${result.publicBaseUrl}`);
  } catch (error) {
    console.error("❌ Cloudflare R2:", error.message);
  }
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  if (!mongoOk || !r2Ok) process.exitCode = 1;
};
run();
