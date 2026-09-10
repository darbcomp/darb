const parseMaybeJSON = (value, fallback = null) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string") return value;
  try { return JSON.parse(value); } catch { return fallback; }
};

const validateProductRequest = (req, res, next) => {
  const isCreate = req.method === "POST";
  const body = req.body || {};
  const errors = [];
  if (isCreate && !String(body.name || "").trim()) errors.push("Product name is required.");

  for (const field of ["price", "compareAtPrice", "costPrice", "stock", "lowStockThreshold", "sizeMl"]) {
    if (body[field] === undefined || body[field] === "") continue;
    const value = Number(body[field]);
    if (!Number.isFinite(value) || value < 0) errors.push(`${field} must be a non-negative number.`);
  }

  const variants = parseMaybeJSON(body.variants, null);
  if (variants !== null && !Array.isArray(variants)) errors.push("Variants must be an array.");
  if (Array.isArray(variants)) {
    const seenSkus = new Set();
    variants.forEach((variant, index) => {
      for (const field of ["price", "compareAtPrice", "stock", "sizeMl"]) {
        if (variant?.[field] === undefined || variant?.[field] === "") continue;
        const value = Number(variant[field]);
        if (!Number.isFinite(value) || value < 0) errors.push(`Variant ${index + 1} ${field} is invalid.`);
      }
      const sku = String(variant?.sku || "").trim().toUpperCase();
      if (sku && seenSkus.has(sku)) errors.push(`Duplicate variant SKU: ${sku}.`);
      if (sku) seenSkus.add(sku);
    });
  }

  if ((req.files || []).length > 10) errors.push("A product can have at most 10 images.");
  if (errors.length) return res.status(400).json({ success: false, message: errors[0], errors });
  return next();
};

module.exports = { validateProductRequest };
