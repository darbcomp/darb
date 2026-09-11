import { mirrorMarketingEvent } from "../api/marketingApi";

const trackedOnce = new Set();
const pendingEvents = [];

let channels = {
  meta: { enabled: false, id: "", ready: false },
  tiktok: { enabled: false, id: "", ready: false },
};

export const createMarketingEventId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `darb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
};

const readCookie = (name) => {
  if (typeof document === "undefined") return "";
  const prefix = `${encodeURIComponent(name)}=`;
  const match = document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(prefix));
  return match ? decodeURIComponent(match.slice(prefix.length)) : "";
};

export const getMetaBrowserContext = (eventId = createMarketingEventId()) => {
  return {
    eventId,
    fbp: readCookie("_fbp"),
    fbc: readCookie("_fbc"),
    eventSourceUrl: typeof window !== "undefined" ? window.location.href : "",
  };
};

export const configureMarketingChannels = (nextChannels) => {
  channels = {
    meta: { ...channels.meta, ...nextChannels.meta },
    tiktok: { ...channels.tiktok, ...nextChannels.tiktok },
  };
};

export const markMarketingChannelReady = (channel, ready = true) => {
  if (!channels[channel]) return;
  channels = { ...channels, [channel]: { ...channels[channel], ready } };
};

export const isMetaReady = () => Boolean(
  typeof window !== "undefined" &&
  channels.meta.enabled &&
  channels.meta.id &&
  channels.meta.ready &&
  window.fbq
);

export const normalizeEcommercePayload = ({ items = [], value = 0, contentName = "", searchString = "" } = {}) => {
  const contents = items.map((item) => ({
    id: String(item.productId || item.product || item.id || ""),
    quantity: Math.max(Number(item.quantity) || 1, 1),
    item_price: Math.max(Number(item.unitPrice ?? item.price) || 0, 0),
  })).filter((item) => item.id);

  return {
    ...(contents.length ? { content_ids: contents.map((item) => item.id), contents, content_type: "product" } : {}),
    ...(contentName ? { content_name: contentName } : {}),
    ...(searchString ? { search_string: searchString } : {}),
    value: Math.max(Number(value) || 0, 0),
    currency: "EGP",
    num_items: contents.reduce((total, item) => total + item.quantity, 0),
  };
};

function deliverMarketingEvent(name, payload, options, eventId) {
  try {
    if (isMetaReady()) window.fbq("track", name, payload, { eventID: eventId });
    if (channels.tiktok.enabled && channels.tiktok.ready) window.ttq?.track?.(name, payload);
  } catch {
    // Measurement must never interfere with the storefront.
  }

  if (options.mirrorMeta !== false && channels.meta.enabled && channels.meta.id) {
    const context = getMetaBrowserContext(eventId);
    if (context) mirrorMarketingEvent({ eventName: name, customData: payload, ...context }).catch(() => {});
  }
}

export const flushPendingMarketingEvents = () => {
  const hasReadyChannel = isMetaReady() || (channels.tiktok.enabled && channels.tiktok.ready);
  if (!hasReadyChannel || !pendingEvents.length) return;
  const queued = pendingEvents.splice(0);
  queued.forEach(({ name, payload, options, eventId }) => deliverMarketingEvent(name, payload, options, eventId));
};

export const trackMarketingEvent = (name, payload = {}, options = {}) => {
  const eventId = options.eventId || createMarketingEventId();

  const hasReadyChannel = isMetaReady() || (channels.tiktok.enabled && channels.tiktok.ready);
  if (hasReadyChannel) deliverMarketingEvent(name, payload, options, eventId);
  else {
    pendingEvents.push({ name, payload, options, eventId });
    if (pendingEvents.length > 100) pendingEvents.shift();
  }

  return eventId;
};

export const trackMarketingEventOnce = (key, name, payload = {}, options = {}) => {
  if (!key || trackedOnce.has(key)) return "";
  trackedOnce.add(key);
  if (trackedOnce.size > 500) trackedOnce.delete(trackedOnce.values().next().value);
  return trackMarketingEvent(name, payload, options);
};
