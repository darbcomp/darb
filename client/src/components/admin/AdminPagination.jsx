import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect } from "react";

export default function AdminPagination({ page = 1, pages = 1, onPageChange }) {
  const safePages = Math.max(1, Number(pages) || 1);
  const safePage = Math.max(1, Math.min(Number(page) || 1, safePages));

  useEffect(() => {
    if (Number(page) !== safePage) onPageChange(safePage);
  }, [onPageChange, page, safePage]);

  if (safePages <= 1) return null;
  return <nav className="mt-7 flex flex-wrap items-center justify-center gap-3 border-t border-darb-gold/20 pt-5" aria-label="Pagination">
    <button type="button" onClick={() => onPageChange(safePage - 1)} disabled={safePage <= 1} className="inline-flex min-h-10 items-center gap-1 rounded-full border border-darb-gold/35 px-4 text-sm font-semibold text-darb-green transition hover:bg-darb-surface disabled:cursor-not-allowed disabled:opacity-35"><ChevronLeft size={16} />Previous</button>
    <span className="min-w-28 text-center text-sm tabular-nums text-darb-muted">Page <strong className="text-darb-green">{safePage}</strong> of <strong className="text-darb-green">{safePages}</strong></span>
    <button type="button" onClick={() => onPageChange(safePage + 1)} disabled={safePage >= safePages} className="inline-flex min-h-10 items-center gap-1 rounded-full border border-darb-gold/35 px-4 text-sm font-semibold text-darb-green transition hover:bg-darb-surface disabled:cursor-not-allowed disabled:opacity-35">Next<ChevronRight size={16} /></button>
  </nav>;
}
