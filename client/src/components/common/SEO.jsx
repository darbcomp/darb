import { useEffect } from "react";
import { absoluteUrl, DEFAULT_SOCIAL_IMAGE, SITE_NAME } from "../../seo/seoConfig";
import { getRuntimeSiteUrl } from "../../seo/runtimeSeo";

function syncMeta(selector, attributes, content) {
  let element = document.head.querySelector(selector);
  if (!content) {
    element?.remove();
    return;
  }
  if (!element) {
    element = document.createElement("meta");
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
  element.dataset.darbSeo = "true";
}

function syncCanonical(href) {
  let element = document.head.querySelector('link[rel="canonical"]');
  if (!href) {
    element?.remove();
    return;
  }
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", "canonical");
    document.head.appendChild(element);
  }
  element.setAttribute("href", href);
  element.dataset.darbSeo = "true";
}

export default function SEO({
  title = SITE_NAME,
  description = "A scent for every path.",
  path = "/",
  robots = "index, follow",
  image = DEFAULT_SOCIAL_IMAGE,
  type = "website",
  jsonLd = [],
}) {
  const siteUrl = getRuntimeSiteUrl();
  const canonical = robots.startsWith("noindex") ? "" : absoluteUrl(path, siteUrl);
  const socialImage = absoluteUrl(image || DEFAULT_SOCIAL_IMAGE, siteUrl);
  const structuredData = JSON.stringify((Array.isArray(jsonLd) ? jsonLd : [jsonLd]).filter(Boolean));

  useEffect(() => {
    document.title = title;
    syncMeta('meta[name="description"]', { name: "description" }, description);
    syncMeta('meta[name="robots"]', { name: "robots" }, robots);
    syncCanonical(canonical);
    syncMeta('meta[property="og:title"]', { property: "og:title" }, title);
    syncMeta('meta[property="og:description"]', { property: "og:description" }, description);
    syncMeta('meta[property="og:url"]', { property: "og:url" }, canonical);
    syncMeta('meta[property="og:image"]', { property: "og:image" }, socialImage);
    syncMeta('meta[property="og:type"]', { property: "og:type" }, type);
    syncMeta('meta[name="twitter:card"]', { name: "twitter:card" }, socialImage ? "summary_large_image" : "summary");
    syncMeta('meta[name="twitter:title"]', { name: "twitter:title" }, title);
    syncMeta('meta[name="twitter:description"]', { name: "twitter:description" }, description);
    syncMeta('meta[name="twitter:image"]', { name: "twitter:image" }, socialImage);

    document.head.querySelectorAll("script[data-darb-seo-jsonld]").forEach((script) => script.remove());
    JSON.parse(structuredData).forEach((entry) => {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.dataset.darbSeoJsonld = "true";
      script.textContent = JSON.stringify(entry).replace(/</g, "\\u003c");
      document.head.appendChild(script);
    });
  }, [canonical, description, robots, socialImage, structuredData, title, type]);

  return null;
}
