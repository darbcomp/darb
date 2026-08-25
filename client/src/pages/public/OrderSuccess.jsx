import {
  Link,
  useLocation,
} from "react-router-dom";

import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  Mail,
  MapPin,
  Package,
  ReceiptText,
  ShoppingBag,
  Truck,
} from "lucide-react";

import {
  useAuth,
} from "../../context/AuthContext";

import {
  formatCurrency,
} from "../../utils/formatCurrency";

/* =========================
   PAYMENT LABELS
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
   ORDER STATUS LABELS
========================== */

const orderStatusLabels = {
  pending:
    "Pending",

  confirmed:
    "Confirmed",

  processing:
    "Processing",

  shipped:
    "Shipped",

  delivered:
    "Delivered",

  cancelled:
    "Cancelled",
};

/* =========================
   PAYMENT STATUS LABELS
========================== */

const paymentStatusLabels = {
  pending:
    "Pending",

  paid:
    "Paid",

  failed:
    "Failed",

  refunded:
    "Refunded",
};

/* =========================
   DATE FORMAT
========================== */

const formatOrderDate = (
  value
) => {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "en-EG",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  ).format(date);
};

/* =========================
   ADDRESS FORMAT
========================== */

const buildAddressLines = (
  address
) => {
  if (!address) {
    return [];
  }

  const details = [
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
    address.street ||
      "",

    details.join(", "),

    [
      address.city,
      address.governorate,
    ]
      .filter(Boolean)
      .join(", "),
  ].filter(Boolean);
};

/* =========================
   ORDER SUCCESS
========================== */

function OrderSuccess() {
  const location =
    useLocation();

  const {
    user,
    isAuthenticated,
  } = useAuth();

  const order =
    location.state?.order;

  const message =
    location.state?.message ||
    "Your order has been placed successfully.";

  const isAdmin =
    user?.role ===
    "admin";

  const isCustomer =
    isAuthenticated &&
    !isAdmin;

  /* =========================
     NO ORDER IN ROUTE STATE

     This protects /order-success
     from showing a fake success
     state when opened directly.
  ========================== */

  if (!order) {
    return (
      <main className="min-h-[70vh] bg-darb-cream">
        <section className="mx-auto max-w-7xl px-5 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-darb-gold/25 bg-white text-darb-green shadow-soft">
              <ReceiptText
                size={26}
                strokeWidth={1.5}
              />
            </div>

            <p className="mt-7 text-[10px] font-semibold uppercase tracking-[0.3em] text-darb-gold">
              Darb Orders
            </p>

            <h1 className="mt-3 font-display text-4xl text-darb-green sm:text-5xl">
              Nothing to
              confirm here yet.
            </h1>

            <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-darb-muted sm:text-base">
              This page appears
              after a Darb order is
              successfully placed.
              You can continue
              shopping or view an
              existing order.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                to="/shop"
                className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-darb-green px-7 text-sm font-bold uppercase tracking-[0.12em] text-darb-beige transition hover:bg-darb-black"
              >
                Shop Darb

                <ArrowRight
                  size={16}
                />
              </Link>

              {isCustomer ? (
                <Link
                  to="/account/orders"
                  className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-darb-gold/40 px-7 text-sm font-semibold text-darb-green transition hover:bg-darb-gold/10"
                >
                  My Orders
                </Link>
              ) : isAdmin ? (
                <Link
                  to="/admin/orders"
                  className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-darb-gold/40 px-7 text-sm font-semibold text-darb-green transition hover:bg-darb-gold/10"
                >
                  Admin Orders
                </Link>
              ) : (
                <Link
                  to="/track-order"
                  className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-darb-gold/40 px-7 text-sm font-semibold text-darb-green transition hover:bg-darb-gold/10"
                >
                  Track an Order
                </Link>
              )}
            </div>
          </div>
        </section>
      </main>
    );
  }

  /* =========================
     ORDER DATA
  ========================== */

  const customer =
    order.customerSnapshot ||
    {};

  const address =
    order.shippingAddress ||
    {};

  const addressLines =
    buildAddressLines(
      address
    );

  const orderItems =
    Array.isArray(
      order.items
    )
      ? order.items
      : [];

  const orderNumber =
    order.orderNumber ||
    "—";

  const orderStatus =
    orderStatusLabels[
      order.orderStatus
    ] ||
    order.orderStatus ||
    "Pending";

  const paymentMethod =
    paymentMethodLabels[
      order.paymentMethod
    ] ||
    order.paymentMethod ||
    "—";

  const paymentStatus =
    paymentStatusLabels[
      order.paymentStatus
    ] ||
    order.paymentStatus ||
    "Pending";

  const orderDate =
    formatOrderDate(
      order.createdAt
    );

  const discountTotal =
    Number(
      order.discountTotal
    ) || 0;

  const deliveryFee =
    Number(
      order.deliveryFee
    ) || 0;

  /* =========================
     PAGE
  ========================== */

  return (
    <main className="min-h-[70vh] bg-darb-cream">
      {/* =========================
          SUCCESS HERO
      ========================== */}

      <section className="border-b border-darb-gold/20">
        <div className="mx-auto max-w-4xl px-5 py-12 text-center sm:px-6 sm:py-16 lg:px-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-darb-green text-darb-beige shadow-soft sm:h-18 sm:w-18">
            <CheckCircle2
              size={32}
              strokeWidth={1.6}
            />
          </div>

          <p className="mt-7 text-[10px] font-bold uppercase tracking-[0.32em] text-darb-gold">
            Order Confirmed
          </p>

          <h1 className="mx-auto mt-3 max-w-3xl font-display text-4xl leading-tight text-darb-green sm:text-6xl">
            Thank you for
            choosing Darb.
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-darb-muted sm:text-base">
            {message}
          </p>

          <div className="mx-auto mt-7 inline-flex items-center rounded-full border border-darb-gold/30 bg-white px-5 py-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-darb-muted">
              Order
            </span>

            <span className="mx-3 h-4 w-px bg-darb-gold/30" />

            <span className="text-sm font-bold text-darb-green">
              {orderNumber}
            </span>
          </div>

          {orderDate && (
            <p className="mt-3 text-xs text-darb-muted">
              Placed{" "}
              {orderDate}
            </p>
          )}
        </div>
      </section>

      {/* =========================
          ORDER OVERVIEW
      ========================== */}

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-3">
          <OverviewCard
            icon={
              <Clock3
                size={19}
              />
            }
            label="Order Status"
            value={
              orderStatus
            }
          />

          <OverviewCard
            icon={
              <ReceiptText
                size={19}
              />
            }
            label="Payment"
            value={
              paymentMethod
            }
            detail={
              paymentStatus
            }
          />

          <OverviewCard
            icon={
              <ShoppingBag
                size={19}
              />
            }
            label="Order Total"
            value={formatCurrency(
              Number(
                order.total
              ) || 0
            )}
          />
        </div>

        {/* =========================
            EMAIL NOTICE
        ========================== */}

        {customer.email && (
          <div className="mt-5 flex items-start gap-4 rounded-[1.5rem] border border-darb-gold/20 bg-white px-5 py-4 sm:px-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-darb-green/8 text-darb-green">
              <Mail
                size={17}
              />
            </div>

            <div>
              <p className="text-sm font-semibold text-darb-green">
                Order confirmation
                sent
              </p>

              <p className="mt-1 text-xs leading-6 text-darb-muted">
                We sent the order
                details to{" "}
                <span className="font-semibold text-darb-black">
                  {
                    customer.email
                  }
                </span>
                .
              </p>
            </div>
          </div>
        )}

        {/* =========================
            MAIN DETAILS
        ========================== */}

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10">
          {/* =========================
              ORDER ITEMS
          ========================== */}

          <div>
            <div className="flex items-end justify-between gap-5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.27em] text-darb-gold">
                  Your Selection
                </p>

                <h2 className="mt-2 font-display text-3xl text-darb-green sm:text-4xl">
                  Fragrances
                </h2>
              </div>

              <p className="text-xs text-darb-muted">
                {
                  orderItems.reduce(
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
                  )
                }{" "}
                items
              </p>
            </div>

            <div className="mt-6 divide-y divide-darb-gold/20 border-y border-darb-gold/20">
              {orderItems.map(
                (
                  item,
                  index
                ) => {
                  const snapshot =
                    item.productSnapshot ||
                    {};

                  return (
                    <article
                      key={
                        item.product ||
                        `${snapshot.slug}-${index}`
                      }
                      className="flex gap-4 py-5 sm:gap-5 sm:py-6"
                    >
                      {/* Image */}

                      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-[1.2rem] bg-white sm:h-28 sm:w-28">
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
                          <div className="flex h-full w-full items-center justify-center bg-darb-green">
                            <span className="font-display text-xl text-darb-gold">
                              Darb
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Info */}

                      <div className="min-w-0 flex-1">
                        {snapshot.categoryName && (
                          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-darb-gold">
                            {
                              snapshot.categoryName
                            }
                          </p>
                        )}

                        <h3 className="mt-1 font-display text-2xl text-darb-green">
                          {snapshot.name ||
                            "Darb Fragrance"}
                        </h3>

                        <p className="mt-2 text-xs text-darb-muted">
                          {snapshot.sizeLabel ||
                            (snapshot.sizeMl
                              ? `${snapshot.sizeMl} ML`
                              : "")}

                          {(snapshot.sizeLabel ||
                            snapshot.sizeMl) &&
                            " • "}

                          Qty:{" "}
                          {item.quantity}
                        </p>

                        <p className="mt-3 text-sm font-semibold text-darb-black">
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
                    </article>
                  );
                }
              )}
            </div>
          </div>

          {/* =========================
              SUMMARY
          ========================== */}

          <aside className="h-fit lg:sticky lg:top-[125px]">
            <div className="rounded-[1.75rem] border border-darb-gold/20 bg-white p-6 shadow-soft">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-darb-gold">
                Order Details
              </p>

              <h2 className="mt-2 font-display text-3xl text-darb-green">
                Summary
              </h2>

              {/* Customer */}

              <div className="mt-6 border-t border-darb-gold/15 pt-5">
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-darb-gold">
                  Customer
                </p>

                <p className="mt-2 text-sm font-semibold text-darb-green">
                  {customer.name ||
                    "—"}
                </p>

                {customer.phone && (
                  <p className="mt-1 text-xs text-darb-muted">
                    {
                      customer.phone
                    }
                  </p>
                )}
              </div>

              {/* Address */}

              <div className="mt-5 border-t border-darb-gold/15 pt-5">
                <div className="flex items-center gap-2">
                  <MapPin
                    size={15}
                    className="text-darb-gold"
                  />

                  <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-darb-gold">
                    Delivery Address
                  </p>
                </div>

                <div className="mt-3 space-y-1 text-xs leading-5 text-darb-muted">
                  {addressLines.length >
                  0 ? (
                    addressLines.map(
                      (
                        line,
                        index
                      ) => (
                        <p
                          key={`${line}-${index}`}
                        >
                          {line}
                        </p>
                      )
                    )
                  ) : (
                    <p>
                      —
                    </p>
                  )}
                </div>
              </div>

              {/* Pricing */}

              <div className="mt-5 border-t border-darb-gold/15 pt-5">
                <div className="space-y-3 text-sm">
                  <PriceRow
                    label="Subtotal"
                    value={formatCurrency(
                      Number(
                        order.subtotal
                      ) || 0
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
                  <div className="flex items-end justify-between gap-4">
                    <span className="font-semibold text-darb-green">
                      Total
                    </span>

                    <span className="font-display text-3xl text-darb-green">
                      {formatCurrency(
                        Number(
                          order.total
                        ) || 0
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* =========================
            WHAT HAPPENS NEXT
        ========================== */}

        <section className="mt-12 rounded-[2rem] bg-darb-green px-6 py-8 text-darb-beige sm:px-8 sm:py-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-darb-gold">
            What happens next
          </p>

          <h2 className="mt-2 font-display text-3xl sm:text-4xl">
            Your Darb journey
            continues.
          </h2>

          <div className="mt-7 grid gap-6 sm:grid-cols-3">
            <NextStep
              number="01"
              icon={
                <Check
                  size={17}
                />
              }
              title="Order Received"
              text="Your order is safely recorded with Darb."
            />

            <NextStep
              number="02"
              icon={
                <Package
                  size={17}
                />
              }
              title="Preparation"
              text="Your fragrances will be prepared for their next path."
            />

            <NextStep
              number="03"
              icon={
                <Truck
                  size={17}
                />
              }
              title="Delivery"
              text="Your order status will be updated as it moves toward you."
            />
          </div>
        </section>

        {/* =========================
            ACTIONS
        ========================== */}

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {isCustomer ? (
            <Link
              to="/account/orders"
              className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-darb-green px-8 text-sm font-bold uppercase tracking-[0.12em] text-darb-beige transition hover:bg-darb-black sm:w-auto"
            >
              View My Orders

              <ArrowRight
                size={16}
              />
            </Link>
          ) : isAdmin ? (
            <Link
              to="/admin/orders"
              className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-darb-green px-8 text-sm font-bold uppercase tracking-[0.12em] text-darb-beige transition hover:bg-darb-black sm:w-auto"
            >
              View Orders

              <ArrowRight
                size={16}
              />
            </Link>
          ) : (
            <Link
              to="/track-order"
              className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-darb-green px-8 text-sm font-bold uppercase tracking-[0.12em] text-darb-beige transition hover:bg-darb-black sm:w-auto"
            >
              Track Your Order

              <ArrowRight
                size={16}
              />
            </Link>
          )}

          <Link
            to="/shop"
            className="inline-flex min-h-[52px] w-full items-center justify-center rounded-full border border-darb-gold/40 px-8 text-sm font-semibold text-darb-green transition hover:bg-darb-gold/10 sm:w-auto"
          >
            Continue Shopping
          </Link>
        </div>

        {/* Guest tracking hint */}

        {!isCustomer &&
          !isAdmin && (
          <p className="mx-auto mt-5 max-w-lg text-center text-xs leading-6 text-darb-muted">
            Keep your order
            number{" "}
            <span className="font-semibold text-darb-green">
              {orderNumber}
            </span>{" "}
            and the phone number
            used at checkout. You
            will need both to
            track this order.
          </p>
        )}
      </section>
    </main>
  );
}

/* =========================
   OVERVIEW CARD
========================== */

function OverviewCard({
  icon,
  label,
  value,
  detail = "",
}) {
  return (
    <article className="rounded-[1.5rem] border border-darb-gold/20 bg-white p-5 shadow-soft sm:p-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-darb-green/8 text-darb-green">
        {icon}
      </div>

      <p className="mt-5 text-[9px] font-semibold uppercase tracking-[0.2em] text-darb-gold">
        {label}
      </p>

      <p className="mt-2 font-display text-2xl capitalize text-darb-green">
        {value}
      </p>

      {detail && (
        <p className="mt-1 text-xs capitalize text-darb-muted">
          {detail}
        </p>
      )}
    </article>
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

/* =========================
   NEXT STEP
========================== */

function NextStep({
  number,
  icon,
  title,
  text,
}) {
  return (
    <article>
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-darb-gold/30 text-darb-gold">
          {icon}
        </div>

        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-darb-gold">
          {number}
        </span>
      </div>

      <h3 className="mt-4 font-display text-2xl">
        {title}
      </h3>

      <p className="mt-2 max-w-xs text-xs leading-6 text-darb-beige/60">
        {text}
      </p>
    </article>
  );
}

export default OrderSuccess;