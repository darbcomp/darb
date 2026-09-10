import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPublicSettings } from "../../api/settingsApi";
import { hasTrackingConsent } from "../../utils/marketingEvents";

function MarketingPixels() {
  const settingsQuery = useQuery({ queryKey: ["public-settings", "pixels"], queryFn: getPublicSettings, staleTime: 300_000 });
  const pixels = settingsQuery.data?.data?.marketingPixels;

  useEffect(() => {
    if (!hasTrackingConsent() || !pixels) return;
    if (pixels.meta?.enabled && pixels.meta.id && !window.fbq) {
      const script = document.createElement("script");
      script.async = true;
      script.src = "https://connect.facebook.net/en_US/fbevents.js";
      document.head.appendChild(script);
      window.fbq = (...args) => (window.fbq.queue = window.fbq.queue || []).push(args);
      window.fbq("init", pixels.meta.id);
      window.fbq("track", "PageView");
    }
    if (pixels.tiktok?.enabled && pixels.tiktok.id && !window.ttq) {
      const script = document.createElement("script");
      script.async = true;
      script.src = "https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=" + encodeURIComponent(pixels.tiktok.id) + "&lib=ttq";
      document.head.appendChild(script);
      window.ttq = { track: () => {} };
    }
  }, [pixels]);

  return null;
}

export default MarketingPixels;
