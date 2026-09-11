export const SITE_NAME = "Darb Perfumes";
export const SITE_TAGLINE = "A scent for every path.";
export const DEFAULT_SOCIAL_IMAGE = "/images/logo/green.webp";

export const INDEXABLE_FIXED_ROUTES = [
  "/",
  "/shop",
  "/contact",
  "/shipping-delivery",
  "/returns-exchanges",
  "/privacy-policy",
  "/terms-conditions",
];

export const NOINDEX_FIXED_ROUTES = [
  "/cart",
  "/checkout",
  "/order-success",
  "/track-order",
  "/login",
  "/register",
  "/account",
  "/account/orders",
  "/admin/login",
  "/admin",
  "/admin/products",
  "/admin/categories",
  "/admin/orders",
  "/admin/offers",
  "/admin/bundles",
  "/admin/coupons",
  "/admin/waitlist",
  "/admin/reviews",
  "/admin/analytics",
  "/admin/settings",
];

export const FIXED_ROUTE_SEO = {
  "/": {
    en: {
      title: "Darb Perfumes | A Scent for Every Path",
      description: "Discover Darb perfumes and musk—distinctive scents made to become part of your story.",
    },
    ar: {
      title: "درب للعطور | عطر لكل درب",
      description: "اكتشف عطور ومسك درب؛ روائح مميزة صُممت لتصبح جزءاً من حكايتك.",
    },
  },
  "/shop": {
    en: {
      title: "Shop Perfumes & Musk | Darb",
      description: "Explore Darb perfumes and concentrated musk, and find the scent that belongs on your path.",
    },
    ar: {
      title: "تسوّق العطور والمسك | درب",
      description: "اكتشف عطور ومسك درب المركز، واختر الرائحة التي ترافق دربك.",
    },
  },
  "/contact": {
    en: {
      title: "Contact Darb | Customer Care",
      description: "Contact Darb for help choosing a scent, checking an order, or answering a question along the way.",
    },
    ar: {
      title: "تواصل مع درب | خدمة العملاء",
      description: "تواصل مع درب للمساعدة في اختيار عطر أو متابعة طلب أو الإجابة عن أي سؤال.",
    },
  },
  "/shipping-delivery": {
    en: {
      title: "Shipping & Delivery | Darb Perfumes",
      description: "Learn how Darb perfume orders are prepared, shipped, and delivered across Egypt.",
    },
    ar: {
      title: "الشحن والتوصيل | درب للعطور",
      description: "تعرّف على طريقة تجهيز وشحن وتوصيل طلبات درب داخل مصر.",
    },
  },
  "/returns-exchanges": {
    en: {
      title: "Returns & Exchanges | Darb Perfumes",
      description: "Read Darb’s guidance for return and exchange requests and what to do if an order is not right.",
    },
    ar: {
      title: "الاستبدال والاسترجاع | درب للعطور",
      description: "اطّلع على إرشادات درب لطلبات الاستبدال والاسترجاع وما يجب فعله عند وجود مشكلة في الطلب.",
    },
  },
  "/privacy-policy": {
    en: {
      title: "Privacy Policy | Darb Perfumes",
      description: "Learn how Darb handles personal information across shopping, orders, reviews, and customer care.",
    },
    ar: {
      title: "سياسة الخصوصية | درب للعطور",
      description: "تعرّف على كيفية تعامل درب مع بياناتك أثناء التسوق والطلبات والمراجعات وخدمة العملاء.",
    },
  },
  "/terms-conditions": {
    en: {
      title: "Terms & Conditions | Darb Perfumes",
      description: "Review the terms that apply when browsing Darb, placing an order, or using a reward.",
    },
    ar: {
      title: "الشروط والأحكام | درب للعطور",
      description: "راجع الشروط المطبقة عند تصفح درب أو تقديم طلب أو استخدام مكافأة.",
    },
  },
};

const utilityTitles = {
  "/cart": "Cart",
  "/checkout": "Checkout",
  "/order-success": "Order received",
  "/track-order": "Track order",
  "/login": "Sign in",
  "/register": "Create account",
  "/account": "Account",
  "/account/orders": "My orders",
};

export function normalizeSiteUrl(value = "") {
  return String(value).trim().replace(/\/+$/, "");
}

export function absoluteUrl(value = "", siteUrl = "") {
  if (!value) return "";
  try {
    return new URL(value).toString();
  } catch {
    const base = normalizeSiteUrl(siteUrl);
    return base ? `${base}/${String(value).replace(/^\/+/, "")}` : "";
  }
}

export function fixedRouteMeta(pathname, language = "en") {
  const entry = FIXED_ROUTE_SEO[pathname];
  if (entry) return entry[language === "ar" ? "ar" : "en"];

  if (pathname.startsWith("/admin")) {
    return { title: `Admin | ${SITE_NAME}`, description: "Darb administration." };
  }

  const title = utilityTitles[pathname] || (pathname.startsWith("/account/") ? "Account" : "Private page");
  return { title: `${title} | ${SITE_NAME}`, description: SITE_TAGLINE };
}

export function isNoIndexRoute(pathname) {
  return NOINDEX_FIXED_ROUTES.includes(pathname) || pathname.startsWith("/account/") || pathname.startsWith("/admin/");
}

export function organizationJsonLd(siteUrl) {
  const url = normalizeSiteUrl(siteUrl);
  if (!url) return null;
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url,
    logo: absoluteUrl(DEFAULT_SOCIAL_IMAGE, url),
  };
}

export function websiteJsonLd(siteUrl) {
  const url = normalizeSiteUrl(siteUrl);
  if (!url) return null;
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url,
  };
}

export function breadcrumbJsonLd(items, siteUrl) {
  const base = normalizeSiteUrl(siteUrl);
  if (!base || !items?.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path, base),
    })),
  };
}

export function productJsonLd({ product, title, description, path, image, price, inStock, rating }, siteUrl) {
  if (!product || !price) return null;
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: title || product.name,
    description,
    image: image ? [absoluteUrl(image, siteUrl)] : undefined,
    sku: product.variants?.find((variant) => variant.isActive && variant.sku)?.sku || product.sku || undefined,
    url: absoluteUrl(path, siteUrl),
    offers: {
      "@type": "Offer",
      priceCurrency: "EGP",
      price: Number(price).toFixed(2),
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: absoluteUrl(path, siteUrl),
    },
  };
  if (rating?.count > 0 && rating.average > 0) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Number(rating.average).toFixed(1),
      reviewCount: Number(rating.count),
    };
  }
  return data;
}
