import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { getPublicSettings } from "../../api/settingsApi";
import { useLanguage } from "../../context/LanguageContext";
import {
  DEFAULT_SOCIAL_IMAGE,
  INDEXABLE_FIXED_ROUTES,
  NOINDEX_FIXED_ROUTES,
  fixedRouteMeta,
  isNoIndexRoute,
  organizationJsonLd,
  websiteJsonLd,
} from "../../seo/seoConfig";
import SEO from "./SEO";
import { getRuntimeSiteUrl } from "../../seo/runtimeSeo";

export default function RouteSEO() {
  const { pathname } = useLocation();
  const { language } = useLanguage();
  const isDynamicCatalogRoute = pathname.startsWith("/product/") || pathname.startsWith("/category/");
  const isKnownFixedRoute = INDEXABLE_FIXED_ROUTES.includes(pathname) || NOINDEX_FIXED_ROUTES.includes(pathname);
  const settingsQuery = useQuery({
    queryKey: ["public-settings"],
    queryFn: getPublicSettings,
    enabled: pathname === "/",
    staleTime: 5 * 60_000,
  });

  if (isDynamicCatalogRoute || !isKnownFixedRoute) return null;

  const configuredSeo = settingsQuery.data?.data?.seo || settingsQuery.data?.seo || {};
  const defaults = fixedRouteMeta(pathname, language);
  const homeEnglishTitle = language === "en" && configuredSeo.metaTitle;
  const homeEnglishDescription = language === "en" && configuredSeo.metaDescription;
  const noindex = isNoIndexRoute(pathname);
  const siteUrl = getRuntimeSiteUrl();
  const jsonLd = pathname === "/" ? [organizationJsonLd(siteUrl), websiteJsonLd(siteUrl)] : [];

  return (
    <SEO
      title={pathname === "/" && homeEnglishTitle ? homeEnglishTitle : defaults.title}
      description={pathname === "/" && homeEnglishDescription ? homeEnglishDescription : defaults.description}
      path={pathname}
      robots={noindex ? "noindex, nofollow" : "index, follow"}
      image={DEFAULT_SOCIAL_IMAGE}
      jsonLd={jsonLd}
    />
  );
}
