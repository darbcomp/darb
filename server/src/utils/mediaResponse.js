const sanitizePublicImage = (image) => {
  if (!image || typeof image !== "object") return image;
  return {
    url: image.url || "",
    alt: image.alt || "",
    ...(image.isMain !== undefined ? { isMain: Boolean(image.isMain) } : {}),
  };
};

const sanitizePublicProductMedia = (product) => {
  if (!product || typeof product !== "object") return product;
  return {
    ...product,
    images: Array.isArray(product.images)
      ? product.images.map(sanitizePublicImage)
      : [],
  };
};

const sanitizePublicCategoryMedia = (category) => {
  if (!category) return category;
  return {
    ...category,
    image: sanitizePublicImage(category.image),
  };
};

const sanitizePublicReviewMedia = (media) => {
  if (!media || typeof media !== "object") return { type: "none", url: "" };
  return {
    type: media.type || "none",
    url: media.url || "",
    posterUrl: media.posterUrl || "",
    alt: media.alt || "",
  };
};

const sanitizePublicBundleMedia = (bundle) => {
  if (!bundle) return bundle;
  return {
    ...bundle,
    image: sanitizePublicImage(bundle.image),
    allowedProducts: (bundle.allowedProducts || []).map(sanitizePublicProductMedia),
    specificItems: (bundle.specificItems || []).map((item) => ({
      ...item,
      product: sanitizePublicProductMedia(item.product),
    })),
  };
};

module.exports = {
  sanitizePublicImage,
  sanitizePublicProductMedia,
  sanitizePublicCategoryMedia,
  sanitizePublicReviewMedia,
  sanitizePublicBundleMedia,
};
