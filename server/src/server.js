const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const { notFound, errorHandler } = require("./middleware/error.middleware");
const { ensureCsrfCookie, csrfProtection } = require("./middleware/security.middleware");

dotenv.config();

const authRoutes = require("./routes/auth.routes");
const productRoutes = require("./routes/product.routes");
const categoryRoutes = require("./routes/category.routes");
const orderRoutes = require("./routes/order.routes");
const offerRoutes = require("./routes/offer.routes");
const bundleRoutes = require("./routes/bundle.routes");
const couponRoutes = require("./routes/coupon.routes");
const waitlistRoutes = require("./routes/waitlist.routes");
const reviewRoutes = require("./routes/review.routes");
const adminRoutes = require("./routes/admin.routes");
const settingsRoutes = require("./routes/settings.routes");
const rewardRoutes = require("./routes/reward.routes");
const marketingRoutes = require("./routes/marketing.routes");

const app = express();
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
  exposedHeaders: ["x-csrf-token"],
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use(ensureCsrfCookie);
app.use(csrfProtection);
if (process.env.NODE_ENV !== "production") app.use(morgan("dev"));

app.get("/api/health", (_req, res) => res.status(200).json({ success: true, message: "Darb API is running", database: mongoose.connection.readyState === 1 ? "connected" : "disconnected" }));
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/offers", offerRoutes);
app.use("/api/bundles", bundleRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/waitlist", waitlistRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/rewards", rewardRoutes);
app.use("/api/marketing", marketingRoutes);
app.use(notFound);
app.use(errorHandler);

let server;
const start = async () => {
  await connectDB();
  server = app.listen(PORT, () => console.log(`Darb server running on port ${PORT}`));
};

const shutdown = async (signal) => {
  console.log(`${signal} received. Shutting down Darb API...`);
  if (server) await new Promise((resolve) => server.close(resolve));
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  process.exit(0);
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

start().catch((error) => {
  console.error("Darb API failed to start:", error);
  process.exit(1);
});
