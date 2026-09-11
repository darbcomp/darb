const { createHash } = require("crypto");

const GRAPH_API_VERSION = "v26.0";
const EVENT_ID_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

const cleanString = (value, maxLength = 500) => String(value || "").trim().slice(0, maxLength);

const normalizeEmail = (value) => cleanString(value).toLowerCase();
const normalizePhone = (value) => {
  const digits = cleanString(value).replace(/\D/g, "");
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith("0") && digits.length === 11) return `20${digits.slice(1)}`;
  return digits;
};
const sha256 = (value) => createHash("sha256").update(String(value)).digest("hex");
const hashNormalized = (value) => value ? sha256(value) : "";

const compactObject = (value) => Object.fromEntries(
  Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== null && entry !== "" && (!Array.isArray(entry) || entry.length))
);

const isMetaCapiConfigured = (env = process.env) => (
  String(env.META_CAPI_ENABLED || "").toLowerCase() === "true" &&
  Boolean(cleanString(env.META_PIXEL_ID, 64)) &&
  Boolean(cleanString(env.META_CAPI_ACCESS_TOKEN, 4096))
);

const sanitizeEventSourceUrl = (value) => {
  try {
    const url = new URL(cleanString(value, 2048));
    if (!['http:', 'https:'].includes(url.protocol)) return "";
    url.username = "";
    url.password = "";
    url.hash = "";
    return url.toString();
  } catch {
    return "";
  }
};

const getClientIp = (req) => cleanString(req?.ip || req?.socket?.remoteAddress || "", 100).replace(/^::ffff:/, "");

const extractMetaContext = (raw, req) => {
  if (!EVENT_ID_PATTERN.test(cleanString(raw?.eventId, 128))) return null;
  return {
    eventId: cleanString(raw.eventId, 128),
    eventSourceUrl: sanitizeEventSourceUrl(raw.eventSourceUrl),
    fbp: cleanString(raw.fbp, 200),
    fbc: cleanString(raw.fbc, 200),
    clientIp: getClientIp(req),
    userAgent: cleanString(req?.get?.("user-agent"), 500),
  };
};

const buildOrderUserData = (order, context = {}) => ({
  email: order?.customerSnapshot?.email,
  phone: order?.customerSnapshot?.phone,
  ...(order?.customer ? { externalId: order.customer } : {}),
  ...context,
});

const buildUserData = ({ email, phone, externalId, fbp, fbc, clientIp, userAgent } = {}) => compactObject({
  em: normalizeEmail(email) ? [hashNormalized(normalizeEmail(email))] : undefined,
  ph: normalizePhone(phone) ? [hashNormalized(normalizePhone(phone))] : undefined,
  external_id: cleanString(externalId) ? [hashNormalized(cleanString(externalId).toLowerCase())] : undefined,
  fbp: cleanString(fbp, 200),
  fbc: cleanString(fbc, 200),
  client_ip_address: cleanString(clientIp, 100),
  client_user_agent: cleanString(userAgent, 500),
});

const buildPurchaseCustomData = (order) => {
  const contents = (order?.items || []).map((item) => ({
    id: String(item.product?._id || item.product || ""),
    quantity: Math.max(Number(item.quantity) || 1, 1),
    item_price: Math.max(Number(item.unitPrice) || 0, 0),
  })).filter((item) => item.id);
  return {
    content_ids: contents.map((item) => item.id),
    content_name: order?.orderNumber || "",
    content_type: "product",
    contents,
    value: Math.max(Number(order?.total) || 0, 0),
    currency: "EGP",
    num_items: contents.reduce((total, item) => total + item.quantity, 0),
    order_id: order?.orderNumber || "",
  };
};

const buildMetaRequest = ({ eventName, eventId, eventSourceUrl, customData = {}, userData = {}, eventTime = Math.floor(Date.now() / 1000) }, env = process.env) => {
  const event = {
    event_name: eventName,
    event_time: eventTime,
    event_id: eventId,
    action_source: "website",
    user_data: buildUserData(userData),
    custom_data: compactObject(customData),
  };
  const sourceUrl = sanitizeEventSourceUrl(eventSourceUrl);
  if (sourceUrl) event.event_source_url = sourceUrl;

  return compactObject({
    data: [event],
    test_event_code: cleanString(env.META_CAPI_TEST_EVENT_CODE, 100),
  });
};

const sendMetaEvent = async (input, { env = process.env, fetchImpl = global.fetch } = {}) => {
  if (!isMetaCapiConfigured(env)) return { sent: false, reason: "disabled" };
  if (!EVENT_ID_PATTERN.test(cleanString(input?.eventId, 128))) return { sent: false, reason: "invalid_event_id" };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);
  try {
    const version = cleanString(env.META_CAPI_GRAPH_VERSION, 20) || GRAPH_API_VERSION;
    const pixelId = encodeURIComponent(cleanString(env.META_PIXEL_ID, 64));
    const response = await fetchImpl(`https://graph.facebook.com/${version}/${pixelId}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...buildMetaRequest(input, env),
        access_token: env.META_CAPI_ACCESS_TOKEN,
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`request failed with status ${response.status}`);
    return { sent: true };
  } catch (error) {
    console.error("Meta CAPI request failed:", cleanString(error?.message || "network error", 160));
    return { sent: false, reason: "request_failed" };
  } finally {
    clearTimeout(timeout);
  }
};

module.exports = {
  GRAPH_API_VERSION,
  EVENT_ID_PATTERN,
  normalizeEmail,
  normalizePhone,
  hashNormalized,
  isMetaCapiConfigured,
  sanitizeEventSourceUrl,
  extractMetaContext,
  buildUserData,
  buildOrderUserData,
  buildPurchaseCustomData,
  buildMetaRequest,
  sendMetaEvent,
};
