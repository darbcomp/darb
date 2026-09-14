const hasText = (value) =>
  typeof value === "string" && value.trim().length > 0;

const hasItems = (value) => Array.isArray(value) && value.length > 0;

const chooseText = (arabicValue, englishValue, language) =>
  language === "ar" && hasText(arabicValue) ? arabicValue : englishValue;

const chooseItems = (arabicValue, englishValue, language) =>
  language === "ar" && hasItems(arabicValue) ? arabicValue : englishValue;

const localizeSizeLabel = (value, language) =>
  language === "ar" && typeof value === "string"
    ? value.replace(/(\d+(?:\.\d+)?)\s*ML\b/gi, "$1 مل")
    : value;

export function localizeCategory(category, language) {
  if (!category || language !== "ar") return category;

  return {
    ...category,
    name: chooseText(category.arabicName, category.name, language),
    description: chooseText(
      category.arabicDescription,
      category.description,
      language
    ),
    seoTitle: chooseText(category.arabicSeoTitle, category.seoTitle, language),
    seoDescription: chooseText(
      category.arabicSeoDescription,
      category.seoDescription,
      language
    ),
  };
}

export function localizeProduct(product, language) {
  if (!product || language !== "ar") return product;

  const arabicNotes = product.arabicScentNotes || {};
  const englishNotes = product.scentNotes || {};

  return {
    ...product,
    name: chooseText(product.arabicName, product.name, language),
    inspiredBy: chooseText(
      product.arabicInspiredBy,
      product.inspiredBy,
      language
    ),
    shortDescription: chooseText(
      product.arabicShortDescription,
      product.shortDescription,
      language
    ),
    description: chooseText(
      product.arabicDescription,
      product.description,
      language
    ),
    scentFamilies: chooseItems(
      product.arabicScentFamilies,
      product.scentFamilies,
      language
    ),
    bestFor: chooseItems(product.arabicBestFor, product.bestFor, language),
    keyNotes: chooseItems(product.arabicKeyNotes, product.keyNotes, language),
    scentNotes: {
      top: chooseItems(arabicNotes.top, englishNotes.top, language) || [],
      middle:
        chooseItems(arabicNotes.middle, englishNotes.middle, language) || [],
      base: chooseItems(arabicNotes.base, englishNotes.base, language) || [],
    },
    sizeLabel: localizeSizeLabel(product.sizeLabel, language),
    variants: Array.isArray(product.variants)
      ? product.variants.map((variant) => ({
          ...variant,
          label: localizeSizeLabel(variant.label, language),
        }))
      : product.variants,
    category: localizeCategory(product.category, language),
    categorySnapshot: localizeCategory(product.categorySnapshot, language),
    categories: Array.isArray(product.categories)
      ? product.categories.map((category) => localizeCategory(category, language))
      : product.categories,
  };
}

export function localizeBundle(bundle, language) {
  if (!bundle || language !== "ar") return bundle;

  return {
    ...bundle,
    title: chooseText(
      bundle.arabicTitle,
      bundle.title || bundle.name,
      language
    ),
    description: chooseText(
      bundle.arabicDescription,
      bundle.description,
      language
    ),
  };
}

export function localizeOffer(offer, language) {
  if (!offer || language !== "ar") return offer;

  return {
    ...offer,
    title: chooseText(
      offer.arabicTitle,
      offer.title || offer.name,
      language
    ),
    description: chooseText(
      offer.arabicDescription,
      offer.description,
      language
    ),
  };
}
