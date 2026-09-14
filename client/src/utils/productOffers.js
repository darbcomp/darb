const toId = (value) => {
  if (!value) return "";
  if (typeof value === "object") return String(value._id || value.id || "");
  return String(value);
};

const isExhausted = (offer) =>
  Number(offer?.usageLimit) > 0 &&
  Number(offer?.usedCount) >= Number(offer.usageLimit);

const getProductCategoryIds = (product) => [
  toId(product?.category),
  ...(product?.categories || []).map(toId),
].filter(Boolean);

export const isOfferRelevantToProduct = (offer, product) => {
  if (!offer || !product || isExhausted(offer)) return false;

  const offerType = offer.offerType || offer.scope;
  if (offerType === "sitewide" || offerType === "free_shipping") return true;

  if (offerType === "product") {
    const productId = toId(product);
    return (offer.products || []).some((item) => toId(item) === productId);
  }

  if (offerType === "category") {
    const categoryIds = getProductCategoryIds(product);
    return (offer.categories || []).some((item) => categoryIds.includes(toId(item)));
  }

  return false;
};

const getOneUnitSavings = (offer, price) => {
  const unitPrice = Math.max(Number(price) || 0, 0);
  let savings = 0;

  if (offer.discountType === "percentage") {
    savings = unitPrice * ((Number(offer.discountValue) || 0) / 100);
  } else if (offer.discountType === "fixed") {
    savings = Number(offer.discountValue) || 0;
  }

  if (Number(offer.maxDiscountAmount) > 0) {
    savings = Math.min(savings, Number(offer.maxDiscountAmount));
  }

  return Math.round(Math.min(Math.max(savings, 0), unitPrice) * 100) / 100;
};

export const getBestProductOffer = (offers = [], product, price) => {
  const relevant = offers
    .filter((offer) => isOfferRelevantToProduct(offer, product))
    .map((offer) => ({ offer, oneUnitSavings: getOneUnitSavings(offer, price) }))
    .filter(({ offer, oneUnitSavings }) =>
      offer.discountType === "free_shipping" || oneUnitSavings > 0
    )
    .sort((a, b) =>
      b.oneUnitSavings - a.oneUnitSavings ||
      (Number(b.offer.priority) || 0) - (Number(a.offer.priority) || 0)
    );

  if (!relevant.length) return null;

  const best = relevant[0];
  const minQuantity = Number(best.offer.minQuantity) || 0;
  const minOrderValue = Number(best.offer.minOrderValue) || 0;
  const directlyEligible =
    best.offer.discountType === "percentage" &&
    minQuantity <= 1 &&
    minOrderValue <= Number(price);

  return {
    ...best,
    directlyEligible,
    afterOfferPrice: directlyEligible
      ? Math.round(Math.max(Number(price) - best.oneUnitSavings, 0) * 100) / 100
      : null,
  };
};

export const getOfferCustomerTitle = (offer, language) => {
  if (!offer) return "";
  if (language === "ar") {
    return offer.arabicTitle || offer.title || offer.name || "";
  }
  return offer.title || offer.name || "";
};
