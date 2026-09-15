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

const buildSyncVariantStockOperation = (item) => {
  const variantId = item.variant?.variantId || "";
  if (!variantId) return null;

  return {
    filter: { _id: item.product },
    update: [
      {
        $set: {
          stock: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: { $ifNull: ["$variants", []] },
                    as: "variant",
                    cond: { $eq: ["$$variant.isActive", true] },
                  },
                },
                as: "variant",
                in: { $ifNull: ["$$variant.stock", 0] },
              },
            },
          },
        },
      },
    ],
  };
};

module.exports = {
  buildReserveStockOperation,
  buildRestoreStockOperation,
  buildSyncVariantStockOperation,
};
