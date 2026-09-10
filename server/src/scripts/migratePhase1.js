require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const Order = require("../models/Order");
const Entitlement = require("../models/Entitlement");
const SpinGrant = require("../models/SpinGrant");
const { ensureSignupSpinGrant, ensureOrderSpinGrant } = require("../services/spinGrant.service");

const dropIndexIfPresent = async (collection, name) => {
  const indexes = await collection.indexes();
  if (indexes.some((index) => index.name === name)) {
    await collection.dropIndex(name);
    console.log(`✅ Dropped obsolete index: ${name}`);
  }
};

const run = async () => {
  try {
    if (process.env.NODE_ENV === "production" && process.env.ALLOW_PHASE1_MIGRATION !== "true") {
      throw new Error("Refusing to run the development Phase 1 migration in production. Set ALLOW_PHASE1_MIGRATION=true only if you explicitly intend to run it.");
    }
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI is missing from server/.env");
    await mongoose.connect(process.env.MONGO_URI, { autoIndex: false });
    console.log(`✅ MongoDB connected: ${mongoose.connection.name}`);

    await dropIndexIfPresent(Entitlement.collection, "user_1_key_1");

    // Old Phase 2 spins were tied to User.spin and have no SpinGrant source.
    // This is a development migration, so remove those stale test rewards before
    // provisioning the new event-based signup/order spin ledger.
    const legacySpinRewards = await Entitlement.deleteMany({
      origin: "spin",
      sourceGrant: { $in: [null] },
    });
    console.log(`✅ Removed ${legacySpinRewards.deletedCount || 0} legacy single-spin reward(s).`);

    const legacyProcessing = await Order.updateMany(
      { orderStatus: "processing" },
      {
        $set: { orderStatus: "confirmed" },
        $push: {
          statusHistory: {
            status: "confirmed",
            note: "Development migration: legacy Processing status normalized to Confirmed.",
            changedAt: new Date(),
          },
        },
      }
    );
    console.log(`✅ Normalized ${legacyProcessing.modifiedCount || 0} legacy Processing order(s).`);

    const legacySpin = await User.updateMany({ spin: { $exists: true } }, { $unset: { spin: "" } });
    console.log(`✅ Removed ${legacySpin.modifiedCount || 0} legacy single-spin field(s).`);

    const customers = await User.find({ role: "customer", isActive: true }).select("_id").lean();
    for (const customer of customers) await ensureSignupSpinGrant(customer._id);
    console.log(`✅ Signup spin grants ensured for ${customers.length} customer(s).`);

    const confirmedOrders = await Order.find({ orderStatus: "confirmed" })
      .select("_id customer customerSnapshot orderStatus")
      .lean();
    for (const order of confirmedOrders) await ensureOrderSpinGrant(order);
    console.log(`✅ Confirmed-order spin grants ensured for ${confirmedOrders.length} order(s).`);

    await Promise.all([Entitlement.syncIndexes(), SpinGrant.syncIndexes(), User.syncIndexes(), Order.syncIndexes()]);
    console.log("✅ Phase 1 indexes synchronized.");
    console.log("\nPhase 1 development migration complete.");
  } catch (error) {
    console.error("❌ Phase 1 migration failed:", error);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  }
};
run();
