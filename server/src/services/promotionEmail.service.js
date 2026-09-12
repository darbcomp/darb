const Offer = require("../models/Offer");
const Bundle = require("../models/Bundle");
const Coupon = require("../models/Coupon");
const StoreSettings = require("../models/StoreSettings");
const MarketingSend = require("../models/MarketingSend");
const { sendEmail } = require("../config/mailer");
const { getEligibleMarketingRecipients } = require("./marketingRecipient.service");
const { createUnsubscribeToken } = require("./marketingUnsubscribe.service");

const MAX_LIVE_RECIPIENTS = 200;
const SUBJECT_LIMIT = 120;
const MESSAGE_LIMIT = 1200;
const TYPE_MODELS = { offer: Offer, bundle: Bundle, coupon: Coupon };
const isDuplicateSendError = (error) => error?.code === 11000;

const escapeHtml = (value = "") => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
const cleanText = (value = "") => String(value).trim();
const formatMoney = (value) => `EGP ${Number(value || 0).toLocaleString("en-EG", { maximumFractionDigits: 2 })}`;
const formatDate = (value) => value ? new Intl.DateTimeFormat("en-EG", { dateStyle: "medium", timeZone: "Africa/Cairo" }).format(new Date(value)) : "";
const getSiteUrl = (path = "") => {
  const base = cleanText(process.env.CLIENT_URL).replace(/\/$/, "");
  return /^https?:\/\//i.test(base) ? `${base}${path.startsWith("/") ? path : `/${path}`}` : "";
};

const validatePromotionContent = ({ subject, message }) => {
  const normalized = { subject: cleanText(subject).replace(/[\r\n]+/g, " "), message: cleanText(message) };
  if (!normalized.subject || normalized.subject.length > SUBJECT_LIMIT) throw Object.assign(new Error(`Subject is required and must be ${SUBJECT_LIMIT} characters or fewer.`), { statusCode: 400 });
  if (!normalized.message || normalized.message.length > MESSAGE_LIMIT) throw Object.assign(new Error(`Message is required and must be ${MESSAGE_LIMIT} characters or fewer.`), { statusCode: 400 });
  return normalized;
};

const planPromotionRecipients = ({ mode, adminEmail = "", eligibleRecipients = [] }) => {
  if (mode === "test") {
    const email = cleanText(adminEmail);
    return email ? [{ email, audience: "admin" }] : [];
  }
  if (mode === "live") return eligibleRecipients.map((recipient) => ({ ...recipient, audience: "customer" }));
  return [];
};

const assertPromotionCanSend = (promotion, now = new Date()) => {
  if (!promotion || promotion.isActive !== true) throw Object.assign(new Error("This promotion is inactive and cannot be emailed."), { statusCode: 400 });
  if (promotion.endAt && new Date(promotion.endAt) < now) throw Object.assign(new Error("This promotion has expired and cannot be emailed."), { statusCode: 400 });
  if (promotion.usageLimit > 0 && promotion.usedCount >= promotion.usageLimit) throw Object.assign(new Error("This promotion is no longer available."), { statusCode: 400 });
  return true;
};

const benefitText = (promotion) => {
  if (promotion.discountType === "free_shipping") return "Free delivery";
  if (promotion.discountType === "percentage") return `${promotion.discountValue}% off`;
  if (promotion.discountType === "fixed_bundle_price") return `${formatMoney(promotion.discountValue)} bundle price`;
  return `${formatMoney(promotion.discountValue)} off`;
};

const describePromotion = (type, promotion) => {
  const title = cleanText(promotion.title || promotion.name || (type === "coupon" ? promotion.code : "Darb promotion"));
  const details = [
    { label: "Offer", value: benefitText(promotion) },
    promotion.minOrderValue > 0 ? { label: "Minimum order", value: formatMoney(promotion.minOrderValue) } : null,
    promotion.startAt ? { label: "Starts", value: formatDate(promotion.startAt) } : null,
    promotion.endAt ? { label: "Ends", value: formatDate(promotion.endAt) } : null,
    type === "coupon" ? { label: "Coupon code", value: promotion.code } : null,
    type === "bundle" ? { label: "Bundle quantity", value: promotion.requiredQuantity } : null,
  ].filter(Boolean);
  return {
    title,
    summary: details.map((item) => `${item.label}: ${item.value}`).join(" · "),
    details,
    subject: `Darb — ${title}`,
    message: cleanText(promotion.description) || `Discover ${title}, available from Darb for a limited time.`,
    ctaPath: "/shop",
  };
};

const loadPromotion = async (type, promotionId) => {
  const Model = TYPE_MODELS[type];
  if (!Model || !promotionId) throw Object.assign(new Error("Choose a valid promotion."), { statusCode: 400 });
  const promotion = await Model.findById(promotionId).lean();
  if (!promotion) throw Object.assign(new Error("Promotion not found."), { statusCode: 404 });
  assertPromotionCanSend(promotion);
  return { promotion, presentation: describePromotion(type, promotion) };
};

const getContext = async () => {
  const settings = await StoreSettings.findOne({ singletonKey: "main" }).lean();
  return {
    settings: {
      storeName: settings?.storeName || "Darb",
      tagline: settings?.tagline || "A scent for every path.",
      contact: settings?.contact || {},
      brand: { darkGreen: "#0F3D2E", beige: "#E7DCC9", softGold: "#C8A97E", black: "#1C1C1C", cream: "#F7F1E6", ...(settings?.brand || {}) },
    },
    adminEmail: cleanText(process.env.ADMIN_NOTIFICATION_EMAIL || settings?.contact?.email || process.env.GMAIL_USER),
  };
};

const renderPromotionalEmail = ({ settings, presentation, message, unsubscribeUrl, isTest = false }) => {
  const details = presentation.details.map(({ label, value }) => `<tr><td style="padding:7px 0;color:#756C62">${escapeHtml(label)}</td><td align="right" style="padding:7px 0;color:${settings.brand.darkGreen};font-weight:700">${escapeHtml(value)}</td></tr>`).join("");
  const ctaUrl = getSiteUrl(presentation.ctaPath);
  return `<!doctype html><html><body style="margin:0;background:${settings.brand.cream};font-family:Arial,sans-serif;color:${settings.brand.black}"><table role="presentation" width="100%" style="padding:28px 14px"><tr><td align="center"><table role="presentation" width="100%" style="max-width:620px;background:#fff;border-radius:24px;overflow:hidden"><tr><td align="center" style="padding:30px;background:${settings.brand.darkGreen};color:${settings.brand.beige}"><div style="color:${settings.brand.softGold};font-family:Georgia,serif;font-size:34px;letter-spacing:5px">DARB</div><div style="margin-top:7px;font-size:12px;letter-spacing:2px">${escapeHtml(settings.tagline)}</div></td></tr><tr><td style="padding:34px 30px">${isTest ? `<p style="color:#8A6A35;font-weight:700">TEST EMAIL — no customers received this message.</p>` : ""}<h1 style="color:${settings.brand.darkGreen};font-family:Georgia,serif">${escapeHtml(presentation.title)}</h1><p style="color:#756C62;line-height:1.8;white-space:pre-line">${escapeHtml(message)}</p><table role="presentation" width="100%" style="margin-top:20px;border-block:1px solid #E8E1D8;padding:10px 0">${details}</table>${ctaUrl ? `<p style="margin-top:24px"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:13px 22px;border-radius:999px;background:${settings.brand.darkGreen};color:${settings.brand.beige};font-weight:700;text-decoration:none">Shop Darb</a></p>` : ""}</td></tr><tr><td align="center" style="padding:24px;background:${settings.brand.darkGreen};color:${settings.brand.beige}"><div>A scent for every path.</div>${settings.contact?.email ? `<div style="margin-top:8px;font-size:12px">${escapeHtml(settings.contact.email)}</div>` : ""}${unsubscribeUrl ? `<div style="margin-top:12px;font-size:12px"><a href="${escapeHtml(unsubscribeUrl)}" style="color:${settings.brand.beige}">Unsubscribe from promotional emails</a><br>Transactional account and order emails will continue.</div>` : ""}</td></tr></table></td></tr></table></body></html>`;
};

const buildText = ({ presentation, message, unsubscribeUrl, isTest }) => [isTest ? "TEST EMAIL — no customers received this message." : "", "DARB — A scent for every path.", "", presentation.title, message, "", ...presentation.details.map(({ label, value }) => `${label}: ${value}`), getSiteUrl(presentation.ctaPath), unsubscribeUrl ? `Unsubscribe: ${unsubscribeUrl}` : ""].filter(Boolean).join("\n");

const previewPromotionEmail = async ({ type, promotionId }) => {
  const [{ promotion, presentation }, recipients] = await Promise.all([loadPromotion(type, promotionId), getEligibleMarketingRecipients()]);
  const lastSend = await MarketingSend.findOne({ promotionType: type, promotion: promotion._id, status: "completed" }).sort({ createdAt: -1 }).select("completedAt sentCount failedCount -_id").lean();
  return { promotion: { type, title: presentation.title, summary: presentation.summary, startAt: promotion.startAt, endAt: promotion.endAt, isActive: promotion.isActive }, eligibleCount: recipients.length, allowed: recipients.length <= MAX_LIVE_RECIPIENTS, subject: presentation.subject.slice(0, SUBJECT_LIMIT), message: presentation.message.slice(0, MESSAGE_LIMIT), lastSend: lastSend || null };
};

const sendPromotionTestEmail = async ({ type, promotionId, subject, message }) => {
  const content = validatePromotionContent({ subject, message });
  const [{ presentation }, { settings, adminEmail }] = await Promise.all([loadPromotion(type, promotionId), getContext()]);
  const [testRecipient] = planPromotionRecipients({ mode: "test", adminEmail });
  if (!testRecipient) throw Object.assign(new Error("Admin notification email is not configured."), { statusCode: 400 });
  const payload = { presentation, message: content.message, isTest: true };
  const result = await sendEmail({ to: testRecipient.email, subject: `[TEST] ${content.subject}`, html: renderPromotionalEmail({ settings, ...payload }), text: buildText(payload), replyTo: settings.contact?.email || undefined });
  return { sent: result.sent === true };
};

const mapWithConcurrency = async (items, limit, worker) => {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      try { results[index] = { status: "fulfilled", value: await worker(items[index]) }; }
      catch (reason) { results[index] = { status: "rejected", reason }; }
    }
  });
  await Promise.all(runners);
  return results;
};

const sendPromotionEmail = async ({ type, promotionId, subject, message, requestId, adminUserId }) => {
  const content = validatePromotionContent({ subject, message });
  if (!/^[a-zA-Z0-9_-]{12,100}$/.test(cleanText(requestId))) throw Object.assign(new Error("A valid send request identifier is required."), { statusCode: 400 });
  const [{ promotion, presentation }, recipients, { settings }] = await Promise.all([loadPromotion(type, promotionId), getEligibleMarketingRecipients(), getContext()]);
  const plannedRecipients = planPromotionRecipients({ mode: "live", eligibleRecipients: recipients });
  if (plannedRecipients.length === 0) throw Object.assign(new Error("There are no eligible opted-in recipients for this send."), { statusCode: 400 });
  if (plannedRecipients.length > MAX_LIVE_RECIPIENTS) throw Object.assign(new Error(`This audience is too large for a synchronous send. Maximum ${MAX_LIVE_RECIPIENTS}.`), { statusCode: 400 });
  let audit;
  try { audit = await MarketingSend.create({ requestId, promotionType: type, promotion: promotion._id, initiatedBy: adminUserId, eligibleCount: recipients.length }); }
  catch (error) { if (isDuplicateSendError(error)) throw Object.assign(new Error("This promotional send was already submitted."), { statusCode: 409 }); throw error; }
  try {
    const results = await mapWithConcurrency(plannedRecipients, 4, async (recipient) => {
      const token = createUnsubscribeToken({ email: recipient.email, userId: recipient.userId });
      const unsubscribeUrl = token ? getSiteUrl(`/unsubscribe?token=${encodeURIComponent(token)}`) : "";
      if (!unsubscribeUrl) throw new Error("Unsubscribe URL is not configured.");
      const payload = { presentation, message: content.message, unsubscribeUrl, isTest: false };
      return sendEmail({ to: recipient.email, subject: content.subject, html: renderPromotionalEmail({ settings, ...payload }), text: buildText(payload), replyTo: settings.contact?.email || undefined });
    });
    const sentCount = results.filter((result) => result.status === "fulfilled" && result.value?.sent === true).length;
    const failedCount = results.length - sentCount;
    await MarketingSend.updateOne({ _id: audit._id }, { status: "completed", attemptedCount: recipients.length, sentCount, failedCount, completedAt: new Date() });
    return { eligibleCount: recipients.length, attemptedCount: recipients.length, sentCount, failedCount };
  } catch (error) {
    await MarketingSend.updateOne({ _id: audit._id }, { status: "failed", completedAt: new Date() });
    throw error;
  }
};

module.exports = { MAX_LIVE_RECIPIENTS, SUBJECT_LIMIT, MESSAGE_LIMIT, assertPromotionCanSend, describePromotion, escapeHtml, isDuplicateSendError, planPromotionRecipients, previewPromotionEmail, sendPromotionEmail, sendPromotionTestEmail, validatePromotionContent };
