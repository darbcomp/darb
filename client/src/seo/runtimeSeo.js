import { normalizeSiteUrl } from "./seoConfig";

const configuredSiteUrl = normalizeSiteUrl(import.meta.env.VITE_SITE_URL || "");

export function getRuntimeSiteUrl() {
  if (configuredSiteUrl) return configuredSiteUrl;
  return typeof window !== "undefined" ? normalizeSiteUrl(window.location.origin) : "";
}
