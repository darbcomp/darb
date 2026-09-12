import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import {
  ArrowRight,
  Check,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
} from "lucide-react";

import { useCart } from "../../context/useCart";
import { useFeedback } from "../../context/FeedbackContext";
import { useLanguage } from "../../context/LanguageContext";
import { previewOrder } from "../../api/orderApi";

import {
  formatCurrency,
} from "../../utils/formatCurrency";

function Cart() {
  const { confirm, notify } = useFeedback();
  const { language, t } = useLanguage();
  const {
    items,
    isEmpty,
    subtotal,
    compareAtSubtotal,
    productSavings,
    itemCount,
    incrementItem,
    decrementItem,
    removeItem,
    clearCart,
  } = useCart();
  const previewItems = useMemo(() => items.map((item) => ({
    product: item.productId,
    slug: item.slug,
    quantity: item.quantity,
    variant: item.variant,
  })), [items]);
  const pricingPreview = useQuery({
    queryKey: ["cart-pricing-preview", previewItems],
    queryFn: () => previewOrder({ items: previewItems, pricingOnly: true }),
    enabled: previewItems.length > 0,
    retry: 1,
  });
  const previewPricing = pricingPreview.data?.data?.pricing;
  const automaticDiscounts = previewPricing?.discounts || [];
  const estimatedBeforeDelivery = previewPricing?.deliveryConfirmed === false
    ? previewPricing.totalBeforeDelivery
    : subtotal;
  const localizedItemName = (item) =>
    language === "ar" && item.arabicName ? item.arabicName : item.name;
  const handleClearCart = async () => {
    const accepted = await confirm({ title: t("Clear your cart?"), body: t("All selected fragrances will be removed."), confirmLabel: t("Clear cart"), variant: "destructive" });
    if (accepted) { clearCart(); notify({ type: "info", title: t("Cart cleared") }); }
  };
  const handleRemoveItem = async (item) => {
    const accepted = await confirm({ title: t("Remove fragrance?"), body: localizedItemName(item), confirmLabel: t("Remove"), variant: "destructive" });
    if (accepted) { removeItem(item.cartItemId); notify({ type: "info", title: t("Removed from cart") }); }
  };

  /* =========================
     EMPTY CART
  ========================== */

  if (isEmpty) {
    return (
      <main className="min-h-[70vh] bg-darb-cream">
        <section className="mx-auto max-w-7xl px-5 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-darb-gold/25 bg-white text-darb-green shadow-soft">
              <ShoppingBag
                size={25}
                strokeWidth={1.5}
              />
            </div>

            <p className="mt-7 text-[10px] font-semibold uppercase tracking-[0.3em] text-darb-gold">
              {t("Your Cart")}
            </p>

            <h1 className="mt-3 font-display text-4xl text-darb-green sm:text-5xl">
              {t("Your path is still empty.")}
            </h1>

            <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-darb-muted sm:text-base">
              {t("Find a fragrance that feels like your path and bring it along for the journey.")}
            </p>

            <Link
              to="/shop"
              className="mt-8 inline-flex min-h-[52px] items-center justify-center gap-3 rounded-full bg-darb-green px-8 text-sm font-bold uppercase tracking-[0.13em] text-darb-beige transition hover:bg-darb-black"
            >
              {t("Explore Darb")}

              <ArrowRight
                size={17}
              />
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-[70vh] bg-darb-cream">
      {/* =========================
          PAGE HEADING
      ========================== */}

      <section className="border-b border-darb-gold/20">
        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6 sm:py-10 lg:px-8">
          <div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-darb-gold">
                {t("Your Selection")}
              </p>

              <h1 className="mt-2 font-display text-4xl text-darb-green sm:text-5xl">
                {t("Your Cart")}
              </h1>

              <p className="mt-3 text-sm text-darb-muted">
                {t(`${itemCount} ${itemCount === 1 ? "item" : "items"} selected.`)}
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* =========================
          CART CONTENT
      ========================== */}

      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_390px] lg:gap-12">
          {/* =========================
              ITEMS
          ========================== */}

          <div>
            <Link
              to="/shop"
              className="mb-5 inline-flex items-center gap-2 text-xs font-semibold text-darb-green transition hover:text-darb-gold"
            >
              <span aria-hidden="true">←</span>
              {t("Continue Shopping")}
            </Link>

            <div className="divide-y divide-darb-gold/20 border-y border-darb-gold/20">
              {items.map(
                (item) => {
                  const hasDiscount =
                    item.compareAtPrice >
                    item.price;

                  const unitSaving =
                    hasDiscount
                      ? item.compareAtPrice -
                        item.price
                      : 0;

                  const itemTotal =
                    item.price *
                    item.quantity;

                  const atMaxStock =
                    item.stock > 0 &&
                    item.quantity >=
                      item.stock;

                  const lowStock =
                    item.stock > 0 &&
                    item.stock <= 3;

                  return (
                    <article
                      key={
                        item.cartItemId
                      }
                      className="py-6 first:pt-0 last:pb-0 sm:py-7"
                    >
                      <div className="grid grid-cols-[104px_minmax(0,1fr)] gap-4 sm:grid-cols-[135px_minmax(0,1fr)_auto] sm:gap-6">
                        {/* Image */}

                        <Link
                          to={`/product/${item.slug}`}
                          className="aspect-square overflow-hidden rounded-[1.25rem] bg-white sm:rounded-[1.5rem]"
                        >
                          {item.image ? (
                            <img
                              src={
                                item.image
                              }
                              alt={
                                localizedItemName(item)
                              }
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center bg-darb-green">
                              <div className="text-center">
                                <p className="font-display text-2xl text-darb-gold">
                                  Darb
                                </p>

                                <p className="mt-1 text-[8px] uppercase tracking-[0.2em] text-darb-beige/60">
                                  {t("Visual soon")}
                                </p>
                              </div>
                            </div>
                          )}
                        </Link>

                        {/* Details */}

                        <div className="min-w-0">
                          <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-darb-gold">
                            {(language === "ar" && item.arabicCategoryName
                              ? item.arabicCategoryName
                              : item.categoryName) ||
                              "Darb"}
                          </p>

                          <Link
                            to={`/product/${item.slug}`}
                            className="inline-block"
                          >
                            <h2 className="mt-1 font-display text-2xl leading-tight text-darb-green transition hover:text-darb-black sm:text-3xl">
                              {localizedItemName(item)}
                            </h2>
                          </Link>

                          <p className="mt-2 text-xs text-darb-muted sm:text-sm">
                            {item.sizeLabel ||
                              "50 ML"}
                          </p>

                          {/* Price */}

                          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="text-sm font-semibold text-darb-black">
                              {formatCurrency(
                                item.price
                              )}
                            </span>

                            {hasDiscount && (
                              <span className="text-xs text-darb-muted line-through">
                                {formatCurrency(
                                  item.compareAtPrice
                                )}
                              </span>
                            )}
                          </div>

                          {hasDiscount && (
                            <p className="mt-1 text-[10px] font-semibold text-darb-green">
                              {t(`Save ${formatCurrency(unitSaving)} per bottle`)}
                            </p>
                          )}

                          {/* Mobile Controls */}

                          <div className="mt-4 flex items-center justify-between gap-3 sm:hidden">
                            <QuantityControl
                              quantity={
                                item.quantity
                              }
                              canDecrease={
                                item.quantity >
                                1
                              }
                              canIncrease={
                                !atMaxStock
                              }
                              onDecrease={() =>
                                decrementItem(
                                  item.cartItemId
                                )
                              }
                              onIncrease={() =>
                                incrementItem(
                                  item.cartItemId
                                )
                              }
                            />

                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveItem(item)
                              }
                              aria-label={t(`Remove ${localizedItemName(item)}`)}
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-darb-muted transition hover:bg-red-50 hover:text-red-700 focus-visible:bg-red-50 focus-visible:text-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                            >
                              <Trash2
                                size={
                                  17
                                }
                              />
                            </button>
                          </div>

                          {/* Stock Feedback */}

                          {lowStock && (
                            <p className="mt-3 text-[10px] font-semibold text-darb-gold">
                              {t(`Only ${item.stock} ${item.stock === 1 ? "bottle" : "bottles"} available`)}
                            </p>
                          )}

                          {atMaxStock &&
                            !lowStock && (
                              <p className="mt-3 text-[10px] text-darb-muted">
                                {t("Maximum available quantity reached")}
                              </p>
                            )}
                        </div>

                        {/* Desktop Actions */}

                        <div className="hidden min-w-[150px] flex-col items-end justify-between gap-5 sm:flex">
                          <button
                            type="button"
                            onClick={() =>
                              handleRemoveItem(item)
                            }
                            aria-label={t(`Remove ${localizedItemName(item)}`)}
                            className="flex h-9 w-9 items-center justify-center rounded-full text-darb-muted transition hover:bg-red-50 hover:text-red-700 focus-visible:bg-red-50 focus-visible:text-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                          >
                            <Trash2
                              size={16}
                            />
                          </button>

                          <div className="flex flex-col items-end gap-3">
                            <QuantityControl
                              quantity={
                                item.quantity
                              }
                              canDecrease={
                                item.quantity >
                                1
                              }
                              canIncrease={
                                !atMaxStock
                              }
                              onDecrease={() =>
                                decrementItem(
                                  item.cartItemId
                                )
                              }
                              onIncrease={() =>
                                incrementItem(
                                  item.cartItemId
                                )
                              }
                            />

                            <p className="text-end">
                              <span className="block text-[9px] font-semibold uppercase tracking-[0.18em] text-darb-muted">
                                {t("Total")}
                              </span>

                              <span className="mt-1 block font-display text-xl text-darb-green">
                                {formatCurrency(
                                  itemTotal
                                )}
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Mobile Item Total */}

                      <div className="mt-5 flex items-center justify-between border-t border-darb-gold/10 pt-4 sm:hidden">
                        <span className="text-xs text-darb-muted">
                          {t("Item total")}
                        </span>

                        <span className="font-display text-xl text-darb-green">
                          {formatCurrency(
                            itemTotal
                          )}
                        </span>
                      </div>
                    </article>
                  );
                }
              )}
            </div>

            <div className="mt-8">
              <button
                type="button"
                onClick={handleClearCart}
                className="text-xs font-semibold text-darb-muted underline decoration-darb-gold underline-offset-4 transition hover:text-red-700 focus-visible:text-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
              >
                {t("Clear cart")}
              </button>
            </div>
          </div>

          {/* =========================
              SUMMARY
          ========================== */}

          <aside className="h-fit lg:sticky lg:top-[125px]">
            <div className="rounded-[1.75rem] border border-darb-gold/20 bg-white p-6 shadow-soft sm:p-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-darb-gold">
                {t("Summary")}
              </p>

              <h2 className="mt-2 font-display text-3xl text-darb-green">
                {t("Order Summary")}
              </h2>

              <div className="mt-7 space-y-4 text-sm">
                {/* Original subtotal */}

                {productSavings >
                  0 && (
                  <SummaryRow
                    label={t("Original price")}
                    value={formatCurrency(
                      compareAtSubtotal
                    )}
                    muted
                  />
                )}

                {/* Subtotal */}

                <SummaryRow
                  label={t("Subtotal")}
                  value={formatCurrency(
                    subtotal
                  )}
                />

                {/* Product savings */}

                {productSavings >
                  0 && (
                  <SummaryRow
                    label={t("Product savings")}
                    value={`-${formatCurrency(
                      productSavings
                    )}`}
                    saving
                  />
                )}

                {automaticDiscounts.length > 0 && (
                  <div className="space-y-3 border-t border-darb-gold/15 pt-4">
                    {automaticDiscounts.map((discount, index) => (
                      <SummaryRow
                        key={`${discount.sourceType}-${discount.sourceId || index}`}
                        label={discount.name || discount.title || t("Automatic promotion")}
                        value={discount.amount > 0 ? `-${formatCurrency(discount.amount)}` : t("Applied")}
                        saving
                      />
                    ))}
                  </div>
                )}

                <SummaryRow
                  label={t("Delivery")}
                  value={t("Calculated at checkout")}
                  subtle
                />
              </div>

              {/* Total */}

              <div className="mt-6 border-t border-darb-gold/20 pt-6">
                <div className="flex items-end justify-between gap-5">
                  <div>
                    <p className="text-sm font-semibold text-darb-green">
                      {t("Estimated Total")}
                    </p>

                    <p className="mt-1 text-[10px] leading-5 text-darb-muted">
                      {t("Before delivery. Final pricing is confirmed at checkout.")}
                    </p>
                  </div>

                  <p className="shrink-0 font-display text-3xl text-darb-green">
                    {formatCurrency(
                      estimatedBeforeDelivery
                    )}
                  </p>
                </div>
              </div>

              {(pricingPreview.isFetching || pricingPreview.isError) && (
                <p className="mt-3 text-[10px] leading-5 text-darb-muted" aria-live="polite">
                  {t(pricingPreview.isError
                    ? "Promotional pricing will be confirmed at checkout."
                    : "Checking current promotions...")}
                </p>
              )}

              {/* Checkout CTA */}

              <Link
                to="/checkout"
                className="mt-7 flex min-h-[54px] w-full items-center justify-center gap-3 rounded-full bg-darb-green px-6 text-sm font-bold uppercase tracking-[0.12em] text-darb-beige transition hover:bg-darb-black"
              >
                {t("Checkout")}

                <ArrowRight
                  size={17}
                />
              </Link>

              {/* Trust line */}

              <div className="mt-5 flex items-start gap-3 border-t border-darb-gold/15 pt-5">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-darb-green text-darb-beige">
                  <Check
                    size={11}
                    strokeWidth={2.5}
                  />
                </div>

                <p className="text-[11px] leading-5 text-darb-muted">
                  {t("Final pricing, delivery, applicable offers and coupons are confirmed during checkout.")}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

/* =========================
   QUANTITY CONTROL
========================== */

function QuantityControl({
  quantity,
  canDecrease,
  canIncrease,
  onDecrease,
  onIncrease,
}) {
  const { t } = useLanguage();

  return (
    <div className="inline-flex h-11 items-center rounded-full border border-darb-gold/30 bg-darb-cream">
      <button
        type="button"
        onClick={onDecrease}
        disabled={!canDecrease}
        aria-label={t("Decrease quantity")}
        className="flex h-11 w-10 items-center justify-center text-darb-green transition hover:text-darb-black disabled:cursor-not-allowed disabled:opacity-25"
      >
        <Minus
          size={15}
        />
      </button>

      <span className="min-w-9 text-center text-sm font-semibold text-darb-green">
        {quantity}
      </span>

      <button
        type="button"
        onClick={onIncrease}
        disabled={!canIncrease}
        aria-label={t("Increase quantity")}
        className="flex h-11 w-10 items-center justify-center text-darb-green transition hover:text-darb-black disabled:cursor-not-allowed disabled:opacity-25"
      >
        <Plus
          size={15}
        />
      </button>
    </div>
  );
}

/* =========================
   SUMMARY ROW
========================== */

function SummaryRow({
  label,
  value,
  saving = false,
  muted = false,
  subtle = false,
}) {
  return (
    <div className="flex items-start justify-between gap-5">
      <span
        className={
          muted || subtle
            ? "text-darb-muted"
            : "text-darb-black"
        }
      >
        {label}
      </span>

      <span
        className={`text-end font-semibold ${
          saving
            ? "text-darb-green"
            : subtle
              ? "max-w-[145px] text-xs font-medium leading-5 text-darb-muted"
              : muted
                ? "text-darb-muted line-through"
                : "text-darb-black"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export default Cart;
