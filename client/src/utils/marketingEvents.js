export const hasTrackingConsent = () =>
  typeof window !== "undefined" && window.localStorage.getItem("darb_tracking_consent") === "granted";

export const trackMarketingEvent = (name, payload = {}) => {
  if (!hasTrackingConsent()) return;
  window.fbq?.("track", name, payload);
  window.ttq?.track?.(name, payload);
};
