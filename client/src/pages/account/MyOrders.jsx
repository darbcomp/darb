import {
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  useQuery,
} from "@tanstack/react-query";

import {
  CalendarDays,
  Check,
  ChevronDown,
  CreditCard,
  MapPin,
  Package,
  ShoppingBag,
  Truck,
} from "lucide-react";

import {
  getMyOrders,
} from "../../api/orderApi";

import {
  formatCurrency,
} from "../../utils/formatCurrency";

/* =========================
   ORDER STATUS
========================== */

const orderStatusConfig = {
  pending: {
    label: "Pending",
    classes:
      "border-amber-200 bg-amber-50 text-amber-700",
  },

  confirmed: {
    label: "Confirmed",
    classes:
      "border-blue-200 bg-blue-50 text-blue-700",
  },

  processing: {
    label: "Processing",
    classes:
      "border-violet-200 bg-violet-50 text-violet-700",
  },

  shipped: {
    label: "Shipped",
    classes:
      "border-indigo-200 bg-indigo-50 text-indigo-700",
  },

  delivered: {
    label: "Delivered",
    classes:
      "border-green-200 bg-green-50 text-green-700",
  },

  cancelled: {
    label: "Cancelled",
    classes:
      "border-red-200 bg-red-50 text-red-700",
  },
};

/* =========================
   PAYMENT STATUS
========================== */

const paymentStatusConfig = {
  pending: {
    label: "Payment Pending",
    classes:
      "border-amber-200 bg-amber-50 text-amber-700",
  },

  paid: {
    label: "Paid",
    classes:
      "border-green-200 bg-green-50 text-green-700",
  },

  failed: {
    label: "Payment Failed",
    classes:
      "border-red-200 bg-red-50 text-red-700",
  },

  refunded: {
    label: "Refunded",
    classes:
      "border-gray-200 bg-gray-50 text-gray-700",
  },
};

/* =========================
   PAYMENT METHODS
========================== */

const paymentMethodLabels = {
  cash_on_delivery:
    "Cash on Delivery",

  instapay:
    "InstaPay",

  vodafone_cash:
    "Vodafone Cash",

  paymob_card:
    "Card Payment",
};

/* =========================
   ORDER PROGRESS
========================== */

const orderProgress = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
];

/* =========================
   FORMAT DATE
========================== */

const formatDate = (
  date
) => {
  if (!date) {
    return "—";
  }

  const parsedDate =
    new Date(date);

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-EG",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  ).format(
    parsedDate
  );
};

/* =========================
   BUILD ADDRESS
========================== */

const buildAddress = (
  address
) => {
  if (!address) {
    return [];
  }

  const buildingDetails = [
    address.building
      ? `Building ${address.building}`
      : "",

    address.floor
      ? `Floor ${address.floor}`
      : "",

    address.apartment
      ? `Apartment ${address.apartment}`
      : "",
  ].filter(Boolean);

  return [
    address.street || "",

    buildingDetails.join(
      ", "
    ),

    [
      address.city,
      address.governorate,
    ]
      .filter(Boolean)
      .join(", "),
  ].filter(Boolean);
};

/* =========================
   MY ORDERS
========================== */

function MyOrders() {
  const [
    expandedOrderId,
    setExpandedOrderId,
  ] = useState(null);

  const ordersQuery =
    useQuery({
      queryKey: [
        "my-orders",
      ],

      queryFn:
        getMyOrders,

      retry: 1,
    });

  const orders =
    ordersQuery.data
      ?.data || [];

  /* =========================
     TOGGLE DETAILS
  ========================== */

  const toggleOrder = (
    orderId
  ) => {
    setExpandedOrderId(
      (current) =>
        current === orderId
          ? null
          : orderId
    );
  };

  return (
    <main className="min-h-[70vh] bg-darb-cream">
      {/* =========================
          HEADING
      ========================== */}

      <section className="border-b border-darb-gold/20">
        <div className="mx-auto max-w-7xl px-5 py-9 sm:px-6 sm:py-11 lg:px-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-darb-gold">
            My Darb Journeys
          </p>

          <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="font-display text-4xl text-darb-green sm:text-5xl">
                My Orders
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-darb-muted">
                Follow each order
                from the moment it
                begins until it
                reaches your door.
              </p>
            </div>

            {!ordersQuery.isLoading &&
              !ordersQuery.isError &&
              orders.length >
                0 && (
                <p className="text-sm text-darb-muted">
                  {
                    orders.length
                  }{" "}
                  {orders.length ===
                  1
                    ? "order"
                    : "orders"}
                </p>
              )}
          </div>
        </div>
      </section>

      {/* =========================
          CONTENT
      ========================== */}

      <section className="mx-auto max-w-5xl px-5 py-9 sm:px-6 sm:py-12 lg:px-8">
        {/* =========================
            LOADING
        ========================== */}

        {ordersQuery.isLoading && (
          <div className="space-y-5">
            {Array.from({
              length: 3,
            }).map(
              (_, index) => (
                <div
                  key={index}
                  className="h-56 animate-pulse rounded-[1.75rem] bg-white"
                />
              )
            )}
          </div>
        )}

        {/* =========================
            ERROR
        ========================== */}

        {ordersQuery.isError && (
          <div className="rounded-[1.75rem] border border-red-200 bg-red-50 p-7 sm:p-9">
            <h2 className="font-display text-3xl text-red-700">
              Could not load
              your orders.
            </h2>

            <p className="mt-3 text-sm leading-7 text-red-700">
              {ordersQuery.error
                ?.friendlyMessage ||
                "Orders are unavailable right now."}
            </p>

            <button
              type="button"
              onClick={() =>
                ordersQuery.refetch()
              }
              className="mt-6 rounded-full border border-red-300 px-6 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100"
            >
              Try Again
            </button>
          </div>
        )}

        {/* =========================
            EMPTY
        ========================== */}

        {!ordersQuery.isLoading &&
          !ordersQuery.isError &&
          orders.length ===
            0 && (
            <div className="mx-auto max-w-2xl py-10 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-darb-gold/25 bg-white text-darb-green shadow-soft">
                <ShoppingBag
                  size={25}
                  strokeWidth={
                    1.5
                  }
                />
              </div>

              <p className="mt-7 text-[10px] font-semibold uppercase tracking-[0.3em] text-darb-gold">
                Your Journey
              </p>

              <h2 className="mt-3 font-display text-4xl text-darb-green">
                No orders yet.
              </h2>

              <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-darb-muted">
                Your Darb order
                history will appear
                here after your
                first purchase.
              </p>

              <Link
                to="/shop"
                className="mt-8 inline-flex rounded-full bg-darb-green px-8 py-3.5 text-sm font-semibold text-darb-beige transition hover:bg-darb-black"
              >
                Explore Darb
              </Link>
            </div>
          )}

        {/* =========================
            ORDERS
        ========================== */}

        {!ordersQuery.isLoading &&
          !ordersQuery.isError &&
          orders.length >
            0 && (
            <div className="space-y-5">
              {orders.map(
                (order) => {
                  const isExpanded =
                    expandedOrderId ===
                    order._id;

                  const items =
                    Array.isArray(
                      order.items
                    )
                      ? order.items
                      : [];

                  const previewItems =
                    items.slice(
                      0,
                      3
                    );

                  const remainingItemsCount =
                    Math.max(
                      items.length -
                        previewItems.length,
                      0
                    );

                  const totalQuantity =
                    items.reduce(
                      (
                        total,
                        item
                      ) =>
                        total +
                        (Number(
                          item.quantity
                        ) ||
                          0),
                      0
                    );

                  const orderStatus =
                    orderStatusConfig[
                      order.orderStatus
                    ] ||
                    {
                      label:
                        order.orderStatus ||
                        "Pending",

                      classes:
                        "border-gray-200 bg-gray-50 text-gray-700",
                    };

                  const paymentStatus =
                    paymentStatusConfig[
                      order.paymentStatus
                    ] ||
                    {
                      label:
                        order.paymentStatus ||
                        "Pending",

                      classes:
                        "border-gray-200 bg-gray-50 text-gray-700",
                    };

                  const paymentMethod =
                    paymentMethodLabels[
                      order.paymentMethod
                    ] ||
                    order.paymentMethod ||
                    "—";

                  const addressLines =
                    buildAddress(
                      order.shippingAddress
                    );

                  const discountTotal =
                    Number(
                      order.discountTotal
                    ) || 0;

                  const deliveryFee =
                    Number(
                      order.deliveryFee
                    ) || 0;

                  return (
                    <article
                      key={
                        order._id
                      }
                      className="overflow-hidden rounded-[1.75rem] border border-darb-gold/20 bg-white shadow-soft"
                    >
                      {/* =========================
                          CARD HEADER
                      ========================== */}

                      <div className="p-5 sm:p-7">
                        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                          {/* Order number */}

                          <div className="flex items-start gap-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-darb-green text-darb-beige">
                              <Package
                                size={
                                  19
                                }
                              />
                            </div>

                            <div>
                              <p className="text-[9px] font-semibold uppercase tracking-[0.23em] text-darb-gold">
                                Order
                              </p>

                              <h2 className="mt-1 font-display text-2xl text-darb-green sm:text-3xl">
                                {order.orderNumber ||
                                  "Darb Order"}
                              </h2>

                              <div className="mt-2 flex items-center gap-2 text-xs text-darb-muted">
                                <CalendarDays
                                  size={
                                    13
                                  }
                                />

                                {formatDate(
                                  order.createdAt
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Status */}

                          <div className="flex flex-wrap gap-2">
                            <StatusBadge
                              label={
                                orderStatus.label
                              }
                              classes={
                                orderStatus.classes
                              }
                            />

                            <StatusBadge
                              label={
                                paymentStatus.label
                              }
                              classes={
                                paymentStatus.classes
                              }
                            />
                          </div>
                        </div>

                        {/* =========================
                            PROGRESS
                        ========================== */}

                        {order.orderStatus !==
                          "cancelled" && (
                          <OrderProgress
                            status={
                              order.orderStatus
                            }
                          />
                        )}

                        {order.orderStatus ===
                          "cancelled" && (
                          <div className="mt-6 rounded-[1.1rem] border border-red-100 bg-red-50 px-4 py-3 text-xs leading-6 text-red-700">
                            This order was
                            cancelled.
                          </div>
                        )}

                        {/* =========================
                            PRODUCT PREVIEW
                        ========================== */}

                        <div className="mt-6 border-t border-darb-gold/15 pt-5">
                          <div className="space-y-3">
                            {previewItems.map(
                              (
                                item,
                                index
                              ) => {
                                const snapshot =
                                  item.productSnapshot ||
                                  {};

                                return (
                                  <div
                                    key={`${order._id}-${snapshot.slug || index}`}
                                    className="flex items-center gap-4"
                                  >
                                    {/* Image */}

                                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[1rem] bg-darb-green">
                                      {snapshot.image ? (
                                        <img
                                          src={
                                            snapshot.image
                                          }
                                          alt={
                                            snapshot.name ||
                                            "Darb fragrance"
                                          }
                                          className="h-full w-full object-cover"
                                        />
                                      ) : (
                                        <span className="font-display text-xs text-darb-gold">
                                          Darb
                                        </span>
                                      )}
                                    </div>

                                    {/* Product */}

                                    <div className="min-w-0 flex-1">
                                      <p className="truncate font-semibold text-darb-green">
                                        {snapshot.name ||
                                          "Darb Fragrance"}
                                      </p>

                                      <p className="mt-1 text-xs text-darb-muted">
                                        Qty:{" "}
                                        {item.quantity}

                                        {snapshot.sizeLabel
                                          ? ` • ${snapshot.sizeLabel}`
                                          : ""}
                                      </p>
                                    </div>

                                    <p className="shrink-0 text-sm font-semibold text-darb-black">
                                      {formatCurrency(
                                        Number(
                                          item.lineTotal
                                        ) || 0
                                      )}
                                    </p>
                                  </div>
                                );
                              }
                            )}

                            {remainingItemsCount >
                              0 && (
                              <p className="pl-20 text-xs font-semibold text-darb-muted">
                                +{" "}
                                {
                                  remainingItemsCount
                                }{" "}
                                more{" "}
                                {remainingItemsCount ===
                                1
                                  ? "fragrance"
                                  : "fragrances"}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* =========================
                            SUMMARY FOOTER
                        ========================== */}

                        <div className="mt-6 flex flex-col gap-5 border-t border-darb-gold/15 pt-5 sm:flex-row sm:items-end sm:justify-between">
                          <div>
                            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-darb-muted">
                              Order Total
                            </p>

                            <p className="mt-1 font-display text-3xl text-darb-green">
                              {formatCurrency(
                                Number(
                                  order.total
                                ) || 0
                              )}
                            </p>

                            <p className="mt-1 text-xs text-darb-muted">
                              {totalQuantity}{" "}
                              {totalQuantity ===
                              1
                                ? "item"
                                : "items"}{" "}
                              •{" "}
                              {
                                paymentMethod
                              }
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              toggleOrder(
                                order._id
                              )
                            }
                            aria-expanded={
                              isExpanded
                            }
                            className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-full border border-darb-gold/35 px-6 text-sm font-semibold text-darb-green transition hover:border-darb-green hover:bg-darb-green hover:text-darb-beige"
                          >
                            {isExpanded
                              ? "Hide Order Details"
                              : "View Order Details"}

                            <ChevronDown
                              size={
                                17
                              }
                              className={`transition-transform duration-200 ${
                                isExpanded
                                  ? "rotate-180"
                                  : ""
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      {/* =========================
                          EXPANDED DETAILS
                      ========================== */}

                      {isExpanded && (
                        <div className="border-t border-darb-gold/20 bg-darb-cream/50 px-5 py-6 sm:px-7 sm:py-8">
                          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
                            {/* =========================
                                ALL ITEMS
                            ========================== */}

                            <div>
                              <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-darb-gold">
                                Complete Order
                              </p>

                              <h3 className="mt-2 font-display text-3xl text-darb-green">
                                Fragrances
                              </h3>

                              <div className="mt-5 divide-y divide-darb-gold/15 border-y border-darb-gold/15">
                                {items.map(
                                  (
                                    item,
                                    index
                                  ) => {
                                    const snapshot =
                                      item.productSnapshot ||
                                      {};

                                    return (
                                      <div
                                        key={`${order._id}-full-${snapshot.slug || index}`}
                                        className="flex gap-4 py-4"
                                      >
                                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[1rem] bg-darb-green">
                                          {snapshot.image ? (
                                            <img
                                              src={
                                                snapshot.image
                                              }
                                              alt={
                                                snapshot.name ||
                                                "Darb fragrance"
                                              }
                                              className="h-full w-full object-cover"
                                            />
                                          ) : (
                                            <div className="flex h-full items-center justify-center">
                                              <span className="font-display text-xs text-darb-gold">
                                                Darb
                                              </span>
                                            </div>
                                          )}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                          {snapshot.categoryName && (
                                            <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-darb-gold">
                                              {
                                                snapshot.categoryName
                                              }
                                            </p>
                                          )}

                                          <p className="mt-1 font-semibold text-darb-green">
                                            {snapshot.name ||
                                              "Darb Fragrance"}
                                          </p>

                                          <p className="mt-1 text-xs text-darb-muted">
                                            Qty:{" "}
                                            {
                                              item.quantity
                                            }

                                            {snapshot.sizeLabel
                                              ? ` • ${snapshot.sizeLabel}`
                                              : ""}
                                          </p>
                                        </div>

                                        <p className="shrink-0 text-sm font-semibold text-darb-black">
                                          {formatCurrency(
                                            Number(
                                              item.lineTotal
                                            ) ||
                                              Number(
                                                item.unitPrice
                                              ) *
                                                Number(
                                                  item.quantity
                                                )
                                          )}
                                        </p>
                                      </div>
                                    );
                                  }
                                )}
                              </div>
                            </div>

                            {/* =========================
                                ORDER INFO
                            ========================== */}

                            <div className="space-y-4">
                              {/* Delivery */}

                              <DetailCard
                                icon={
                                  <MapPin
                                    size={
                                      17
                                    }
                                  />
                                }
                                title="Delivery Address"
                              >
                                {addressLines.length >
                                0 ? (
                                  <div className="space-y-1">
                                    {addressLines.map(
                                      (
                                        line,
                                        index
                                      ) => (
                                        <p
                                          key={`${line}-${index}`}
                                        >
                                          {
                                            line
                                          }
                                        </p>
                                      )
                                    )}
                                  </div>
                                ) : (
                                  <p>
                                    Address
                                    unavailable
                                  </p>
                                )}
                              </DetailCard>

                              {/* Payment */}

                              <DetailCard
                                icon={
                                  <CreditCard
                                    size={
                                      17
                                    }
                                  />
                                }
                                title="Payment"
                              >
                                <p className="font-semibold text-darb-green">
                                  {
                                    paymentMethod
                                  }
                                </p>

                                <p className="mt-1 capitalize">
                                  Status:{" "}
                                  {
                                    paymentStatus.label
                                  }
                                </p>
                              </DetailCard>

                              {/* Delivery state */}

                              <DetailCard
                                icon={
                                  <Truck
                                    size={
                                      17
                                    }
                                  />
                                }
                                title="Order Status"
                              >
                                <p className="font-semibold text-darb-green">
                                  {
                                    orderStatus.label
                                  }
                                </p>
                              </DetailCard>
                            </div>
                          </div>

                          {/* =========================
                              PRICE BREAKDOWN
                          ========================== */}

                          <div className="mt-8 rounded-[1.5rem] border border-darb-gold/20 bg-white p-5 sm:p-6">
                            <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-darb-gold">
                              Payment Summary
                            </p>

                            <div className="mt-5 space-y-3 text-sm">
                              <PriceRow
                                label="Subtotal"
                                value={formatCurrency(
                                  Number(
                                    order.subtotal
                                  ) ||
                                    0
                                )}
                              />

                              {discountTotal >
                                0 && (
                                <PriceRow
                                  label="Discounts"
                                  value={`-${formatCurrency(
                                    discountTotal
                                  )}`}
                                  saving
                                />
                              )}

                              <PriceRow
                                label="Delivery"
                                value={
                                  deliveryFee >
                                  0
                                    ? formatCurrency(
                                        deliveryFee
                                      )
                                    : "Free"
                                }
                              />
                            </div>

                            <div className="mt-5 border-t border-darb-gold/20 pt-5">
                              <div className="flex items-end justify-between gap-5">
                                <span className="font-semibold text-darb-green">
                                  Total
                                </span>

                                <span className="font-display text-3xl text-darb-green">
                                  {formatCurrency(
                                    Number(
                                      order.total
                                    ) ||
                                      0
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                }
              )}
            </div>
          )}

        {/* =========================
            CONTINUE SHOPPING
        ========================== */}

        {!ordersQuery.isLoading &&
          !ordersQuery.isError &&
          orders.length >
            0 && (
            <div className="mt-10 text-center">
              <Link
                to="/shop"
                className="text-sm font-semibold text-darb-green underline decoration-darb-gold underline-offset-4 transition hover:text-darb-gold"
              >
                Continue Shopping
              </Link>
            </div>
          )}
      </section>
    </main>
  );
}

/* =========================
   STATUS BADGE
========================== */

function StatusBadge({
  label,
  classes,
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] ${classes}`}
    >
      {label}
    </span>
  );
}

/* =========================
   ORDER PROGRESS
========================== */

function OrderProgress({
  status,
}) {
  const currentIndex =
    orderProgress.indexOf(
      status
    );

  const safeIndex =
    currentIndex >= 0
      ? currentIndex
      : 0;

  const progressPercent =
    safeIndex === 0
      ? 0
      : (safeIndex /
          (orderProgress.length -
            1)) *
        100;

  return (
    <div className="mt-6">
      <div className="relative">
        <div className="absolute left-[10px] right-[10px] top-[10px] h-px bg-darb-gold/25" />

        <div
          className="absolute left-[10px] top-[10px] h-px bg-darb-green transition-all duration-500"
          style={{
            width: `calc((100% - 20px) * ${
              progressPercent /
              100
            })`,
          }}
        />

        <div className="relative flex justify-between">
          {orderProgress.map(
            (
              step,
              index
            ) => {
              const complete =
                index <=
                safeIndex;

              return (
                <div
                  key={
                    step
                  }
                  className="flex flex-col items-center"
                >
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-full border transition ${
                      complete
                        ? "border-darb-green bg-darb-green text-darb-beige"
                        : "border-darb-gold/40 bg-white text-transparent"
                    }`}
                  >
                    {index <
                      safeIndex && (
                      <Check
                        size={
                          10
                        }
                        strokeWidth={
                          3
                        }
                      />
                    )}
                  </div>

                  <span
                    className={`mt-2 hidden text-[8px] font-semibold uppercase tracking-[0.08em] sm:block ${
                      complete
                        ? "text-darb-green"
                        : "text-darb-muted"
                    }`}
                  >
                    {step}
                  </span>
                </div>
              );
            }
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================
   DETAIL CARD
========================== */

function DetailCard({
  icon,
  title,
  children,
}) {
  return (
    <div className="rounded-[1.3rem] border border-darb-gold/20 bg-white p-5">
      <div className="flex items-center gap-2 text-darb-gold">
        {icon}

        <p className="text-[9px] font-semibold uppercase tracking-[0.18em]">
          {title}
        </p>
      </div>

      <div className="mt-3 text-xs leading-6 text-darb-muted">
        {children}
      </div>
    </div>
  );
}

/* =========================
   PRICE ROW
========================== */

function PriceRow({
  label,
  value,
  saving = false,
}) {
  return (
    <div className="flex items-center justify-between gap-5">
      <span className="text-darb-muted">
        {label}
      </span>

      <span
        className={`font-semibold ${
          saving
            ? "text-darb-green"
            : "text-darb-black"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export default MyOrders;