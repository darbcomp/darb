const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

const connectDB = require("./config/db");
const { configureCloudinary } = require("./config/cloudinary");
const { notFound, errorHandler } = require("./middleware/error.middleware");

const authRoutes = require("./routes/auth.routes");
const productRoutes = require("./routes/product.routes");
const categoryRoutes = require("./routes/category.routes");
const orderRoutes = require("./routes/order.routes");
const offerRoutes = require("./routes/offer.routes");
const bundleRoutes = require("./routes/bundle.routes");
const couponRoutes = require("./routes/coupon.routes");
const waitlistRoutes = require("./routes/waitlist.routes");
const adminRoutes = require("./routes/admin.routes");
const settingsRoutes = require("./routes/settings.routes");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

connectDB();
configureCloudinary();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Darb API is running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/offers", offerRoutes);
app.use("/api/bundles", bundleRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/waitlist", waitlistRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/settings", settingsRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Darb server running on port ${PORT}`);
});