import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadEnv } from "vite";
import {
  DEFAULT_SOCIAL_IMAGE,
  INDEXABLE_FIXED_ROUTES,
  NOINDEX_FIXED_ROUTES,
  SITE_NAME,
  SITE_TAGLINE,
  absoluteUrl,
  breadcrumbJsonLd,
  fixedRouteMeta,
  normalizeSiteUrl,
  organizationJsonLd,
  productJsonLd,
  websiteJsonLd,
} from "../src/seo/seoConfig.js";

const projectRoot = process.cwd();
const distDir = path.join(projectRoot, "dist");
const baseHtml = await readFile(path.join(distDir, "index.html"), "utf8");
const loadedEnv = loadEnv("production", projectRoot, "");
const env = { ...loadedEnv, ...process.env };
const siteUrl = normalizeSiteUrl(env.VITE_SITE_URL || "");
const apiUrl = normalizeSiteUrl(env.SEO_PRERENDER_API_URL || "");

const escapeHtml = (value = "") => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

const trimDescription = (value = "", maxLength = 170) => {
  const clean = String(value).replace(/\s+/g, " ").trim();
  return clean.length > maxLength ? `${clean.slice(0, maxLength - 1).trim()}…` : clean;
};

function seoHead({ title, description, route, robots = "index, follow", image = DEFAULT_SOCIAL_IMAGE, type = "website", jsonLd = [] }) {
  const canonical = robots.startsWith("noindex") ? "" : absoluteUrl(route, siteUrl);
  const socialImage = absoluteUrl(image, siteUrl);
  const tags = [
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<meta name="robots" content="${escapeHtml(robots)}" />`,
    canonical ? `<link rel="canonical" href="${escapeHtml(canonical)}" />` : "",
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    canonical ? `<meta property="og:url" content="${escapeHtml(canonical)}" />` : "",
    socialImage ? `<meta property="og:image" content="${escapeHtml(socialImage)}" />` : "",
    `<meta property="og:type" content="${escapeHtml(type)}" />`,
    `<meta name="twitter:card" content="${socialImage ? "summary_large_image" : "summary"}" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    socialImage ? `<meta name="twitter:image" content="${escapeHtml(socialImage)}" />` : "",
    ...(Array.isArray(jsonLd) ? jsonLd : [jsonLd]).filter(Boolean).map((entry) => `<script type="application/ld+json" data-darb-seo-jsonld="true">${JSON.stringify(entry).replace(/</g, "\\u003c")}</script>`),
    `<title>${escapeHtml(title)}</title>`,
  ];
  return tags.filter(Boolean).join("\n    ");
}

function renderHtml(meta) {
  const removable = [
    /\s*<meta\b[^>]*name=["']description["'][^>]*>/gi,
    /\s*<meta\b[^>]*name=["']robots["'][^>]*>/gi,
    /\s*<meta\b[^>]*name=["']twitter:[^"']+["'][^>]*>/gi,
    /\s*<meta\b[^>]*property=["']og:[^"']+["'][^>]*>/gi,
    /\s*<link\b[^>]*rel=["']canonical["'][^>]*>/gi,
    /\s*<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi,
    /\s*<title>[\s\S]*?<\/title>/gi,
  ];
  const clean = removable.reduce((html, expression) => html.replace(expression, ""), baseHtml);
  return clean.replace("</head>", `    ${seoHead(meta)}\n  </head>`);
}

async function writeRoute(route, html) {
  const target = route === "/" ? path.join(distDir, "index.html") : path.join(distDir, route.replace(/^\/+|\/+$/g, ""), "index.html");
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, html, "utf8");
}

async function fetchPublic(endpoint) {
  const response = await fetch(`${apiUrl}${endpoint}`, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`SEO prerender request failed (${response.status}) for ${endpoint}`);
  return response.json();
}

async function fetchProducts() {
  const products = [];
  let page = 1;
  let pages = 1;
  do {
    const payload = await fetchPublic(`/products?limit=100&page=${page}&placeholder=false`);
    products.push(...(payload.data || []));
    pages = Math.max(1, Number(payload.pagination?.pages) || 1);
    page += 1;
  } while (page <= pages);
  return products.filter((product) => product.isActive !== false && product.isPlaceholder !== true && product.slug);
}

function productOffer(product) {
  const variants = (product.variants || []).filter((variant) => variant.isActive !== false && Number(variant.price) > 0);
  const priced = variants.sort((a, b) => Number(a.price) - Number(b.price));
  const price = Number(priced[0]?.price) || Number(product.price) || 0;
  const inStock = variants.length
    ? variants.some((variant) => Number(variant.stock) > 0 && Number(variant.price) > 0)
    : Number(product.stock) > 0 && price > 0;
  return { price, inStock };
}

function mainImage(images = []) {
  return [...images].sort((a, b) => Number(Boolean(b.isMain)) - Number(Boolean(a.isMain)))[0]?.url || "";
}

let products = [];
let categories = [];
let publicSettings = {};

if (apiUrl) {
  try {
    [products, categories, publicSettings] = await Promise.all([
      fetchProducts(),
      fetchPublic("/categories").then((payload) => payload.data || []),
      fetchPublic("/settings/public").then((payload) => payload.data || payload || {}),
    ]);
  } catch (error) {
    console.error(`[seo] ${error.message}`);
    process.exitCode = 1;
    throw error;
  }
} else {
  console.warn("[seo] SEO_PRERENDER_API_URL is not configured; dynamic product/category shells and URLs were skipped.");
}

for (const route of INDEXABLE_FIXED_ROUTES) {
  const fallback = fixedRouteMeta(route, "en");
  const meta = route === "/" ? {
    title: publicSettings.seo?.metaTitle || fallback.title,
    description: publicSettings.seo?.metaDescription || fallback.description,
  } : fallback;
  const jsonLd = route === "/" ? [organizationJsonLd(siteUrl), websiteJsonLd(siteUrl)] : [];
  await writeRoute(route, renderHtml({ ...meta, route, jsonLd }));
}

for (const route of NOINDEX_FIXED_ROUTES) {
  await writeRoute(route, renderHtml({ ...fixedRouteMeta(route, "en"), route, robots: "noindex, nofollow" }));
}

for (const category of categories) {
  if (!category?.slug) continue;
  const route = `/category/${category.slug}`;
  const title = category.seoTitle || `${category.name} | ${SITE_NAME}`;
  const description = trimDescription(category.seoDescription || category.description || `Explore ${category.name} fragrances from Darb.`);
  const jsonLd = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Shop", path: "/shop" },
    { name: category.name, path: route },
  ], siteUrl);
  await writeRoute(route, renderHtml({ title, description, route, image: category.image?.url, jsonLd }));
}

for (const product of products) {
  const route = `/product/${product.slug}`;
  const title = product.metaTitle || `${product.name} | ${SITE_NAME}`;
  const description = trimDescription(product.metaDescription || product.shortDescription || product.description || SITE_TAGLINE);
  const image = mainImage(product.images);
  const offer = productOffer(product);
  const category = product.category;
  const jsonLd = [
    productJsonLd({ product, title: product.name, description, path: route, image, ...offer }, siteUrl),
    breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Shop", path: "/shop" },
      ...(category?.slug ? [{ name: category.name, path: `/category/${category.slug}` }] : []),
      { name: product.name, path: route },
    ], siteUrl),
  ];
  await writeRoute(route, renderHtml({ title, description, route, image, type: "product", jsonLd }));
}

await writeFile(path.join(distDir, "404.html"), renderHtml({
  title: `Page not found | ${SITE_NAME}`,
  description: "This path does not exist or is no longer available.",
  route: "/404",
  robots: "noindex, nofollow",
}), "utf8");

const sitemapRoutes = siteUrl
  ? [...INDEXABLE_FIXED_ROUTES, ...categories.map((category) => `/category/${category.slug}`), ...products.map((product) => `/product/${product.slug}`)]
  : [];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemapRoutes.map((route) => `\n  <url><loc>${escapeHtml(absoluteUrl(route, siteUrl))}</loc></url>`).join("")}\n</urlset>\n`;
await writeFile(path.join(distDir, "sitemap.xml"), sitemap, "utf8");

const robots = [
  "User-agent: *",
  "Allow: /",
  "Disallow: /admin",
  "Disallow: /account",
  "Disallow: /cart",
  "Disallow: /checkout",
  "Disallow: /order-success",
  "Disallow: /track-order",
  "Disallow: /login",
  "Disallow: /register",
  siteUrl ? `Sitemap: ${siteUrl}/sitemap.xml` : "",
].filter(Boolean).join("\n");
await writeFile(path.join(distDir, "robots.txt"), `${robots}\n`, "utf8");

if (!siteUrl) console.warn("[seo] VITE_SITE_URL is not configured; canonical URLs, absolute social images, and sitemap URLs were omitted.");
console.log(`[seo] Generated ${INDEXABLE_FIXED_ROUTES.length + NOINDEX_FIXED_ROUTES.length} fixed route shells, ${products.length} product shells, ${categories.length} category shells, and 404.html.`);
