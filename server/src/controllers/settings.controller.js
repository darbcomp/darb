const { getSafeInternalMessage } = require("../utils/httpError");
const mongoose = require("mongoose");
const StoreSettings = require("../models/StoreSettings");
const { scheduleFrontendRebuild } = require("../services/frontendRebuild.service");

/* =========================
   DATABASE
========================= */

const isDatabaseConnected = () =>
  mongoose.connection.readyState === 1;

/* =========================
   DEFAULTS
========================= */

const INSTAPAY_RECIPIENT = "+20 10 99589674";

const INSTAPAY_INSTRUCTIONS =
  "Transfer the exact order total to the InstaPay number, then upload a screenshot of the successful transaction.";

const defaultSettings = {
  storeName: "Darb",

  arabicName: "درب",

  tagline:
    "A scent for every path.",

  currency: "EGP",

  contact: {
    phone: "",
    whatsapp: "+20 10 99589674",
    email: "darbcomp@gmail.com",
    instagram: "https://www.instagram.com/darb1.0",
    facebook: "",
    tiktok: "https://www.tiktok.com/@darb1.0",
  },

  delivery: {
    defaultFee: 100,

    freeDeliveryThreshold: 0,

    estimatedDeliveryText: "3–5 business days",
    governorateFees: { cairo: 100, giza: 100, alexandria: 100, other: 100 },
    shipsToCountry: "Egypt",
  },

  paymentMethods: {
    cashOnDelivery: {
      enabled: true,

      label:
        "Cash on Delivery",

      instructions:
        "Pay when your Darb order arrives.",

      recipient: "",

      requireProof: false,
    },

    instapay: {
      /*
        Keep disabled until the complete
        proof-upload flow is finished.
      */
      enabled: true,

      label: "InstaPay",

      instructions:
        INSTAPAY_INSTRUCTIONS,

      recipient:
        INSTAPAY_RECIPIENT,

      requireProof: true,
    },

    vodafoneCash: {
      enabled: true,

      label:
        "Vodafone Cash",

      instructions:
        "Transfer the exact order total to the Vodafone Cash number, then upload a screenshot of the successful transaction.",

      recipient: INSTAPAY_RECIPIENT,

      requireProof: true,
    },

    paymobCard: {
      enabled: false,

      label:
        "Card Payment",

      instructions:
        "Card payment will be available soon.",

      recipient: "",

      requireProof: false,
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
    metaTitle:
      "Darb Perfumes",

    metaDescription:
      "Darb is more than perfume — it is a journey, a memory in every step.",
  },
  marketingPixels: {
    meta: { enabled: false, id: "" },
    tiktok: { enabled: false, id: "" },
  },
};

/* =========================
   PARSERS
========================= */

const parseBoolean = (
  value,
  defaultValue = false
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return defaultValue;
  }

  if (
    typeof value ===
    "boolean"
  ) {
    return value;
  }

  return (
    String(value).toLowerCase() ===
    "true"
  );
};

const parseNumber = (
  value,
  defaultValue = 0
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return defaultValue;
  }

  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : defaultValue;
};

const cleanString = (
  value,
  fallback = ""
) => {
  if (
    value === undefined ||
    value === null
  ) {
    return fallback;
  }

  return String(value).trim();
};

/* =========================
   PAYMENT METHOD BUILDER
========================= */

const buildPaymentMethod = ({
  incomingMethod = {},
  currentMethod = {},
  defaults,
}) => {
  return {
    enabled: parseBoolean(
      incomingMethod.enabled,
      currentMethod.enabled ??
        defaults.enabled
    ),

    label: cleanString(
      incomingMethod.label,
      currentMethod.label ??
        defaults.label
    ),

    instructions: cleanString(
      incomingMethod.instructions,
      currentMethod.instructions ??
        defaults.instructions
    ),

    recipient: cleanString(
      incomingMethod.recipient,
      currentMethod.recipient ??
        defaults.recipient
    ),

    requireProof: parseBoolean(
      incomingMethod.requireProof,
      currentMethod.requireProof ??
        defaults.requireProof
    ),
  };
};

/* =========================
   EXISTING SETTINGS MIGRATION

   Darb already has a StoreSettings
   document created before recipient /
   requireProof existed.

   This safely adds the new fields once
   without overwriting future admin edits.
========================= */

const migratePaymentSettingsIfNeeded =
  async (settings) => {
    if (
      !settings?._id
    ) {
      return settings;
    }

    const rawSettings =
      await StoreSettings.collection.findOne({
        _id: settings._id,
      });

    if (
      !rawSettings
    ) {
      return settings;
    }

    const rawPaymentMethods =
      rawSettings.paymentMethods ||
      {};

    let changed = false;

    const methodDefaults = {
      cashOnDelivery:
        defaultSettings
          .paymentMethods
          .cashOnDelivery,

      instapay:
        defaultSettings
          .paymentMethods
          .instapay,

      vodafoneCash:
        defaultSettings
          .paymentMethods
          .vodafoneCash,

      paymobCard:
        defaultSettings
          .paymentMethods
          .paymobCard,
    };

    for (
      const [
        methodKey,
        defaults,
      ] of Object.entries(
        methodDefaults
      )
    ) {
      const rawMethod =
        rawPaymentMethods?.[
          methodKey
        ];

      const method =
        settings.paymentMethods?.[
          methodKey
        ];

      if (
        !method
      ) {
        continue;
      }

      /*
        Only add the field when it did
        not exist in MongoDB before.

        Once it exists, future admin
        changes are preserved.
      */

      if (
        rawMethod?.recipient ===
        undefined
      ) {
        method.recipient =
          defaults.recipient;

        changed = true;
      }

      if (
        rawMethod?.requireProof ===
        undefined
      ) {
        method.requireProof =
          defaults.requireProof;

        changed = true;
      }
    }

    /*
      Existing InstaPay settings previously
      had an empty instructions field.

      Give it the useful Darb instruction
      during this migration.
    */

    const rawInstaPay =
      rawPaymentMethods.instapay;

    const instaPay =
      settings.paymentMethods
        ?.instapay;

    if (
      instaPay &&
      (!rawInstaPay?.instructions ||
        !String(
          rawInstaPay.instructions
        ).trim())
    ) {
      instaPay.instructions =
        INSTAPAY_INSTRUCTIONS;

      changed = true;
    }

    if (Number(rawSettings.launchConfigVersion || 0) < 1) {
      const vodafone = settings.paymentMethods?.vodafoneCash;
      if (vodafone) {
        vodafone.recipient = INSTAPAY_RECIPIENT;
        vodafone.requireProof = true;
        vodafone.instructions = defaultSettings.paymentMethods.vodafoneCash.instructions;
        vodafone.enabled = true;
      }
      if (instaPay) instaPay.enabled = true;
      settings.delivery.defaultFee = defaultSettings.delivery.defaultFee;
      settings.delivery.freeDeliveryThreshold = 0;
      settings.delivery.estimatedDeliveryText = "3–5 business days";
      settings.delivery.governorateFees = defaultSettings.delivery.governorateFees;
      if (!settings.contact.whatsapp) settings.contact.whatsapp = INSTAPAY_RECIPIENT;
      settings.launchConfigVersion = 1;
      changed = true;
    }

    if (Number(rawSettings.launchConfigVersion || 0) < 2) {
      settings.delivery.defaultFee = 100;
      settings.delivery.governorateFees = {
        cairo: 100,
        giza: 100,
        alexandria: 100,
        other: 100,
      };
      settings.launchConfigVersion = 2;
      changed = true;
    }

    if (
      changed
    ) {
      await settings.save();
    }

    return settings;
  };

/* =========================
   GET OR CREATE SETTINGS
========================= */

const getOrCreateSettings =
  async () => {
    let settings =
      await StoreSettings.findOne({
        singletonKey: "main",
      });

    if (
      !settings
    ) {
      settings =
        await StoreSettings.create({
          singletonKey:
            "main",

          launchConfigVersion: 2,

          ...defaultSettings,
        });

      return settings;
    }

    /*
      Safely upgrade the existing Darb
      settings document with our new
      payment-proof fields.
    */

    await migratePaymentSettingsIfNeeded(
      settings
    );

    return settings;
  };

/* =========================
   BUILD SETTINGS PAYLOAD

   Uses existing settings as fallback so
   PATCH requests do not accidentally reset
   unrelated settings.
========================= */

const buildSettingsPayload = (
  body = {},
  currentSettings = {}
) => {
  const currentPaymentMethods =
    currentSettings.paymentMethods ||
    {};

  const currentContact =
    currentSettings.contact ||
    {};

  const currentDelivery =
    currentSettings.delivery ||
    {};

  const currentOrderSettings =
    currentSettings.orderSettings ||
    {};

  const currentBrand =
    currentSettings.brand ||
    {};

  const currentSeo =
    currentSettings.seo ||
    {};
  const currentPixels = currentSettings.marketingPixels || {};

  return {
    storeName: cleanString(
      body.storeName,
      currentSettings.storeName ||
        defaultSettings.storeName
    ),

    arabicName: cleanString(
      body.arabicName,
      currentSettings.arabicName ||
        defaultSettings.arabicName
    ),

    tagline: cleanString(
      body.tagline,
      currentSettings.tagline ||
        defaultSettings.tagline
    ),

    currency: cleanString(
      body.currency,
      currentSettings.currency ||
        defaultSettings.currency
    ).toUpperCase(),

    /* =========================
       CONTACT
    ========================= */

    contact: {
      phone: cleanString(
        body.contact?.phone,
        currentContact.phone || ""
      ),

      whatsapp: cleanString(
        body.contact?.whatsapp,
        currentContact.whatsapp || ""
      ),

      email: cleanString(
        body.contact?.email,
        currentContact.email || ""
      ).toLowerCase(),

      instagram: cleanString(
        body.contact?.instagram,
        currentContact.instagram ||
          ""
      ),

      facebook: cleanString(
        body.contact?.facebook,
        currentContact.facebook ||
          ""
      ),

      tiktok: cleanString(
        body.contact?.tiktok,
        currentContact.tiktok ||
          ""
      ),
    },

    /* =========================
       DELIVERY
    ========================= */

    delivery: {
      defaultFee: parseNumber(
        body.delivery?.defaultFee,
        Number(
          currentDelivery.defaultFee
        ) || 100
      ),

      freeDeliveryThreshold:
        parseNumber(
          body.delivery
            ?.freeDeliveryThreshold,

          Number(
            currentDelivery
              .freeDeliveryThreshold
          ) || 0
        ),

      estimatedDeliveryText:
        cleanString(
          body.delivery
            ?.estimatedDeliveryText,

          currentDelivery
            .estimatedDeliveryText ||
            defaultSettings
              .delivery
              .estimatedDeliveryText
        ),
      governorateFees: {
        cairo: parseNumber(body.delivery?.governorateFees?.cairo, Number(currentDelivery.governorateFees?.cairo) || 100),
        giza: parseNumber(body.delivery?.governorateFees?.giza, Number(currentDelivery.governorateFees?.giza) || 100),
        alexandria: parseNumber(body.delivery?.governorateFees?.alexandria, Number(currentDelivery.governorateFees?.alexandria) || 100),
        other: parseNumber(body.delivery?.governorateFees?.other, Number(currentDelivery.governorateFees?.other) || 100),
      },
      shipsToCountry: "Egypt",
    },

    /* =========================
       PAYMENT METHODS
    ========================= */

    paymentMethods: {
      cashOnDelivery:
        buildPaymentMethod({
          incomingMethod:
            body.paymentMethods
              ?.cashOnDelivery,

          currentMethod:
            currentPaymentMethods
              .cashOnDelivery,

          defaults:
            defaultSettings
              .paymentMethods
              .cashOnDelivery,
        }),

      instapay:
        buildPaymentMethod({
          incomingMethod:
            body.paymentMethods
              ?.instapay,

          currentMethod:
            currentPaymentMethods
              .instapay,

          defaults:
            defaultSettings
              .paymentMethods
              .instapay,
        }),

      vodafoneCash:
        buildPaymentMethod({
          incomingMethod:
            body.paymentMethods
              ?.vodafoneCash,

          currentMethod:
            currentPaymentMethods
              .vodafoneCash,

          defaults:
            defaultSettings
              .paymentMethods
              .vodafoneCash,
        }),

      paymobCard:
        buildPaymentMethod({
          incomingMethod:
            body.paymentMethods
              ?.paymobCard,

          currentMethod:
            currentPaymentMethods
              .paymobCard,

          defaults:
            defaultSettings
              .paymentMethods
              .paymobCard,
        }),
    },

    /* =========================
       ORDER SETTINGS
    ========================= */

    orderSettings: {
      allowGuestCheckout:
        parseBoolean(
          body.orderSettings
            ?.allowGuestCheckout,

          currentOrderSettings
            .allowGuestCheckout ??
            defaultSettings
              .orderSettings
              .allowGuestCheckout
        ),

      autoConfirmPaidOrders:
        parseBoolean(
          body.orderSettings
            ?.autoConfirmPaidOrders,

          currentOrderSettings
            .autoConfirmPaidOrders ??
            defaultSettings
              .orderSettings
              .autoConfirmPaidOrders
        ),

      lowStockDefault:
        parseNumber(
          body.orderSettings
            ?.lowStockDefault,

          Number(
            currentOrderSettings
              .lowStockDefault
          ) ||
            defaultSettings
              .orderSettings
              .lowStockDefault
        ),
    },

    /* =========================
       BRAND
    ========================= */

    brand: {
      darkGreen: cleanString(
        body.brand?.darkGreen,
        currentBrand.darkGreen ||
          defaultSettings.brand
            .darkGreen
      ),

      beige: cleanString(
        body.brand?.beige,
        currentBrand.beige ||
          defaultSettings.brand
            .beige
      ),

      softGold: cleanString(
        body.brand?.softGold,
        currentBrand.softGold ||
          defaultSettings.brand
            .softGold
      ),

      black: cleanString(
        body.brand?.black,
        currentBrand.black ||
          defaultSettings.brand.black
      ),

      cream: cleanString(
        body.brand?.cream,
        currentBrand.cream ||
          defaultSettings.brand.cream
      ),
    },

    /* =========================
       SEO
    ========================= */

    marketingPixels: {
      meta: {
        enabled: parseBoolean(body.marketingPixels?.meta?.enabled, currentPixels.meta?.enabled ?? false),
        id: cleanString(body.marketingPixels?.meta?.id, currentPixels.meta?.id || ""),
      },
      tiktok: {
        enabled: parseBoolean(body.marketingPixels?.tiktok?.enabled, currentPixels.tiktok?.enabled ?? false),
        id: cleanString(body.marketingPixels?.tiktok?.id, currentPixels.tiktok?.id || ""),
      },
    },

    seo: {
      metaTitle: cleanString(
        body.seo?.metaTitle,

        currentSeo.metaTitle ||
          defaultSettings.seo
            .metaTitle
      ),

      metaDescription:
        cleanString(
          body.seo
            ?.metaDescription,

          currentSeo
            .metaDescription ||
            defaultSettings.seo
              .metaDescription
        ),
    },
  };
};

/* =========================
   PUBLIC SETTINGS
========================= */

const getPublicSettings =
  async (req, res) => {
    try {
      if (
        !isDatabaseConnected()
      ) {
        return res
          .status(503)
          .json({
            success: false,
            message: "Database is unavailable.",
          });
      }

      const settings =
        await getOrCreateSettings();

      return res
        .status(200)
        .json({
          success: true,

          data: {
            storeName:
              settings.storeName,

            arabicName:
              settings.arabicName,

            tagline:
              settings.tagline,

            currency:
              settings.currency,

            contact:
              settings.contact,

            delivery:
              settings.delivery,

            orderSettings: {
              allowGuestCheckout:
                settings.orderSettings?.allowGuestCheckout !== false,
            },

            /*
              Public checkout needs:
              - enabled
              - label
              - instructions
              - recipient
              - requireProof

              None of these are secrets.
            */
            paymentMethods:
              settings.paymentMethods,

            brand:
              settings.brand,

            seo:
              settings.seo,
            marketingPixels: settings.marketingPixels || defaultSettings.marketingPixels,
          },
        });
    } catch (error) {
      return res
        .status(500)
        .json({
          success: false,

          message:
            getSafeInternalMessage(error, "Failed to fetch public settings."),
        });
    }
  };

/* =========================
   ADMIN SETTINGS
========================= */

const getAdminSettings =
  async (req, res) => {
    try {
      if (
        !isDatabaseConnected()
      ) {
        return res
          .status(503)
          .json({
            success: false,
            message:
              "Database is unavailable.",
          });
      }

      const settings =
        await getOrCreateSettings();

      return res
        .status(200)
        .json({
          success: true,

          data: settings,
        });
    } catch (error) {
      return res
        .status(500)
        .json({
          success: false,

          message:
            getSafeInternalMessage(error, "Failed to fetch admin settings."),
        });
    }
  };

/* =========================
   UPDATE ADMIN SETTINGS
========================= */

const updateAdminSettings =
  async (req, res) => {
    try {
      if (
        !isDatabaseConnected()
      ) {
        return res
          .status(503)
          .json({
            success: false,

            message:
              "Database is not connected. Store settings update is unavailable for now.",
          });
      }

      const settings =
        await getOrCreateSettings();

      const previousSeo = {
        metaTitle: String(settings.seo?.metaTitle || ""),
        metaDescription: String(settings.seo?.metaDescription || ""),
      };

      const payload =
        buildSettingsPayload(
          req.body,
          settings
        );

      Object.assign(
        settings,
        payload
      );

      await settings.save();

      const seoChanged =
        previousSeo.metaTitle !== String(settings.seo?.metaTitle || "") ||
        previousSeo.metaDescription !== String(settings.seo?.metaDescription || "");

      if (seoChanged) {
        scheduleFrontendRebuild("seo-settings-updated");
      }

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Store settings updated successfully.",

          data: settings,
        });
    } catch (error) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            error.message ||
            "Failed to update store settings.",
        });
    }
  };

/* =========================
   EXPORTS
========================= */

module.exports = {
  getPublicSettings,
  getAdminSettings,
  updateAdminSettings,
};
