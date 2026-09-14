import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { useCart } from "../../context/useCart";
import { useLanguage } from "../../context/LanguageContext";

const MAX_VISIBLE_LINES = 3;

export default function AddedToCartPopup() {
  const navigate = useNavigate();
  const { isArabic, t } = useLanguage();
  const { items, addedEvent, dismissAddedPopup } = useCart();

  useEffect(() => {
    if (!addedEvent) return undefined;
    const timer = window.setTimeout(dismissAddedPopup, 5000);
    return () => window.clearTimeout(timer);
  }, [addedEvent, dismissAddedPopup]);

  if (!addedEvent) return null;

  const visibleItems = items.slice(0, MAX_VISIBLE_LINES);
  const remainingLines = Math.max(items.length - visibleItems.length, 0);

  const quickCheckout = () => {
    dismissAddedPopup();
    navigate("/checkout");
  };

  return (
    <aside
      className="fixed inset-x-3 bottom-4 z-[80] mx-auto w-auto max-w-sm rounded-[1.25rem] border border-darb-gold/35 bg-darb-cream p-4 text-darb-green shadow-2xl sm:inset-x-auto sm:bottom-6 sm:end-6 sm:w-80"
      role="status"
      aria-live="polite"
    >
      <p className="font-display text-xl">{t("Added to Cart")}</p>

      <div className="mt-2 space-y-1 text-sm">
        {visibleItems.map((item) => (
          <p key={item.cartItemId} className="flex items-center justify-between gap-4">
            <span className="truncate">{isArabic && item.arabicName ? item.arabicName : item.name}</span>
            <span className="shrink-0 font-semibold" dir="ltr">×{item.quantity}</span>
          </p>
        ))}
        {remainingLines > 0 && (
          <p className="text-xs text-darb-muted">+ {remainingLines} {t("more")}</p>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" onClick={dismissAddedPopup} className="min-h-10 rounded-full border border-darb-green/25 px-3 text-xs font-semibold transition hover:bg-darb-green/5">
          {t("Continue Shopping")}
        </button>
        <button type="button" onClick={quickCheckout} className="min-h-10 rounded-full bg-darb-green px-3 text-xs font-semibold text-darb-beige transition hover:bg-darb-black">
          {t("Quick Checkout")}
        </button>
      </div>
    </aside>
  );
}
