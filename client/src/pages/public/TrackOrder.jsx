import { useState } from "react";

import {
  Link,
  Navigate,
} from "react-router-dom";

import {
  useMutation,
} from "@tanstack/react-query";

import {
  Check,
  CheckCircle2,
  Clock3,
  Package,
  PackageCheck,
  PackageSearch,
  RotateCcw,
  Truck,
  XCircle,
} from "lucide-react";

import {
  trackOrder,
} from "../../api/trackOrderApi";

import {
  useAuth,
} from "../../context/AuthContext";

const progressStatuses = [
  {
    key: "pending",
    label: "Order Placed",
    icon: PackageSearch,
  },
  {
    key: "confirmed",
    label: "Confirmed",
    icon: CheckCircle2,
  },
  {
    key: "processing",
    label: "Preparing",
    icon: Package,
  },
  {
    key: "shipped",
    label: "On the Way",
    icon: Truck,
  },
  {
    key: "delivered",
    label: "Delivered",
    icon: PackageCheck,
  },
];

const statusIndex = {
  pending: 0,
  confirmed: 1,
  processing: 2,
  shipped: 3,
  delivered: 4,
};

const statusLabels = {
  pending: "Order Placed",
  confirmed: "Confirmed",
  processing: "Preparing",
  shipped: "On the Way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const paymentLabels = {
  pending: "Pending",
  paid: "Paid",
  failed: "Failed",
  refunded: "Refunded",
};

const formatCurrency = (
  value
) =>
  new Intl.NumberFormat(
    "en-EG",
    {
      style: "currency",
      currency: "EGP",
      maximumFractionDigits: 0,
    }
  ).format(Number(value) || 0);

const formatDate = (
  value,
  withTime = false
) => {
  if (!value) return "—";

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return date.toLocaleString(
    "en-EG",
    withTime
      ? {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }
      : {
          day: "numeric",
          month: "short",
          year: "numeric",
        }
  );
};

function StatusProgress({
  order,
}) {
  const currentStatus =
    order.orderStatus;

  const currentIndex =
    statusIndex[
      currentStatus
    ] ?? -1;

  if (
    currentStatus ===
    "cancelled"
  ) {
    return (
      <div className="rounded-[1.5rem] border border-red-200 bg-red-50 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
            <XCircle
              size={20}
            />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-500">
              Order Status
            </p>

            <p className="mt-1 font-display text-2xl text-red-700">
              Cancelled
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Desktop */}
      <div className="hidden md:flex">
        {progressStatuses.map(
          (
            status,
            index
          ) => {
            const Icon =
              status.icon;

            const completed =
              index <
              currentIndex;

            const active =
              index ===
              currentIndex;

            return (
              <div
                key={
                  status.key
                }
                className="flex flex-1 items-center last:flex-none"
              >
                <div className="flex flex-col items-center">
                  <div
                    className={`
                      flex h-11 w-11
                      items-center
                      justify-center
                      rounded-full
                      border
                      transition
                      ${
                        completed ||
                        active
                          ? "border-darb-green bg-darb-green text-darb-beige"
                          : "border-darb-gold/30 bg-white text-darb-muted"
                      }
                    `}
                  >
                    {completed ? (
                      <Check
                        size={
                          18
                        }
                      />
                    ) : (
                      <Icon
                        size={
                          18
                        }
                        strokeWidth={
                          1.7
                        }
                      />
                    )}
                  </div>

                  <p
                    className={`
                      mt-3
                      whitespace-nowrap
                      text-[10px]
                      font-semibold
                      uppercase
                      tracking-[0.12em]
                      ${
                        completed ||
                        active
                          ? "text-darb-green"
                          : "text-darb-muted"
                      }
                    `}
                  >
                    {
                      status.label
                    }
                  </p>
                </div>

                {index <
                  progressStatuses.length -
                    1 && (
                  <div
                    className={`
                      mx-3
                      mb-6
                      h-px
                      flex-1
                      ${
                        index <
                        currentIndex
                          ? "bg-darb-green"
                          : "bg-darb-gold/25"
                      }
                    `}
                  />
                )}
              </div>
            );
          }
        )}
      </div>

      {/* Mobile */}
      <div className="space-y-0 md:hidden">
        {progressStatuses.map(
          (
            status,
            index
          ) => {
            const Icon =
              status.icon;

            const completed =
              index <
              currentIndex;

            const active =
              index ===
              currentIndex;

            return (
              <div
                key={
                  status.key
                }
                className="flex gap-4"
              >
                <div className="flex flex-col items-center">
                  <div
                    className={`
                      flex h-10 w-10
                      shrink-0
                      items-center
                      justify-center
                      rounded-full
                      border
                      ${
                        completed ||
                        active
                          ? "border-darb-green bg-darb-green text-darb-beige"
                          : "border-darb-gold/30 bg-white text-darb-muted"
                      }
                    `}
                  >
                    {completed ? (
                      <Check
                        size={
                          17
                        }
                      />
                    ) : (
                      <Icon
                        size={
                          17
                        }
                      />
                    )}
                  </div>

                  {index <
                    progressStatuses.length -
                      1 && (
                    <div
                      className={`
                        min-h-9
                        w-px
                        flex-1
                        ${
                          index <
                          currentIndex
                            ? "bg-darb-green"
                            : "bg-darb-gold/25"
                        }
                      `}
                    />
                  )}
                </div>

                <div className="pb-7 pt-2">
                  <p
                    className={`
                      text-sm
                      font-semibold
                      ${
                        completed ||
                        active
                          ? "text-darb-green"
                          : "text-darb-muted"
                      }
                    `}
                  >
                    {
                      status.label
                    }
                  </p>

                  {active && (
                    <p className="mt-1 text-xs text-darb-muted">
                      Current
                      status
                    </p>
                  )}
                </div>
              </div>
            );
          }
        )}
      </div>
    </div>
  );
}

function TrackOrder() {
  const {
    user,
    isAuthenticated,
  } = useAuth();

  const [
    form,
    setForm,
  ] = useState({
    orderNumber: "",
    phone: "",
  });

  const [
    validationError,
    setValidationError,
  ] = useState("");

  const trackingMutation =
    useMutation({
      mutationFn:
        trackOrder,
    });

  /*
    Logged-in customers use
    My Orders instead.

    Admins use Admin Orders.
  */
  if (isAuthenticated) {
    return (
      <Navigate
        replace
        to={
          user?.role ===
          "admin"
            ? "/admin/orders"
            : "/account/orders"
        }
      />
    );
  }

  const order =
    trackingMutation
      .data?.data;

  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setForm(
      (current) => ({
        ...current,
        [name]:
          name ===
          "orderNumber"
            ? value.toUpperCase()
            : value,
      })
    );

    setValidationError("");

    if (
      trackingMutation.isError
    ) {
      trackingMutation.reset();
    }
  };

  const handleSubmit = (
    event
  ) => {
    event.preventDefault();

    const orderNumber =
      form.orderNumber.trim();

    const phone =
      form.phone.trim();

    if (
      !orderNumber ||
      !phone
    ) {
      setValidationError(
        "Enter both your order number and phone number."
      );

      return;
    }

    setValidationError("");

    trackingMutation.mutate({
      orderNumber,
      phone,
    });
  };

  const resetTracking = () => {
    trackingMutation.reset();

    setForm({
      orderNumber: "",
      phone: "",
    });

    setValidationError("");
  };

  return (
    <main className="bg-darb-cream">
      {/* =========================
          HERO
      ========================== */}

      <section className="bg-darb-green text-darb-beige">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-6 sm:py-18 lg:px-8 lg:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.34em] text-darb-gold">
            Your Order
          </p>

          <h1 className="mt-4 max-w-3xl font-display text-5xl leading-[1.02] sm:text-6xl">
            Follow its path.
          </h1>

          <p className="mt-5 max-w-2xl text-sm leading-7 text-darb-beige/65 sm:text-base">
            Enter your Darb
            order number and
            the phone number
            used when placing
            the order.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        {!order ? (
          <div className="overflow-hidden rounded-[2rem] border border-darb-gold/20 bg-white shadow-soft">
            <div className="grid lg:grid-cols-[0.8fr_1.2fr]">
              {/* Intro */}

              <div className="bg-darb-green p-7 text-darb-beige sm:p-9">
                <PackageSearch
                  size={30}
                  strokeWidth={
                    1.4
                  }
                  className="text-darb-gold"
                />

                <h2 className="mt-6 font-display text-3xl">
                  Find your Darb
                  order.
                </h2>

                <p className="mt-4 text-sm leading-7 text-darb-beige/60">
                  Both details
                  must match the
                  same order before
                  any tracking
                  information is
                  shown.
                </p>

                <div className="mt-7 border-t border-darb-beige/10 pt-6">
                  <p className="text-xs leading-6 text-darb-beige/45">
                    Your order
                    number appears
                    on the order
                    confirmation
                    page and in
                    Darb order
                    emails.
                  </p>
                </div>
              </div>

              {/* Form */}

              <form
                onSubmit={
                  handleSubmit
                }
                className="p-7 sm:p-9"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-darb-gold">
                  Track Order
                </p>

                <h2 className="mt-2 font-display text-3xl text-darb-green">
                  Where is your
                  order?
                </h2>

                <div className="mt-7 space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-darb-green">
                      Order Number
                    </label>

                    <input
                      name="orderNumber"
                      value={
                        form.orderNumber
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="DARB-1001"
                      autoComplete="off"
                      className="w-full rounded-full border border-darb-gold/30 px-5 py-3.5 uppercase outline-none transition focus:border-darb-green"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-darb-green">
                      Phone Number
                    </label>

                    <input
                      type="tel"
                      name="phone"
                      value={
                        form.phone
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="The number used at checkout"
                      autoComplete="tel"
                      className="w-full rounded-full border border-darb-gold/30 px-5 py-3.5 outline-none transition focus:border-darb-green"
                    />
                  </div>
                </div>

                {(validationError ||
                  trackingMutation.isError) && (
                  <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                    {validationError ||
                      trackingMutation.error
                        ?.friendlyMessage ||
                      "We couldn't find an order matching those details."}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={
                    trackingMutation.isPending
                  }
                  className="mt-7 inline-flex min-h-[50px] w-full items-center justify-center rounded-full bg-darb-green px-8 text-sm font-semibold text-darb-beige transition hover:bg-darb-black disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {trackingMutation.isPending
                    ? "Finding Order..."
                    : "Track Order"}
                </button>

                <p className="mt-4 text-xs leading-6 text-darb-muted">
                  For your
                  privacy, both
                  details must
                  match before
                  order information
                  is displayed.
                </p>
              </form>
            </div>
          </div>
        ) : (
          /* =========================
              RESULT
          ========================== */

          <div>
            {/* Top summary */}

            <div className="rounded-[2rem] bg-darb-green p-6 text-darb-beige shadow-soft sm:p-8">
              <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-darb-gold">
                    Order Found
                  </p>

                  <h2 className="mt-2 font-display text-4xl">
                    {
                      order.orderNumber
                    }
                  </h2>

                  <p className="mt-3 text-sm text-darb-beige/55">
                    Placed{" "}
                    {formatDate(
                      order.createdAt
                    )}
                  </p>
                </div>

                <div className="sm:text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-darb-gold">
                    Current Status
                  </p>

                  <p className="mt-1 font-display text-2xl">
                    {statusLabels[
                      order.orderStatus
                    ] ||
                      order.orderStatus}
                  </p>
                </div>
              </div>
            </div>

            {/* Progress */}

            <div className="mt-5 rounded-[2rem] border border-darb-gold/20 bg-white p-6 shadow-soft sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-darb-gold">
                The Journey
              </p>

              <h2 className="mt-2 font-display text-3xl text-darb-green">
                Order progress
              </h2>

              <div className="mt-8">
                <StatusProgress
                  order={order}
                />
              </div>
            </div>

            {/* Details */}

            <div className="mt-5 grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
              {/* Products */}

              <div className="rounded-[2rem] border border-darb-gold/20 bg-white p-6 shadow-soft sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-darb-gold">
                  Fragrances
                </p>

                <div className="mt-6 divide-y divide-darb-gold/15">
                  {(order.items ||
                    []).map(
                    (
                      item,
                      index
                    ) => (
                      <div
                        key={`${item.slug}-${index}`}
                        className="flex gap-4 py-5 first:pt-0 last:pb-0"
                      >
                        <div className="h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-darb-green/10">
                          {item.image ? (
                            <img
                              src={
                                item.image
                              }
                              alt={
                                item.name
                              }
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center font-display text-lg text-darb-green/30">
                              Darb
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="font-display text-xl text-darb-green">
                            {
                              item.name
                            }
                          </p>

                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-darb-muted">
                            {item.sizeLabel && (
                              <span>
                                {
                                  item.sizeLabel
                                }
                              </span>
                            )}

                            <span>
                              Qty{" "}
                              {
                                item.quantity
                              }
                            </span>
                          </div>
                        </div>

                        <p className="shrink-0 text-sm font-semibold text-darb-black">
                          {formatCurrency(
                            item.lineTotal
                          )}
                        </p>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Totals */}

              <div className="rounded-[2rem] border border-darb-gold/20 bg-white p-6 shadow-soft sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-darb-gold">
                  Order Summary
                </p>

                <div className="mt-6 space-y-3 text-sm">
                  <div className="flex justify-between gap-5">
                    <span className="text-darb-muted">
                      Subtotal
                    </span>

                    <span>
                      {formatCurrency(
                        order.subtotal
                      )}
                    </span>
                  </div>

                  {Number(
                    order.discountTotal
                  ) > 0 && (
                    <div className="flex justify-between gap-5">
                      <span className="text-darb-muted">
                        Discount
                      </span>

                      <span className="text-darb-green">
                        -
                        {formatCurrency(
                          order.discountTotal
                        )}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between gap-5">
                    <span className="text-darb-muted">
                      Delivery
                    </span>

                    <span>
                      {Number(
                        order.deliveryFee
                      ) > 0
                        ? formatCurrency(
                            order.deliveryFee
                          )
                        : "Free"}
                    </span>
                  </div>

                  <div className="border-t border-darb-gold/20 pt-4">
                    <div className="flex items-end justify-between gap-5">
                      <span className="font-semibold text-darb-green">
                        Total
                      </span>

                      <span className="font-display text-2xl text-darb-green">
                        {formatCurrency(
                          order.total
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl bg-darb-cream p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-darb-gold">
                    Payment
                  </p>

                  <p className="mt-1 text-sm font-semibold text-darb-green">
                    {paymentLabels[
                      order.paymentStatus
                    ] ||
                      order.paymentStatus}
                  </p>
                </div>
              </div>
            </div>

            {/* Timeline */}

            {order.statusHistory
              ?.length > 0 && (
              <div className="mt-5 rounded-[2rem] border border-darb-gold/20 bg-white p-6 shadow-soft sm:p-8">
                <div className="flex items-center gap-3">
                  <Clock3
                    size={20}
                    className="text-darb-gold"
                  />

                  <h2 className="font-display text-2xl text-darb-green">
                    Order updates
                  </h2>
                </div>

                <div className="mt-6 space-y-5">
                  {[
                    ...order.statusHistory,
                  ]
                    .reverse()
                    .map(
                      (
                        entry,
                        index
                      ) => (
                        <div
                          key={`${entry.status}-${entry.changedAt}-${index}`}
                          className="flex gap-4"
                        >
                          <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-darb-gold" />

                          <div>
                            <p className="text-sm font-semibold text-darb-green">
                              {statusLabels[
                                entry
                                  .status
                              ] ||
                                entry
                                  .status}
                            </p>

                            <p className="mt-1 text-xs text-darb-muted">
                              {formatDate(
                                entry.changedAt,
                                true
                              )}
                            </p>
                          </div>
                        </div>
                      )
                    )}
                </div>
              </div>
            )}

            <div className="mt-7 flex flex-wrap items-center justify-between gap-4">
              <button
                type="button"
                onClick={
                  resetTracking
                }
                className="inline-flex items-center gap-2 rounded-full border border-darb-gold/35 px-6 py-3 text-sm font-semibold text-darb-green transition hover:bg-darb-gold/10"
              >
                <RotateCcw
                  size={16}
                />

                Track Another Order
              </button>

              <Link
                to="/contact"
                className="text-sm font-semibold text-darb-green transition hover:text-darb-gold"
              >
                Need help? Contact Darb →
              </Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

export default TrackOrder;