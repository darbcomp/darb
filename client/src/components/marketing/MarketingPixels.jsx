import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { getPublicSettings } from "../../api/settingsApi";
import {
  configureMarketingChannels,
  flushPendingMarketingEvents,
  markMarketingChannelReady,
  trackMarketingEvent,
} from "../../utils/marketingEvents";

const isEnabled = (value) => String(value).toLowerCase() === "true";
const isValidMetaId = (value) => /^\d{5,30}$/.test(String(value || "").trim());

function installMetaPixel(pixelId) {
  if (!window.fbq) {
    const fbq = function (...args) {
      if (fbq.callMethod) fbq.callMethod(...args);
      else fbq.queue.push(args);
    };
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.queue = [];
    window.fbq = fbq;
    window._fbq = fbq;
  }
  if (!document.querySelector('script[data-darb-meta-pixel]')) {
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    script.dataset.darbMetaPixel = "true";
    document.head.appendChild(script);
  }
  if (!window.fbq.darbInitializedIds?.has(pixelId)) {
    window.fbq.darbInitializedIds = window.fbq.darbInitializedIds || new Set();
    window.fbq.darbInitializedIds.add(pixelId);
    window.fbq("init", pixelId);
  }
  markMarketingChannelReady("meta", true);
}

function installTikTokPixel(pixelId) {
  if (!window.ttq) window.ttq = { track: () => {} };
  if (!document.querySelector('script[data-darb-tiktok-pixel]')) {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${encodeURIComponent(pixelId)}&lib=ttq`;
    script.dataset.darbTiktokPixel = "true";
    document.head.appendChild(script);
  }
  markMarketingChannelReady("tiktok", true);
}

export default function MarketingPixels() {
  const location = useLocation();
  const lastPageViewNavigation = useRef("");
  const settingsQuery = useQuery({ queryKey: ["public-settings", "pixels"], queryFn: getPublicSettings, staleTime: 300_000 });
  const pixels = useMemo(
    () => settingsQuery.data?.data?.marketingPixels || {},
    [settingsQuery.data]
  );
  const config = useMemo(() => {
    const envMetaId = String(import.meta.env.VITE_META_PIXEL_ID || "").trim();
    const meta = envMetaId
      ? { id: envMetaId, enabled: isEnabled(import.meta.env.VITE_META_PIXEL_ENABLED) && isValidMetaId(envMetaId) }
      : { id: String(pixels.meta?.id || "").trim(), enabled: Boolean(pixels.meta?.enabled) && isValidMetaId(pixels.meta?.id) };
    return {
      meta,
      tiktok: { id: String(pixels.tiktok?.id || "").trim(), enabled: Boolean(pixels.tiktok?.enabled && pixels.tiktok?.id) },
    };
  }, [pixels]);

  useEffect(() => {
    configureMarketingChannels(config);
    if (config.tiktok.enabled) installTikTokPixel(config.tiktok.id);
    if (config.meta.enabled) installMetaPixel(config.meta.id);
    flushPendingMarketingEvents();
  }, [config]);

  useEffect(() => {
    if (!config.meta.enabled && !config.tiktok.enabled) return;
    const navigation = `${location.key}:${location.pathname}${location.search}`;
    if (lastPageViewNavigation.current === navigation) return;
    lastPageViewNavigation.current = navigation;
    trackMarketingEvent("PageView", {}, { mirrorMeta: true });
  }, [config.meta.enabled, config.meta.id, config.tiktok.enabled, config.tiktok.id, location.key, location.pathname, location.search]);

  return null;
}
