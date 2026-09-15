const Coupon = require("../models/Coupon");
const Offer = require("../models/Offer");
const Bundle = require("../models/Bundle");

const toId = (value) => {
  if (!value) return "";

  if (typeof value === "string") {
    return value;
  }

  if (value._id) {
    return String(value._id);
  }

  return String(value);
};

const isSameId = (a, b) => {
  return (
    toId(a) &&
    toId(b) &&
    toId(a) === toId(b)
  );
};

const activeWindowFilter = () => {
  const now = new Date();

  return {
    isActive: true,

    $and: [
      {
        $or: [
          { startAt: null },

          {
            startAt: {
              $exists: false,
            },
          },

          {
            startAt: {
              $lte: now,
            },
          },
        ],
      },

      {
        $or: [
          { endAt: null },

          {
            endAt: {
              $exists: false,
            },
          },

          {
            endAt: {
              $gte: now,
            },
          },
        ],
      },
    ],
  };
};

const withSession = (
  query,
  session
) => {
  if (session) {
    query.session(session);
  }

  return query;
};

const calculateOrderTotals = ({
  subtotal = 0,
  discountTotal = 0,
  deliveryFee = 0,
}) => {
  const cleanSubtotal = Math.max(
    Number(subtotal) || 0,
    0
  );

  const cleanDiscount = Math.max(
    Number(discountTotal) || 0,
    0
  );

  const cleanDeliveryFee =
    Math.max(
      Number(deliveryFee) || 0,
      0
    );

  const finalDiscount =
    Math.min(
      cleanDiscount,
      cleanSubtotal
    );

  return {
    subtotal:
      cleanSubtotal,

    discountTotal:
      finalDiscount,

    deliveryFee:
      cleanDeliveryFee,

    total: Math.max(
      cleanSubtotal -
        finalDiscount +
        cleanDeliveryFee,
      0
    ),
  };
};

const getItemProductId = (
  item
) =>
  toId(
    item.productDoc?._id ||
      item.product?._id ||
      item.product
  );

const getItemCategoryId = (
  item
) =>
  toId(
    item.productDoc?.category?._id ||
      item.productDoc?.category ||
      item.category?._id ||
      item.category
  );

const getItemCategoryIds = (item) => {
  const categories = Array.isArray(item.productDoc?.categories) ? item.productDoc.categories : [];
  return [...new Set([getItemCategoryId(item), ...categories.map((category) => toId(category?._id || category))].filter(Boolean))];
};

const itemMatchesCategories = (item, categoryIds = []) =>
  getItemCategoryIds(item).some((categoryId) => categoryIds.includes(categoryId));

const getItemSubtotal = (
  items = []
) =>
  items.reduce(
    (sum, item) =>
      sum +
      (Number(
        item.lineTotal
      ) || 0),
    0
  );

const getItemQuantity = (
  items = []
) =>
  items.reduce(
    (sum, item) =>
      sum +
      (Number(
        item.quantity
      ) || 0),
    0
  );

const capDiscount = (
  amount,
  maxDiscountAmount,
  maxSubtotal
) => {
  let discount = Math.max(
    Number(amount) || 0,
    0
  );

  if (
    Number(
      maxDiscountAmount
    ) > 0
  ) {
    discount = Math.min(
      discount,
      Number(
        maxDiscountAmount
      )
    );
  }

  discount = Math.min(
    discount,

    Math.max(
      Number(maxSubtotal) || 0,
      0
    )
  );

  return (
    Math.round(
      discount * 100
    ) / 100
  );
};

const calculateDiscountAmount = ({
  discountType,
  discountValue,
  eligibleSubtotal,
  maxDiscountAmount,
}) => {
  if (
    discountType ===
    "free_shipping"
  ) {
    return {
      amount: 0,
      freeShipping: true,
    };
  }

  let amount = 0;

  if (
    discountType ===
    "percentage"
  ) {
    amount =
      eligibleSubtotal *
      ((Number(
        discountValue
      ) || 0) /
        100);
  }

  if (
    discountType === "fixed"
  ) {
    amount =
      Number(
        discountValue
      ) || 0;
  }

  return {
    amount: capDiscount(
      amount,
      maxDiscountAmount,
      eligibleSubtotal
    ),

    freeShipping: false,
  };
};

const getOfferEligibleItems = (
  offer,
  items
) => {
  const productIds =
    (
      offer.products || []
    ).map(toId);

  const categoryIds =
    (
      offer.categories || []
    ).map(toId);

  if (
    offer.offerType ===
      "sitewide" ||
    offer.offerType ===
      "free_shipping"
  ) {
    return items;
  }

  if (
    offer.offerType ===
    "product"
  ) {
    return items.filter(
      (item) =>
        productIds.includes(
          getItemProductId(item)
        )
    );
  }

  if (
    offer.offerType ===
    "category"
  ) {
    return items.filter(
      (item) =>
        itemMatchesCategories(item, categoryIds)
    );
  }

  return [];
};

const discountValueIncludingShipping =
  (
    discounts,
    baseDeliveryFee
  ) => {
    const amount =
      discounts.reduce(
        (sum, discount) =>
          sum +
          (Number(
            discount.amount
          ) || 0),
        0
      );

    const freeShipping =
      discounts.some(
        (discount) =>
          discount.freeShipping
      );

    return (
      amount +
      (freeShipping
        ? Number(
            baseDeliveryFee
          ) || 0
        : 0)
    );
  };

const calculateOfferDiscounts =
  async ({
    items,
    subtotal,
    baseDeliveryFee,
    session,
  }) => {
    const query =
      Offer.find(
        activeWindowFilter()
      ).sort({
        priority: -1,
        createdAt: -1,
      });

    const offers =
      await withSession(
        query,
        session
      );

    const eligibleOffers = [];

    for (const offer of offers) {
      if (
        Number(
          offer.usageLimit
        ) > 0 &&
        Number(
          offer.usedCount
        ) >=
          Number(
            offer.usageLimit
          )
      ) {
        continue;
      }

      const eligibleItems =
        getOfferEligibleItems(
          offer,
          items
        );

      const eligibleSubtotal =
        getItemSubtotal(
          eligibleItems
        );

      const eligibleQuantity =
        getItemQuantity(
          eligibleItems
        );

      if (
        !eligibleItems.length
      ) {
        continue;
      }

      if (
        Number(
          offer.minQuantity
        ) > 0 &&
        eligibleQuantity <
          Number(
            offer.minQuantity
          )
      ) {
        continue;
      }

      if (
        Number(
          offer.minOrderValue
        ) > 0 &&
        subtotal <
          Number(
            offer.minOrderValue
          )
      ) {
        continue;
      }

      const calculated =
        calculateDiscountAmount({
          discountType:
            offer.discountType,

          discountValue:
            offer.discountValue,

          eligibleSubtotal,

          maxDiscountAmount:
            offer.maxDiscountAmount,
        });

      if (
        calculated.amount <= 0 &&
        !calculated.freeShipping
      ) {
        continue;
      }

      eligibleOffers.push({
        sourceType: "offer",

        sourceId:
          offer._id,

        name:
          offer.name,

        title:
          offer.title ||
          offer.name,

        arabicTitle:
          offer.arabicTitle ||
          "",

        code: "",

        discountType:
          offer.discountType,

        amount:
          calculated.amount,

        freeShipping:
          calculated.freeShipping,

        priority:
          Number(
            offer.priority
          ) || 0,

        allowStacking:
          Boolean(
            offer.allowStacking
          ),
      });
    }

    const stackable =
      eligibleOffers.filter(
        (offer) =>
          offer.allowStacking
      );

    const nonStackable =
      eligibleOffers.filter(
        (offer) =>
          !offer.allowStacking
      );

    const candidates = [];

    if (stackable.length) {
      candidates.push(
        stackable
      );
    }

    for (
      const offer of
      nonStackable
    ) {
      candidates.push(
        [offer]
      );
    }

    if (
      !candidates.length
    ) {
      return [];
    }

    candidates.sort(
      (a, b) => {
        const valueA =
          discountValueIncludingShipping(
            a,
            baseDeliveryFee
          );

        const valueB =
          discountValueIncludingShipping(
            b,
            baseDeliveryFee
          );

        if (
          valueB !== valueA
        ) {
          return (
            valueB - valueA
          );
        }

        const priorityA =
          a.reduce(
            (sum, item) =>
              sum +
              (Number(
                item.priority
              ) || 0),
            0
          );

        const priorityB =
          b.reduce(
            (sum, item) =>
              sum +
              (Number(
                item.priority
              ) || 0),
            0
          );

        return (
          priorityB -
          priorityA
        );
      }
    );

    return candidates[0];
  };

const getBundleEligibleItems = (
  bundle,
  items
) => {
  const allowedProductIds =
    (
      bundle.allowedProducts ||
      []
    ).map(toId);

  const allowedCategoryIds =
    (
      bundle.allowedCategories ||
      []
    ).map(toId);

  if (
    bundle.bundleType ===
    "any_products"
  ) {
    if (
      allowedProductIds.length
    ) {
      return items.filter(
        (item) =>
          allowedProductIds.includes(
            getItemProductId(
              item
            )
          )
      );
    }

    if (
      allowedCategoryIds.length
    ) {
      return items.filter(
        (item) =>
          itemMatchesCategories(item, allowedCategoryIds)
      );
    }

    return items;
  }

  if (
    bundle.bundleType ===
    "category_products"
  ) {
    return items.filter(
      (item) =>
        itemMatchesCategories(item, allowedCategoryIds)
    );
  }

  if (
    bundle.bundleType ===
    "specific_products"
  ) {
    const specificProductIds =
      (
        bundle.specificItems ||
        []
      ).map((item) =>
        toId(item.product)
      );

    return items.filter(
      (item) =>
        specificProductIds.includes(
          getItemProductId(
            item
          )
        )
    );
  }

  return [];
};

const getSpecificBundleRequirements = (bundle) => {
  const requirements = new Map();

  for (
    const specificItem of
    bundle.specificItems || []
  ) {
    const productId =
      toId(
        specificItem.product
      );

    if (!productId) {
      continue;
    }

    const quantity =
      Math.max(
        Number(
          specificItem.quantity
        ) || 1,
        1
      );

    requirements.set(
      productId,
      (requirements.get(productId) || 0) + quantity
    );
  }

  return requirements;
};

const getSpecificBundleApplications =
  (
    bundle,
    items
  ) => {
    const requirements =
      getSpecificBundleRequirements(
        bundle
      );

    if (!requirements.size) {
      return 0;
    }

    const applications =
      [...requirements.entries()].map(
        ([
          productId,
          requiredQuantity,
        ]) => {
          const cartQuantity =
            items
              .filter(
                (item) =>
                  isSameId(
                    getItemProductId(
                      item
                    ),
                    productId
                  )
              )
              .reduce(
                (
                  sum,
                  item
                ) =>
                  sum +
                  (Number(
                    item.quantity
                  ) || 0),
                0
              );

          return Math.floor(
            cartQuantity /
              requiredQuantity
          );
        }
      );

    return applications.length
      ? Math.min(
          ...applications
        )
      : 0;
  };

const getBundleBaseSubtotal = ({
  bundle,
  eligibleItems,
  applications,
}) => {
  if (
    bundle.bundleType ===
    "specific_products"
  ) {
    let subtotal = 0;
    const requirements =
      getSpecificBundleRequirements(
        bundle
      );

    for (
      const [
        productId,
        quantityPerApplication,
      ] of requirements.entries()
    ) {
      const requiredQuantity =
        quantityPerApplication *
        applications;
      const unitPrices = [];

      for (
        const item of
        eligibleItems
      ) {
        if (
          !isSameId(
            getItemProductId(
              item
            ),
            productId
          )
        ) {
          continue;
        }

        const quantity =
          Math.max(
            Number(
              item.quantity
            ) || 0,
            0
          );

        for (
          let index = 0;
          index < quantity;
          index += 1
        ) {
          unitPrices.push(
            Number(
              item.unitPrice
            ) || 0
          );
        }
      }

      unitPrices.sort(
        (a, b) => a - b
      );

      subtotal += unitPrices
        .slice(
          0,
          requiredQuantity
        )
        .reduce(
          (sum, price) =>
            sum + price,
          0
        );
    }

    return subtotal;
  }

  const requiredQuantity =
    Math.max(
      Number(
        bundle.requiredQuantity
      ) || 1,
      1
    ) * applications;

  const unitPrices = [];

  for (
    const item of
    eligibleItems
  ) {
    const quantity =
      Math.max(
        Number(
          item.quantity
        ) || 0,
        0
      );

    for (
      let index = 0;
      index < quantity;
      index += 1
    ) {
      unitPrices.push(
        Number(
          item.unitPrice
        ) || 0
      );
    }
  }

  unitPrices.sort(
    (a, b) => a - b
  );

  return unitPrices
    .slice(
      0,
      requiredQuantity
    )
    .reduce(
      (sum, price) =>
        sum + price,
      0
    );
};

const calculateBundleDiscount = ({
  bundle,
  eligibleItems,
  applications,
}) => {
  if (
    applications <= 0
  ) {
    return {
      amount: 0,
      freeShipping: false,
    };
  }

  const bundleSubtotal =
    getBundleBaseSubtotal({
      bundle,
      eligibleItems,
      applications,
    });

  if (
    bundle.discountType ===
    "free_shipping"
  ) {
    return {
      amount: 0,
      freeShipping: true,
    };
  }

  if (
    bundle.discountType ===
    "fixed_bundle_price"
  ) {
    // For this type, discountValue stores
    // the final price of one bundle.
    const bundlePrice =
      (Number(
        bundle.discountValue
      ) || 0) *
      applications;

    return {
      amount: capDiscount(
        bundleSubtotal -
          bundlePrice,
        0,
        bundleSubtotal
      ),

      freeShipping: false,
    };
  }

  if (
    bundle.discountType ===
    "percentage"
  ) {
    return {
      amount: capDiscount(
        bundleSubtotal *
          ((Number(
            bundle.discountValue
          ) || 0) /
            100),

        0,

        bundleSubtotal
      ),

      freeShipping: false,
    };
  }

  if (
    bundle.discountType ===
    "fixed"
  ) {
    return {
      amount: capDiscount(
        (Number(
          bundle.discountValue
        ) || 0) *
          applications,

        0,

        bundleSubtotal
      ),

      freeShipping: false,
    };
  }

  return {
    amount: 0,
    freeShipping: false,
  };
};

const calculateBundleDiscounts =
  async ({
    items,
    subtotal,
    baseDeliveryFee,
    session,
  }) => {
    const query =
      Bundle.find(
        activeWindowFilter()
      )
        .populate(
          "specificItems.product",
          "_id"
        )
        .sort({
          priority: -1,
          createdAt: -1,
        });

    const bundles =
      await withSession(
        query,
        session
      );

    const eligibleBundles =
      [];

    for (
      const bundle of bundles
    ) {
      if (
        Number(
          bundle.usageLimit
        ) > 0 &&
        Number(
          bundle.usedCount
        ) >=
          Number(
            bundle.usageLimit
          )
      ) {
        continue;
      }

      if (
        Number(
          bundle.minOrderValue
        ) > 0 &&
        subtotal <
          Number(
            bundle.minOrderValue
          )
      ) {
        continue;
      }

      const eligibleItems =
        getBundleEligibleItems(
          bundle,
          items
        );

      if (
        !eligibleItems.length
      ) {
        continue;
      }

      let applications = 0;

      if (
        bundle.bundleType ===
        "specific_products"
      ) {
        applications =
          getSpecificBundleApplications(
            bundle,
            eligibleItems
          );
      } else {
        const quantity =
          getItemQuantity(
            eligibleItems
          );

        const requiredQuantity =
          Math.max(
            Number(
              bundle.requiredQuantity
            ) || 1,
            1
          );

        applications =
          Math.floor(
            quantity /
              requiredQuantity
          );
      }

      if (
        Number(
          bundle.maxApplications
        ) > 0
      ) {
        applications =
          Math.min(
            applications,

            Number(
              bundle.maxApplications
            )
          );
      }

      if (
        applications <= 0
      ) {
        continue;
      }

      const calculated =
        calculateBundleDiscount({
          bundle,
          eligibleItems,
          applications,
        });

      if (
        calculated.amount <= 0 &&
        !calculated.freeShipping &&
        !bundle.freeDelivery
      ) {
        continue;
      }

      eligibleBundles.push({
        sourceType:
          "bundle",

        sourceId:
          bundle._id,

        name:
          bundle.name,

        title:
          bundle.name,

        code: "",

        discountType:
          bundle.discountType,

        amount:
          calculated.amount,

        freeShipping:
          calculated.freeShipping || Boolean(bundle.freeDelivery),

        priority:
          Number(
            bundle.priority
          ) || 0,

        applications,

        allowCouponStacking:
          Boolean(
            bundle.allowCouponStacking
          ),
      });
    }

    if (
      !eligibleBundles.length
    ) {
      return [];
    }

    eligibleBundles.sort(
      (a, b) => {
        const valueA =
          discountValueIncludingShipping(
            [a],
            baseDeliveryFee
          );

        const valueB =
          discountValueIncludingShipping(
            [b],
            baseDeliveryFee
          );

        if (
          valueB !== valueA
        ) {
          return (
            valueB - valueA
          );
        }

        return (
          b.priority -
          a.priority
        );
      }
    );

    return [
      eligibleBundles[0],
    ];
  };

const couponEligibleItems = (
  coupon,
  items
) => {
  let eligibleItems = [
    ...items,
  ];

  const allowedProductIds =
    (
      coupon.allowedProducts ||
      []
    ).map(toId);

  const excludedProductIds =
    (
      coupon.excludedProducts ||
      []
    ).map(toId);

  const allowedCategoryIds =
    (
      coupon.allowedCategories ||
      []
    ).map(toId);

  const excludedCategoryIds =
    (
      coupon.excludedCategories ||
      []
    ).map(toId);

  if (
    allowedProductIds.length
  ) {
    eligibleItems =
      eligibleItems.filter(
        (item) =>
          allowedProductIds.includes(
            getItemProductId(
              item
            )
          )
      );
  }

  if (
    allowedCategoryIds.length
  ) {
    eligibleItems =
      eligibleItems.filter(
        (item) =>
          itemMatchesCategories(item, allowedCategoryIds)
      );
  }

  if (
    excludedProductIds.length
  ) {
    eligibleItems =
      eligibleItems.filter(
        (item) =>
          !excludedProductIds.includes(
            getItemProductId(
              item
            )
          )
      );
  }

  if (
    excludedCategoryIds.length
  ) {
    eligibleItems =
      eligibleItems.filter(
        (item) =>
          !itemMatchesCategories(item, excludedCategoryIds)
      );
  }

  return eligibleItems;
};

const calculateCouponDiscount =
  async ({
    couponCode,
    items,
    subtotal,
    session,
  }) => {
    if (
      !couponCode?.trim()
    ) {
      return {
        discount: null,
        status: "empty",
        message: "",
      };
    }

    const cleanCode =
      couponCode
        .trim()
        .toUpperCase();

    const coupon =
      await withSession(
        Coupon.findOne({
          code: cleanCode,
        }),

        session
      );

    if (!coupon) {
      return {
        discount: null,
        status: "invalid",
        message:
          "Coupon code is invalid.",
      };
    }

    const now =
      new Date();

    if (
      !coupon.isActive
    ) {
      return {
        discount: null,
        status: "inactive",
        message:
          "Coupon is inactive.",
      };
    }

    if (
      coupon.startAt &&
      coupon.startAt > now
    ) {
      return {
        discount: null,
        status:
          "not_started",
        message:
          "Coupon is not active yet.",
      };
    }

    if (
      coupon.endAt &&
      coupon.endAt < now
    ) {
      return {
        discount: null,
        status: "expired",
        message:
          "Coupon has expired.",
      };
    }

    if (
      Number(
        coupon.usageLimit
      ) > 0 &&
      Number(
        coupon.usedCount
      ) >=
        Number(
          coupon.usageLimit
        )
    ) {
      return {
        discount: null,
        status:
          "usage_limit",
        message:
          "Coupon usage limit has been reached.",
      };
    }

    if (
      Number(
        coupon.minOrderValue
      ) > 0 &&
      subtotal <
        Number(
          coupon.minOrderValue
        )
    ) {
      return {
        discount: null,
        status: "min_order",

        message:
          `Minimum order value for this coupon is ${coupon.minOrderValue}.`,
      };
    }

    const eligibleItems =
      couponEligibleItems(
        coupon,
        items
      );

    const eligibleSubtotal =
      getItemSubtotal(
        eligibleItems
      );

    if (
      !eligibleItems.length ||
      eligibleSubtotal <= 0
    ) {
      return {
        discount: null,
        status:
          "not_applicable",
        message:
          "Coupon does not apply to these cart items.",
      };
    }

    const calculated =
      calculateDiscountAmount({
        discountType:
          coupon.discountType,

        discountValue:
          coupon.discountValue,

        eligibleSubtotal,

        maxDiscountAmount:
          coupon.maxDiscountAmount,
      });

    if (
      calculated.amount <= 0 &&
      !calculated.freeShipping
    ) {
      return {
        discount: null,
        status:
          "no_discount",

        message:
          "Coupon is valid but does not reduce this order.",
      };
    }

    return {
      discount: {
        sourceType:
          "coupon",

        sourceId:
          coupon._id,

        name:
          coupon.name ||
          coupon.code,

        title:
          coupon.name ||
          coupon.code,

        code:
          coupon.code,

        discountType:
          coupon.discountType,

        amount:
          calculated.amount,

        freeShipping:
          calculated.freeShipping,

        allowWithOffers:
          Boolean(
            coupon.allowWithOffers
          ),

        allowWithBundles:
          Boolean(
            coupon.allowWithBundles
          ),
      },

      status: "valid",

      message:
        "Coupon applied successfully.",
    };
  };

const serializeAppliedDiscount = (discount) => ({
  sourceType: discount.sourceType,
  sourceId: discount.sourceId,
  name: discount.name || discount.title || "",
  title: discount.title || discount.name || "",
  arabicTitle: discount.arabicTitle || "",
  code: discount.code || "",
  discountType: discount.discountType,
  amount: Number(discount.amount) || 0,
  freeShipping: Boolean(discount.freeShipping),
  applications: Number(discount.applications) || 0,
});

const calculateCartPricing =
  async ({
    items = [],
    couponCode = "",
    baseDeliveryFee = 0,
    session = null,
  }) => {
    const subtotal =
      getItemSubtotal(items);

    const offerDiscounts =
      await calculateOfferDiscounts({
        items,
        subtotal,
        baseDeliveryFee,
        session,
      });

    const bundleDiscounts =
      await calculateBundleDiscounts({
        items,
        subtotal,
        baseDeliveryFee,
        session,
      });

    const couponResult =
      await calculateCouponDiscount({
        couponCode,
        items,
        subtotal,
        session,
      });

    const automaticDiscounts =
      [
        ...offerDiscounts,
        ...bundleDiscounts,
      ];

    let selectedDiscounts =
      automaticDiscounts;

    let couponStatus =
      couponResult.status;

    let couponMessage =
      couponResult.message;

    if (
      couponResult.discount
    ) {
      const coupon =
        couponResult.discount;

      const compatibleOffers =
        offerDiscounts.filter(
          () =>
            coupon.allowWithOffers
        );

      const compatibleBundles =
        bundleDiscounts.filter(
          (bundle) =>
            coupon.allowWithBundles &&
            bundle.allowCouponStacking
        );

      const compatibleAutomatic =
        [
          ...compatibleOffers,
          ...compatibleBundles,
        ];

      const hasConflict =
        compatibleAutomatic.length !==
        automaticDiscounts.length;

      if (!hasConflict) {
        selectedDiscounts = [
          ...automaticDiscounts,
          coupon,
        ];
      } else {
        const automaticValue =
          discountValueIncludingShipping(
            automaticDiscounts,
            baseDeliveryFee
          );

        const couponCombination =
          [
            ...compatibleAutomatic,
            coupon,
          ];

        const couponValue =
          discountValueIncludingShipping(
            couponCombination,
            baseDeliveryFee
          );

        if (
          couponValue >
          automaticValue
        ) {
          selectedDiscounts =
            couponCombination;

          couponMessage =
            "Coupon applied with the compatible automatic discounts.";
        } else {
          selectedDiscounts =
            automaticDiscounts;

          couponStatus =
            "not_stackable";

          couponMessage =
            "Coupon is valid, but the automatic discount is better and cannot be combined with it.";
        }
      }
    }

    // Launch rule: a cart receives one promotional benefit only.
    const singleBenefitPool = couponResult.discount
      ? [couponResult.discount]
      : automaticDiscounts;
    selectedDiscounts = singleBenefitPool
      .slice()
      .sort((a, b) => discountValueIncludingShipping([b], baseDeliveryFee) - discountValueIncludingShipping([a], baseDeliveryFee))
      .slice(0, 1);
    if (couponResult.discount) {
      couponStatus = "valid";
      couponMessage = "Coupon selected as this order's single promotional benefit.";
    }

    const discountTotal =
      selectedDiscounts.reduce(
        (sum, discount) =>
          sum +
          (Number(
            discount.amount
          ) || 0),
        0
      );

    const freeShipping =
      selectedDiscounts.some(
        (discount) =>
          discount.freeShipping
      );

    const deliveryFee =
      freeShipping
        ? 0
        : Number(
            baseDeliveryFee
          ) || 0;

    const totals =
      calculateOrderTotals({
        subtotal,
        discountTotal,
        deliveryFee,
      });

    return {
      ...totals,

      baseDeliveryFee:
        Number(
          baseDeliveryFee
        ) || 0,

      freeShipping,

      discounts: selectedDiscounts.map(serializeAppliedDiscount),

      coupon: {
        code:
          couponCode
            ?.trim()
            .toUpperCase() ||
          "",

        status:
          couponStatus,

        message:
          couponMessage,
      },
    };
  };

const uniqueIds = (
  discounts,
  sourceType
) => [
  ...new Set(
    discounts
      .filter(
        (discount) =>
          discount.sourceType ===
            sourceType &&
          discount.sourceId
      )
      .map((discount) =>
        String(
          discount.sourceId
        )
      )
  ),
];

const incrementDiscountUsage =
  async ({
    discounts = [],
    session = null,
  }) => {
    const couponIds =
      uniqueIds(
        discounts,
        "coupon"
      );

    const offerIds =
      uniqueIds(
        discounts,
        "offer"
      );

    const bundleIds =
      uniqueIds(
        discounts,
        "bundle"
      );

    const options =
      session
        ? { session }
        : {};

    const updates = [];

    if (couponIds.length) {
      updates.push(
        Coupon.updateMany(
          {
            _id: {
              $in: couponIds,
            },
          },

          {
            $inc: {
              usedCount: 1,
            },
          },

          options
        )
      );
    }

    if (offerIds.length) {
      updates.push(
        Offer.updateMany(
          {
            _id: {
              $in: offerIds,
            },
          },

          {
            $inc: {
              usedCount: 1,
            },
          },

          options
        )
      );
    }

    if (bundleIds.length) {
      updates.push(
        Bundle.updateMany(
          {
            _id: {
              $in: bundleIds,
            },
          },

          {
            $inc: {
              usedCount: 1,
            },
          },

          options
        )
      );
    }

    await Promise.all(
      updates
    );
  };

const decrementDiscountUsage =
  async ({
    discounts = [],
    session = null,
  }) => {
    const couponIds =
      uniqueIds(
        discounts,
        "coupon"
      );

    const offerIds =
      uniqueIds(
        discounts,
        "offer"
      );

    const bundleIds =
      uniqueIds(
        discounts,
        "bundle"
      );

    const options =
      session
        ? { session }
        : {};

    const updates = [];

    if (couponIds.length) {
      updates.push(
        Coupon.updateMany(
          {
            _id: {
              $in: couponIds,
            },

            usedCount: {
              $gt: 0,
            },
          },

          {
            $inc: {
              usedCount: -1,
            },
          },

          options
        )
      );
    }

    if (offerIds.length) {
      updates.push(
        Offer.updateMany(
          {
            _id: {
              $in: offerIds,
            },

            usedCount: {
              $gt: 0,
            },
          },

          {
            $inc: {
              usedCount: -1,
            },
          },

          options
        )
      );
    }

    if (bundleIds.length) {
      updates.push(
        Bundle.updateMany(
          {
            _id: {
              $in: bundleIds,
            },

            usedCount: {
              $gt: 0,
            },
          },

          {
            $inc: {
              usedCount: -1,
            },
          },

          options
        )
      );
    }

    await Promise.all(
      updates
    );
  };

module.exports = {
  calculateOrderTotals,
  calculateBundleDiscount,
  serializeAppliedDiscount,
  calculateCartPricing,
  incrementDiscountUsage,
  decrementDiscountUsage,
};
