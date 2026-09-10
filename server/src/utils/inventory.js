const buildReserveStockOperation = (item) => {
  const quantity = Number(item.quantity) || 0;
  const variantId = item.variant?.variantId || "";
  return variantId
    ? {
        filter: { _id: item.product, isActive: true, variants: { $elemMatch: { _id: variantId, isActive: true, stock: { $gte: quantity } } } },
        update: { $inc: { "variants.$.stock": -quantity } },
      }
    : {
        filter: { _id: item.product, isActive: true, stock: { $gte: quantity } },
        update: { $inc: { stock: -quantity } },
      };
};

const buildRestoreStockOperation = (item) => {
  const quantity = Number(item.quantity) || 0;
  const variantId = item.variant?.variantId || "";
  return variantId
    ? { filter: { _id: item.product, "variants._id": variantId }, update: { $inc: { "variants.$.stock": quantity } } }
    : { filter: { _id: item.product }, update: { $inc: { stock: quantity } } };
};

module.exports = { buildReserveStockOperation, buildRestoreStockOperation };
