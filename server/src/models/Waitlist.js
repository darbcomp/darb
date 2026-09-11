const mongoose = require("mongoose");
const { normalizeEgyptPhone } = require("../utils/normalizePhone");

const waitlistSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    },

    productSnapshot: {
      name: {
        type: String,
        trim: true,
        default: "",
      },
      slug: {
        type: String,
        trim: true,
        default: "",
      },
      image: {
        type: String,
        trim: true,
        default: "",
      },
      categoryName: {
        type: String,
        trim: true,
        default: "",
      },
      categorySlug: {
        type: String,
        trim: true,
        default: "",
      },
      sizeLabel: {
        type: String,
        trim: true,
        default: "",
      },
      sizeMl: {
        type: Number,
        default: 0,
      },
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    phone: {
      type: String,
      trim: true,
      default: "",
      maxlength: 12,
      set: (value) => value ? normalizeEgyptPhone(value) || String(value).trim() : "",
      validate: { validator: (value) => !value || Boolean(normalizeEgyptPhone(value)), message: "Enter a valid Egyptian mobile number." },
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
      maxlength: 254,
    },

    status: {
      type: String,
      enum: ["waiting", "notified", "contacted", "converted", "cancelled"],
      default: "waiting",
      index: true,
    },

    source: {
      type: String,
      trim: true,
      enum: ["product_page", "collection_page", "search", "storefront"],
      default: "product_page",
    },

    note: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000,
    },

    adminNote: {
      type: String,
      trim: true,
      default: "",
    },

    notifiedAt: {
      type: Date,
      default: null,
    },

    contactedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

waitlistSchema.pre("validate", function validateContact() {
  if (!this.phone && !this.email) {
    this.invalidate("phone", "Phone or email is required.");
  }
});

waitlistSchema.index({ "productSnapshot.slug": 1, status: 1 });
waitlistSchema.index({ phone: 1 });
waitlistSchema.index({ email: 1 });
waitlistSchema.index({ createdAt: -1 });

const Waitlist =
  mongoose.models.Waitlist || mongoose.model("Waitlist", waitlistSchema);

module.exports = Waitlist;
