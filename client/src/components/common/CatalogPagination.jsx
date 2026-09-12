import { ChevronLeft, ChevronRight } from "lucide-react";

import { useLanguage } from "../../context/LanguageContext";

export default function CatalogPagination({
  page,
  pages,
  isPending = false,
  onPageChange,
}) {
  const { isArabic, t } = useLanguage();

  if (pages <= 1) return null;

  const PreviousIcon = isArabic ? ChevronRight : ChevronLeft;
  const NextIcon = isArabic ? ChevronLeft : ChevronRight;

  return (
    <nav
      className="mt-10 grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-t border-darb-gold/20 pt-8 sm:mt-12 sm:gap-6"
      aria-label={t("Product pages")}
    >
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1 || isPending}
        className="inline-flex min-h-11 w-fit items-center gap-1.5 justify-self-start rounded-full border border-darb-gold/35 bg-darb-cream px-3 text-xs font-semibold text-darb-green transition hover:border-darb-green hover:bg-darb-surface disabled:cursor-not-allowed disabled:opacity-35 sm:px-5 sm:text-sm"
      >
        <PreviousIcon size={16} aria-hidden="true" />
        {t("Previous")}
      </button>

      <p className="whitespace-nowrap text-center text-xs tabular-nums text-darb-muted sm:text-sm">
        {t(`Page ${page} of ${pages}`)}
      </p>

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pages || isPending}
        className="inline-flex min-h-11 w-fit items-center gap-1.5 justify-self-end rounded-full border border-darb-gold/35 bg-darb-cream px-3 text-xs font-semibold text-darb-green transition hover:border-darb-green hover:bg-darb-surface disabled:cursor-not-allowed disabled:opacity-35 sm:px-5 sm:text-sm"
      >
        {t("Next")}
        <NextIcon size={16} aria-hidden="true" />
      </button>
    </nav>
  );
}
