import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BadgeCheck, Star } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

function Stars({ rating, label }) {
  return <div className="flex gap-1 text-darb-gold" aria-label={label}>
    {Array.from({ length: 5 }, (_, index) => <Star key={index} size={16} fill={index < Number(rating) ? "currentColor" : "none"} aria-hidden="true" />)}
  </div>;
}

export function ReviewCard({ review }) {
  const { language, t } = useLanguage();
  const date = review.reviewDate || review.createdAt;
  return <article className="flex w-full shrink-0 snap-start flex-col overflow-hidden rounded-[1.5rem] border border-darb-gold/20 bg-darb-surface p-5 shadow-soft sm:w-[calc(50%_-_0.5rem)] lg:w-[calc(25%_-_0.75rem)]">
    {review.media?.url && review.media.type === "image" && <img src={review.media.url} alt={review.media.alt || `${t("Review shared by")} ${review.displayName}`} loading="lazy" className="mb-5 aspect-[4/3] w-full rounded-2xl object-cover" />}
    {review.media?.url && review.media.type === "video" && <video controls preload="metadata" poster={review.media.posterUrl || undefined} className="mb-5 aspect-video w-full rounded-2xl bg-darb-green" aria-label={`${t("Video review by")} ${review.displayName}`}><source src={review.media.url} /></video>}
    <Stars rating={review.rating} label={t(`${review.rating} out of 5 stars`)} />
    <p className="mt-5 flex-1 text-sm leading-7 text-darb-black/80">{review.text}</p>
    <div className="mt-6 border-t border-darb-gold/20 pt-4">
      <div className="flex items-center gap-2"><p className="font-semibold text-darb-green">{review.displayName}</p>{review.isVerifiedPurchase && <BadgeCheck size={16} className="text-darb-green" aria-label={t("Verified Purchase")} />}</div>
      <div className="mt-1 flex flex-wrap justify-between gap-2 text-xs text-darb-muted"><span>{language === "ar" && review.fragrance?.arabicName ? review.fragrance.arabicName : review.fragrance?.name || t("Darb fragrance")}</span>{date && <time dateTime={new Date(date).toISOString()}>{new Date(date).toLocaleDateString(language === "ar" ? "ar-EG" : "en-EG", { month: "short", year: "numeric" })}</time>}</div>
    </div>
  </article>;
}

export default function ReviewCarousel({ reviews, label = "Reviews" }) {
  const { isArabic, t } = useLanguage();
  const trackRef = useRef(null);
  const [position, setPosition] = useState({ index: 0, visible: 1 });

  const updateControls = useCallback(() => {
    const track = trackRef.current;
    if (!track?.children.length) return;
    const trackRect = track.getBoundingClientRect();
    const start = isArabic ? trackRect.right : trackRect.left;
    const children = Array.from(track.children);
    let closest = 0;
    let distance = Infinity;
    children.forEach((child, index) => {
      const rect = child.getBoundingClientRect();
      const nextDistance = Math.abs((isArabic ? rect.right : rect.left) - start);
      if (nextDistance < distance) { distance = nextDistance; closest = index; }
    });
    const width = children[0].getBoundingClientRect().width || track.clientWidth;
    setPosition({ index: closest, visible: Math.max(1, Math.floor(track.clientWidth / width)) });
  }, [isArabic]);

  useEffect(() => {
    updateControls();
    const track = trackRef.current;
    if (!track) return undefined;
    const observer = new ResizeObserver(updateControls);
    observer.observe(track);
    track.addEventListener("scroll", updateControls, { passive: true });
    return () => { observer.disconnect(); track.removeEventListener("scroll", updateControls); };
  }, [reviews.length, updateControls]);

  const moveLogical = (direction) => {
    const track = trackRef.current;
    if (!track) return;
    const target = Math.max(0, Math.min(reviews.length - 1, position.index + direction * position.visible));
    track.children[target]?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest", inline: "start" });
  };
  const canPrevious = position.index > 0;
  const canNext = position.index < reviews.length - position.visible;

  return <div className="relative">
    <div ref={trackRef} className="darb-horizontal-scroll flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3" aria-label={t(label)} tabIndex="0">
      {reviews.map((review, index) => <ReviewCard key={review._id || index} review={review} />)}
    </div>
    {reviews.length > 1 && <>
      <button type="button" onClick={() => moveLogical(isArabic ? 1 : -1)} disabled={isArabic ? !canNext : !canPrevious} className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full border border-darb-gold/40 bg-darb-cream/95 p-3 text-darb-green shadow-soft transition hover:bg-darb-surface md:block disabled:pointer-events-none disabled:opacity-25" aria-label={t(isArabic ? "Next reviews" : "Previous reviews")}><ArrowLeft size={18} /></button>
      <button type="button" onClick={() => moveLogical(isArabic ? -1 : 1)} disabled={isArabic ? !canPrevious : !canNext} className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full border border-darb-gold/40 bg-darb-cream/95 p-3 text-darb-green shadow-soft transition hover:bg-darb-surface md:block disabled:pointer-events-none disabled:opacity-25" aria-label={t(isArabic ? "Previous reviews" : "Next reviews")}><ArrowRight size={18} /></button>
    </>}
  </div>;
}
