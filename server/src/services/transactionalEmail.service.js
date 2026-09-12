const StoreSettings = require("../models/StoreSettings");
const { sendEmail } = require("../config/mailer");
const {
  getPaymentProofDecisionPlan,
  getPaymentProofSubmissionPlan,
  getRegistrationEmailPlan,
  getRewardClaimEmailPlan,
  getReviewApprovalPlan,
  getReviewSubmissionPlan,
} = require("./transactionalEmailEvents.service");
const { getRewardUsageDescription } = require("./rewardPresentation.service");

const DEFAULT_BRAND = {
  darkGreen: "#0F3D2E",
  beige: "#E7DCC9",
  softGold: "#C8A97E",
  black: "#1C1C1C",
  cream: "#F7F1E6",
};

const escapeHtml = (value = "") => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

const formatDateTime = (value) => new Intl.DateTimeFormat("en-EG", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Cairo",
}).format(value ? new Date(value) : new Date());

const getEmailContext = async () => {
  const settings = await StoreSettings.findOne({ singletonKey: "main" }).lean();
  return {
    settings: {
      storeName: settings?.storeName || "Darb",
      arabicName: settings?.arabicName || "درب",
      tagline: settings?.tagline || "A scent for every path.",
      contact: settings?.contact || {},
      brand: { ...DEFAULT_BRAND, ...(settings?.brand || {}) },
    },
    adminEmail:
      process.env.ADMIN_NOTIFICATION_EMAIL?.trim() ||
      settings?.contact?.email?.trim() ||
      process.env.GMAIL_USER?.trim() ||
      "",
  };
};

const getSiteUrl = (path = "") => {
  const base = String(process.env.CLIENT_URL || "").trim().replace(/\/$/, "");
  if (!/^https?:\/\//i.test(base)) return "";
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
};

const renderDetails = (details, color) => details
  .filter((detail) => detail?.value !== undefined && detail?.value !== null && String(detail.value).trim())
  .map((detail) => `<tr><td style="padding:8px 0;color:#756C62;font-size:13px;">${escapeHtml(detail.label)}</td><td align="right" style="padding:8px 0;color:${color};font-size:14px;font-weight:700;">${escapeHtml(detail.value)}</td></tr>`)
  .join("");

const renderTransactionalEmail = ({ settings, title, intro, details = [], highlight = null, cta = null, footer = "A scent for every path." }) => {
  const ctaMarkup = cta?.url
    ? `<div style="margin-top:24px;"><a href="${escapeHtml(cta.url)}" style="display:inline-block;padding:13px 22px;border-radius:999px;background:${settings.brand.darkGreen};color:${settings.brand.beige};font-size:14px;font-weight:700;text-decoration:none;">${escapeHtml(cta.label)}</a></div>`
    : "";
  const highlightMarkup = highlight?.value
    ? `<div style="margin-top:22px;padding:18px;border-radius:16px;background:${settings.brand.darkGreen};text-align:center;"><div style="color:${settings.brand.softGold};font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">${escapeHtml(highlight.label || "")}</div><div style="margin-top:9px;color:${settings.brand.beige};font-family:monospace;font-size:23px;font-weight:700;letter-spacing:2px;word-break:break-all;">${escapeHtml(highlight.value)}</div></div>`
    : "";
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:${settings.brand.cream};font-family:Arial,Helvetica,sans-serif;color:${settings.brand.black};"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:30px 14px;background:${settings.brand.cream};"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;overflow:hidden;border-radius:24px;background:#fff;"><tr><td align="center" style="padding:32px 24px;background:${settings.brand.darkGreen};"><div style="color:${settings.brand.softGold};font-family:Georgia,'Times New Roman',serif;font-size:34px;font-weight:700;letter-spacing:5px;">DARB</div><div style="margin-top:7px;color:${settings.brand.beige};font-size:12px;letter-spacing:2px;">${escapeHtml(settings.tagline)}</div></td></tr><tr><td style="padding:36px 30px;"><h1 style="margin:0;color:${settings.brand.darkGreen};font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:1.25;">${escapeHtml(title)}</h1><p style="margin:15px 0 0;color:#756C62;font-size:15px;line-height:1.8;">${escapeHtml(intro)}</p>${highlightMarkup}${details.length ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:22px;border-top:1px solid #E8E1D8;border-bottom:1px solid #E8E1D8;padding:10px 0;">${renderDetails(details, settings.brand.darkGreen)}</table>` : ""}${ctaMarkup}</td></tr><tr><td align="center" style="padding:25px 30px;background:${settings.brand.darkGreen};color:${settings.brand.beige};font-family:Georgia,'Times New Roman',serif;font-size:17px;">${escapeHtml(footer)}</td></tr></table></td></tr></table></body></html>`;
};

const buildText = ({ title, intro, details = [], highlight = null, cta = null }) => [
  "DARB — درب",
  "A scent for every path.",
  "",
  title,
  intro,
  ...(highlight?.value ? [`${highlight.label}: ${highlight.value}`] : []),
  ...details.filter((detail) => detail?.value).map((detail) => `${detail.label}: ${detail.value}`),
  ...(cta?.url ? ["", `${cta.label}: ${cta.url}`] : []),
].join("\n");

const deliver = async ({ plan, settings, adminEmail, buildMessage, logLabel }) => {
  const messages = plan
    .map((event) => ({ event, to: event.audience === "admin" ? adminEmail : event.to }))
    .filter(({ to }) => Boolean(to));
  const results = await Promise.allSettled(messages.map(({ event, to }) => {
    const message = buildMessage(event);
    return sendEmail({
      to,
      subject: message.subject,
      text: buildText(message),
      html: renderTransactionalEmail({ settings, ...message }),
      replyTo: settings.contact?.email || undefined,
    });
  }));
  results.forEach((result) => {
    if (result.status === "rejected") {
      console.error(`${logLabel} email failed:`, result.reason?.message || result.reason);
    }
  });
  return results;
};

const safelyDeliver = async (label, callback) => {
  try {
    return await callback();
  } catch (error) {
    console.error(`${label} email preparation failed:`, error.message);
    return [];
  }
};

const sendRegistrationEmails = (user) => safelyDeliver("Registration", async () => {
  const { settings, adminEmail } = await getEmailContext();
  const plan = getRegistrationEmailPlan({ email: user?.email, marketingConsent: user?.marketingConsent?.granted });
  return deliver({
    plan,
    settings,
    adminEmail,
    logLabel: "Registration",
    buildMessage: (event) => event.audience === "customer"
      ? {
          subject: "Welcome to Darb",
          title: `Welcome to Darb, ${user.name || ""}.`,
          intro: "Your account was created successfully. A scent for every path.",
          details: [],
          cta: { label: "Visit Darb", url: getSiteUrl("/") },
        }
      : {
          subject: "New Darb customer signup",
          title: "A new customer joined Darb.",
          intro: "A registered customer account was created successfully.",
          details: [
            { label: "Name", value: user?.name || "Customer" },
            { label: "Email", value: user?.email || "" },
            { label: "Phone", value: user?.phone || "" },
            { label: "Signed up", value: formatDateTime(user?.createdAt) },
          ],
          cta: { label: "View Customers", url: getSiteUrl("/admin/customers") },
        },
  });
});

const sendPaymentProofSubmittedEmails = (order, { isResubmission = false } = {}) => safelyDeliver("Payment proof submission", async () => {
  const { settings, adminEmail } = await getEmailContext();
  const plan = getPaymentProofSubmissionPlan({ email: order?.customerSnapshot?.email, isResubmission });
  const eventWord = isResubmission ? "resubmitted" : "received";
  return deliver({
    plan,
    settings,
    adminEmail,
    logLabel: "Payment proof submission",
    buildMessage: (event) => event.audience === "customer"
      ? {
          subject: `Payment proof ${eventWord} — ${order.orderNumber}`,
          title: isResubmission ? "Payment proof resubmitted." : "Payment proof received.",
          intro: isResubmission
            ? "We received your new payment proof and will review it again. There is no need to upload it again unless Darb asks you to."
            : "We received your payment proof and will review it. There is no need to upload it again unless Darb asks you to.",
          details: [{ label: "Order", value: order.orderNumber }],
          cta: { label: "Track Order", url: getSiteUrl("/track-order") },
        }
      : {
          subject: `Payment proof ${isResubmission ? "resubmitted" : "submitted"} — ${order.orderNumber}`,
          title: isResubmission ? "A payment proof was resubmitted." : "A payment proof needs review.",
          intro: "Review the proof securely in Admin Orders. The private proof is not included in this email.",
          details: [
            { label: "Order", value: order.orderNumber },
            { label: "Customer", value: order.customerSnapshot?.name || "Customer" },
            { label: "Phone", value: order.customerSnapshot?.phone || "" },
            { label: "Email", value: order.customerSnapshot?.email || "" },
            { label: "Payment method", value: String(order.paymentMethod || "").replaceAll("_", " ") },
            { label: "Submission", value: isResubmission ? "Resubmission" : "New submission" },
          ],
          cta: { label: "Review in Orders", url: getSiteUrl(`/admin/orders?search=${encodeURIComponent(order.orderNumber)}`) },
        },
  });
});

const sendPaymentProofDecisionEmail = (order, {
  action,
  autoConfirmed = false,
  previousProofStatus = "",
  reason = "",
} = {}) => safelyDeliver("Payment proof decision", async () => {
  const { settings, adminEmail } = await getEmailContext();
  const plan = getPaymentProofDecisionPlan({
    action,
    email: order?.customerSnapshot?.email,
    autoConfirmed,
    previousProofStatus,
    reason,
  });
  return deliver({
    plan,
    settings,
    adminEmail,
    logLabel: "Payment proof decision",
    buildMessage: (event) => {
      if (event.type === "customer_proof_rejected") {
        return {
          subject: `Payment proof update — ${order.orderNumber}`,
          title: "Your payment proof needs attention.",
          intro: "The submitted proof could not be approved. You may submit a new proof from Track Order.",
          details: [
            { label: "Order", value: order.orderNumber },
            { label: "Reason", value: event.reason },
          ],
          cta: { label: "Track Order", url: getSiteUrl("/track-order") },
        };
      }
      return {
        subject: `${autoConfirmed ? "Payment approved and order confirmed" : "Payment approved"} — ${order.orderNumber}`,
        title: autoConfirmed ? "Payment approved. Order confirmed." : "Your payment was approved.",
        intro: "Your payment proof was approved and the payment status is now paid.",
        details: [
          { label: "Order", value: order.orderNumber },
          { label: "Payment status", value: "Paid" },
          { label: "Order status", value: String(order.orderStatus || "").replaceAll("_", " ") },
        ],
        cta: { label: "Track Order", url: getSiteUrl("/track-order") },
      };
    },
  });
});

const reviewName = (review) => review?.product?.name || review?.fragranceName || "Darb fragrance";

const sendReviewSubmittedEmails = (review, { customerEmail = "" } = {}) => safelyDeliver("Review submission", async () => {
  const { settings, adminEmail } = await getEmailContext();
  const plan = getReviewSubmissionPlan({ source: review?.source, email: customerEmail });
  return deliver({
    plan,
    settings,
    adminEmail,
    logLabel: "Review submission",
    buildMessage: (event) => event.audience === "customer"
      ? {
          subject: "Your Darb review was received",
          title: "Thank you for sharing your path.",
          intro: "Your review was received and is awaiting moderation.",
          details: [
            { label: "Fragrance", value: reviewName(review) },
            { label: "Status", value: "Pending" },
          ],
        }
      : {
          subject: "New customer review awaiting moderation",
          title: "A new customer review is waiting.",
          intro: "Review and moderate this submission in Admin Reviews.",
          details: [
            { label: "Reviewer", value: review?.displayName || "Customer" },
            { label: "Rating", value: `${review?.rating || 0} / 5` },
            { label: "Fragrance", value: reviewName(review) },
            { label: "Review", value: String(review?.text || "").trim().slice(0, 180) },
            { label: "Verified Purchase", value: review?.isVerifiedPurchase ? "Yes" : "No" },
          ],
          cta: { label: "Review Submission", url: getSiteUrl("/admin/reviews") },
        },
  });
});

const sendReviewApprovalEmail = (review, { customerEmail = "", previousStatus = "" } = {}) => safelyDeliver("Review approval", async () => {
  const { settings, adminEmail } = await getEmailContext();
  const plan = getReviewApprovalPlan({
    source: review?.source,
    email: customerEmail,
    previousStatus,
    nextStatus: review?.status,
  });
  return deliver({
    plan,
    settings,
    adminEmail,
    logLabel: "Review approval",
    buildMessage: () => ({
      subject: "Your Darb review was approved",
      title: "Your review is now published.",
      intro: "Thank you for sharing your Darb experience. Your review has been approved and published.",
      details: [{ label: "Fragrance", value: reviewName(review) }],
      cta: { label: "Visit Darb", url: getSiteUrl("/") },
    }),
  });
});

const formatRewardExpiry = (value) => value
  ? new Intl.DateTimeFormat("en-EG", { dateStyle: "long", timeZone: "Africa/Cairo" }).format(new Date(value))
  : "";

const buildRewardClaimMessage = (entitlement, { isGuest = false } = {}) => ({
  subject: "Your Darb reward",
  title: "Your Darb reward",
  intro: getRewardUsageDescription(entitlement, { isGuest }),
  highlight: entitlement?.code ? { label: "Reward code", value: entitlement.code } : null,
  details: [
    { label: "Reward", value: entitlement?.label || "Darb reward" },
    { label: "Expires", value: formatRewardExpiry(entitlement?.expiresAt) },
  ],
  cta: {
    label: isGuest ? "Shop Darb" : "My Account",
    url: getSiteUrl(isGuest ? "/shop" : "/account"),
  },
});

const sendRewardClaimEmail = (entitlement, { customerEmail = "", isGuest = false } = {}) => {
  const plan = getRewardClaimEmailPlan({ email: customerEmail, entitlement, isGuest });
  if (!plan.length) return Promise.resolve([]);
  return safelyDeliver("Reward claim", async () => {
    const { settings, adminEmail } = await getEmailContext();
    return deliver({
      plan,
      settings,
      adminEmail,
      logLabel: "Reward claim",
      buildMessage: () => buildRewardClaimMessage(entitlement, { isGuest }),
    });
  });
};

module.exports = {
  sendPaymentProofDecisionEmail,
  sendPaymentProofSubmittedEmails,
  sendRegistrationEmails,
  sendRewardClaimEmail,
  sendReviewApprovalEmail,
  sendReviewSubmittedEmails,
  buildRewardClaimMessage,
  renderTransactionalEmail,
};
