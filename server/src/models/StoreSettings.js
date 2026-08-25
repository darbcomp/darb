const mongoose = require("mongoose");

const paymentMethodSchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: true,
    },
    label: {
      type: String,
      trim: true,
      default: "",
    },
    instructions: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    _id: false,
  }
);

const storeSettingsSchema = new mongoose.Schema(
  {
    singletonKey: {
      type: String,
      default: "main",
      unique: true,
      index: true,
    },

    storeName: {
      type: String,
      trim: true,
      default: "Darb",
    },

    arabicName: {
      type: String,
      trim: true,
      default: "درب",
    },

    tagline: {
      type: String,
      trim: true,
      default: "A scent for every path.",
    },

    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: "EGP",
    },

    contact: {
      phone: {
        type: String,
        trim: true,
        default: "",
      },
      whatsapp: {
        type: String,
        trim: true,
        default: "",
      },
      email: {
        type: String,
        trim: true,
        lowercase: true,
        default: "",
      },
      instagram: {
        type: String,
        trim: true,
        default: "",
      },
      facebook: {
        type: String,
        trim: true,
        default: "",
      },
      tiktok: {
        type: String,
        trim: true,
        default: "",
      },
    },

    delivery: {
      defaultFee: {
        type: Number,
        default: 0,
      },
      freeDeliveryThreshold: {
        type: Number,
        default: 0,
      },
      estimatedDeliveryText: {
        type: String,
        trim: true,
        default: "Delivery timing will be confirmed after placing the order.",
      },
    },

    paymentMethods: {
      cashOnDelivery: {
        type: paymentMethodSchema,
        default: () => ({
          enabled: true,
          label: "Cash on Delivery",
          instructions: "Pay when your Darb order arrives.",
        }),
      },
      instapay: {
        type: paymentMethodSchema,
        default: () => ({
          enabled: false,
          label: "InstaPay",
          instructions: "",
        }),
      },
      vodafoneCash: {
        type: paymentMethodSchema,
        default: () => ({
          enabled: false,
          label: "Vodafone Cash",
          instructions: "",
        }),
      },
      paymobCard: {
        type: paymentMethodSchema,
        default: () => ({
          enabled: false,
          label: "Card Payment",
          instructions: "Card payment will be available soon.",
        }),
      },
    },

    orderSettings: {
      allowGuestCheckout: {
        type: Boolean,
        default: true,
      },
      autoConfirmPaidOrders: {
        type: Boolean,
        default: false,
      },
      lowStockDefault: {
        type: Number,
        default: 3,
      },
    },

    brand: {
      darkGreen: {
        type: String,
        trim: true,
        default: "#0F3D2E",
      },
      beige: {
        type: String,
        trim: true,
        default: "#E7DCC9",
      },
      softGold: {
        type: String,
        trim: true,
        default: "#C8A97E",
      },
      black: {
        type: String,
        trim: true,
        default: "#1C1C1C",
      },
      cream: {
        type: String,
        trim: true,
        default: "#F7F1E6",
      },
    },

    seo: {
      metaTitle: {
        type: String,
        trim: true,
        default: "Darb Perfumes",
      },
      metaDescription: {
        type: String,
        trim: true,
        default:
          "Darb is more than perfume — it is a journey, a memory in every step.",
      },
    },
  },
  {
    timestamps: true,
  }
);

const StoreSettings =
  mongoose.models.StoreSettings ||
  mongoose.model("StoreSettings", storeSettingsSchema);

module.exports = StoreSettings;