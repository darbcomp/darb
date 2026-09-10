const getLegacyVariant = (product) => ({
  variantId: "",
  label: product?.sizeLabel || (Number(product?.sizeMl) > 0 ? `${Number(product.sizeMl)} ML` : ""),
  sizeMl: Number(product?.sizeMl) || 0,
  sku: product?.sku || "",
  price: Number(product?.price) || 0,
  compareAtPrice: Number(product?.compareAtPrice) || 0,
  stock: Number(product?.stock) || 0,
  isActive: product?.isActive !== false,
  isLegacy: true,
});

const getProductVariants = (product, { activeOnly = false } = {}) => {
  const stored = Array.isArray(product?.variants) ? product.variants : [];
  const variants = stored.map((variant) => ({
    variantId: String(variant?._id || variant?.variantId || ""),
    label: variant?.label || (Number(variant?.sizeMl) > 0 ? `${Number(variant.sizeMl)} ML` : ""),
    sizeMl: Number(variant?.sizeMl) || 0,
    sku: variant?.sku || "",
    price: Number(variant?.price) || 0,
    compareAtPrice: Number(variant?.compareAtPrice) || 0,
    stock: Number(variant?.stock) || 0,
    isActive: variant?.isActive !== false,
    isLegacy: false,
  }));
  const normalized = variants.length ? variants : [getLegacyVariant(product)];
  return activeOnly ? normalized.filter((variant) => variant.isActive) : normalized;
};

const findProductVariant = (product, requestedVariantId = "") => {
  const variants = getProductVariants(product, { activeOnly: true });
  const requested = String(requestedVariantId || "").trim();
  if (!requested) return variants.length === 1 ? variants[0] : null;
  return variants.find((variant) => variant.variantId === requested) || null;
};

module.exports = { getLegacyVariant, getProductVariants, findProductVariant };
