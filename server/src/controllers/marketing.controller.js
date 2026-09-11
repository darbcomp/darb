const { extractMetaContext, sendMetaEvent } = require("../services/metaCapi.service");

const ALLOWED_EVENTS = new Set(["PageView", "ViewContent", "Search", "AddToCart", "InitiateCheckout", "AddPaymentInfo"]);
const ALLOWED_CUSTOM_KEYS = new Set(["content_ids", "content_name", "content_type", "contents", "value", "currency", "num_items", "search_string"]);

const cleanString = (value, maxLength = 500) => String(value || "").trim().slice(0, maxLength);
const cleanNumber = (value, max = 10_000_000) => Math.min(Math.max(Number(value) || 0, 0), max);

const sanitizeCustomData = (raw = {}) => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Invalid event data.");
  if (Object.keys(raw).some((key) => !ALLOWED_CUSTOM_KEYS.has(key))) throw new Error("Unsupported event data.");
  if (raw.content_ids !== undefined && !Array.isArray(raw.content_ids)) throw new Error("Invalid content IDs.");
  if (raw.contents !== undefined && !Array.isArray(raw.contents)) throw new Error("Invalid contents.");

  const contentIds = Array.isArray(raw.content_ids)
    ? raw.content_ids.slice(0, 50).map((value) => cleanString(value, 100)).filter(Boolean)
    : [];
  const contents = Array.isArray(raw.contents)
    ? raw.contents.slice(0, 50).map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error("Invalid content item.");
      if (Object.keys(item).some((key) => !["id", "quantity", "item_price"].includes(key))) throw new Error("Unsupported content item data.");
      return {
        id: cleanString(item.id, 100),
        quantity: Math.min(Math.max(Math.floor(Number(item.quantity) || 1), 1), 100),
        item_price: cleanNumber(item.item_price, 1_000_000),
      };
    }).filter((item) => item.id)
    : [];

  return {
    ...(contentIds.length ? { content_ids: contentIds } : {}),
    ...(cleanString(raw.content_name, 300) ? { content_name: cleanString(raw.content_name, 300) } : {}),
    ...(raw.content_type === "product" ? { content_type: "product" } : {}),
    ...(contents.length ? { contents } : {}),
    ...(raw.value !== undefined ? { value: cleanNumber(raw.value) } : {}),
    ...(raw.currency !== undefined ? { currency: "EGP" } : {}),
    ...(raw.num_items !== undefined ? { num_items: Math.min(Math.max(Math.floor(Number(raw.num_items) || 0), 0), 5000) } : {}),
    ...(cleanString(raw.search_string, 300) ? { search_string: cleanString(raw.search_string, 300) } : {}),
  };
};

const mirrorMarketingEvent = async (req, res) => {
  const eventName = cleanString(req.body?.eventName, 50);
  if (!ALLOWED_EVENTS.has(eventName)) return res.status(400).json({ success: false, message: "Unsupported marketing event." });
  const declaredBytes = Number(req.get("content-length") || 0);
  const parsedBytes = Buffer.byteLength(JSON.stringify(req.body || {}));
  if (declaredBytes > 32 * 1024 || parsedBytes > 32 * 1024) return res.status(413).json({ success: false, message: "Marketing event payload is too large." });

  const context = extractMetaContext(req.body, req);
  if (!context) return res.status(400).json({ success: false, message: "A valid event context is required." });

  try {
    const customData = sanitizeCustomData(req.body.customData);
    await sendMetaEvent({
      eventName,
      eventId: context.eventId,
      eventSourceUrl: context.eventSourceUrl,
      customData,
      userData: context,
    });
    return res.status(202).json({ success: true });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || "Invalid marketing event." });
  }
};

module.exports = { mirrorMarketingEvent, sanitizeCustomData };
