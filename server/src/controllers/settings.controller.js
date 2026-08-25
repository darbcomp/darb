const mongoose = require("mongoose");
const StoreSettings = require("../models/StoreSettings");

const isDatabaseConnected = () => mongoose.connection.readyState === 1;

const defaultSettings = {
  storeName: "Darb",
  arabicName: "درب",
  tagline: "A scent for every path.",
  currency: "EGP",
  contact: {
    phone: "",
    whatsapp: "",
    email: "",
    instagram: "",
    facebook: "",
    tiktok: "",
  },
  delivery: {
    defaultFee: 0,
    freeDeliveryThreshold: 0,
    estimatedDeliveryText:
      "Delivery timing will be confirmed after placing the order.",
  },
  paymentMethods: {
    cashOnDelivery: {
      enabled: true,
      label: "Cash on Delivery",
      instructions: "Pay when your Darb order arrives.",
    },
    instapay: {
      enabled: false,
      label: "InstaPay",
      instructions: "",
    },
    vodafoneCash: {
      enabled: false,
      label: "Vodafone Cash",
      instructions: "",
    },
    paymobCard: {
      enabled: false,
      label: "Card Payment",
      instructions: "Card payment will be available soon.",
    },
  },
  orderSettings: {
    allowGuestCheckout: true,
    autoConfirmPaidOrders: false,
    lowStockDefault: 3,
  },
  brand: {
    darkGreen: "#0F3D2E",
    beige: "#E7DCC9",
    softGold: "#C8A97E",
    black: "#1C1C1C",
    cream: "#F7F1E6",
  },
  seo: {
    metaTitle: "Darb Perfumes",
    metaDescription:
      "Darb is more than perfume — it is a journey, a memory in every step.",
  },
};

const parseBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === "") return defaultValue;

  if (typeof value === "boolean") return value;

  return String(value).toLowerCase() === "true";
};

const parseNumber = (value, defaultValue = 0) => {
  if (value === undefined || value === null || value === "") return defaultValue;

  const number = Number(value);

  return Number.isFinite(number) ? number : defaultValue;
};

const cleanString = (value, fallback = "") => {
  if (value === undefined || value === null) return fallback;

  return String(value).trim();
};

const getOrCreateSettings = async () => {
  let settings = await StoreSettings.findOne({ singletonKey: "main" });

  if (!settings) {
    settings = await StoreSettings.create({
      singletonKey: "main",
      ...defaultSettings,
    });
  }

  return settings;
};

const buildSettingsPayload = (body = {}) => {
  return {
    storeName: cleanString(body.storeName, defaultSettings.storeName),
    arabicName: cleanString(body.arabicName, defaultSettings.arabicName),
    tagline: cleanString(body.tagline, defaultSettings.tagline),
    currency: cleanString(body.currency, defaultSettings.currency).toUpperCase(),

    contact: {
      phone: cleanString(body.contact?.phone),
      whatsapp: cleanString(body.contact?.whatsapp),
      email: cleanString(body.contact?.email).toLowerCase(),
      instagram: cleanString(body.contact?.instagram),
      facebook: cleanString(body.contact?.facebook),
      tiktok: cleanString(body.contact?.tiktok),
    },

    delivery: {
      defaultFee: parseNumber(body.delivery?.defaultFee, 0),
      freeDeliveryThreshold: parseNumber(body.delivery?.freeDeliveryThreshold, 0),
      estimatedDeliveryText: cleanString(
        body.delivery?.estimatedDeliveryText,
        defaultSettings.delivery.estimatedDeliveryText
      ),
    },

    paymentMethods: {
      cashOnDelivery: {
        enabled: parseBoolean(
          body.paymentMethods?.cashOnDelivery?.enabled,
          true
        ),
        label: cleanString(
          body.paymentMethods?.cashOnDelivery?.label,
          "Cash on Delivery"
        ),
        instructions: cleanString(
          body.paymentMethods?.cashOnDelivery?.instructions,
          "Pay when your Darb order arrives."
        ),
      },
      instapay: {
        enabled: parseBoolean(body.paymentMethods?.instapay?.enabled, false),
        label: cleanString(body.paymentMethods?.instapay?.label, "InstaPay"),
        instructions: cleanString(
          body.paymentMethods?.instapay?.instructions,
          ""
        ),
      },
      vodafoneCash: {
        enabled: parseBoolean(
          body.paymentMethods?.vodafoneCash?.enabled,
          false
        ),
        label: cleanString(
          body.paymentMethods?.vodafoneCash?.label,
          "Vodafone Cash"
        ),
        instructions: cleanString(
          body.paymentMethods?.vodafoneCash?.instructions,
          ""
        ),
      },
      paymobCard: {
        enabled: parseBoolean(body.paymentMethods?.paymobCard?.enabled, false),
        label: cleanString(
          body.paymentMethods?.paymobCard?.label,
          "Card Payment"
        ),
        instructions: cleanString(
          body.paymentMethods?.paymobCard?.instructions,
          "Card payment will be available soon."
        ),
      },
    },

    orderSettings: {
      allowGuestCheckout: parseBoolean(
        body.orderSettings?.allowGuestCheckout,
        true
      ),
      autoConfirmPaidOrders: parseBoolean(
        body.orderSettings?.autoConfirmPaidOrders,
        false
      ),
      lowStockDefault: parseNumber(body.orderSettings?.lowStockDefault, 3),
    },

    brand: {
      darkGreen: cleanString(body.brand?.darkGreen, "#0F3D2E"),
      beige: cleanString(body.brand?.beige, "#E7DCC9"),
      softGold: cleanString(body.brand?.softGold, "#C8A97E"),
      black: cleanString(body.brand?.black, "#1C1C1C"),
      cream: cleanString(body.brand?.cream, "#F7F1E6"),
    },

    seo: {
      metaTitle: cleanString(body.seo?.metaTitle, "Darb Perfumes"),
      metaDescription: cleanString(
        body.seo?.metaDescription,
        defaultSettings.seo.metaDescription
      ),
    },
  };
};

const getPublicSettings = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(200).json({
        success: true,
        message: "Database not connected. Returning default public settings.",
        data: defaultSettings,
      });
    }

    const settings = await getOrCreateSettings();

    return res.status(200).json({
      success: true,
      data: {
        storeName: settings.storeName,
        arabicName: settings.arabicName,
        tagline: settings.tagline,
        currency: settings.currency,
        contact: settings.contact,
        delivery: settings.delivery,
        paymentMethods: settings.paymentMethods,
        brand: settings.brand,
        seo: settings.seo,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch public settings.",
    });
  }
};

const getAdminSettings = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(200).json({
        success: true,
        message: "Database not connected. Returning default admin settings.",
        data: defaultSettings,
      });
    }

    const settings = await getOrCreateSettings();

    return res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch admin settings.",
    });
  }
};

const updateAdminSettings = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message:
          "Database is not connected. Store settings update is unavailable for now.",
      });
    }

    const settings = await getOrCreateSettings();
    const payload = buildSettingsPayload(req.body);

    Object.assign(settings, payload);

    await settings.save();

    return res.status(200).json({
      success: true,
      message: "Store settings updated successfully.",
      data: settings,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to update store settings.",
    });
  }
};

module.exports = {
  getPublicSettings,
  getAdminSettings,
  updateAdminSettings,
};