export const getActiveProductVariants = (product) => {
  const stored = Array.isArray(product?.variants) ? product.variants : [];
  const variants = stored
    .filter((variant) => variant.isActive !== false)
    .map((variant) => ({ ...variant, variantId: variant._id || variant.variantId || "" }));

  if (stored.length) return variants;
  return [{
    variantId: "",
    label: product?.sizeLabel || (product?.sizeMl ? `${product.sizeMl} ML` : ""),
    sizeMl: Number(product?.sizeMl) || 0,
    sku: product?.sku || "",
    price: Number(product?.price) || 0,
    compareAtPrice: Number(product?.compareAtPrice) || 0,
    stock: Number(product?.stock) || 0,
    isActive: product?.isActive !== false,
    isLegacy: true,
  }];
};

export const getStockLabel = (stock) => {
  const amount = Number(stock) || 0;
  if (amount <= 0) return "Out of Stock";
  if (amount <= 3) return `Only ${amount} left`;
  return "In Stock";
};
