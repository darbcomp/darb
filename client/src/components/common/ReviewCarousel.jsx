import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BadgeCheck, Star } from "lucide-react";

function Stars({ rating }) {
  return (
    <div className="flex gap-1 text-darb-gold" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star key={index} size={16} fill={index < Number(rating) ? "currentColor" : "none"} aria-hidden="true" />
      ))}
    </div>
  );
}

export function ReviewCard({ review, compact = false }) {
  const date = review.reviewDate || review.createdAt;
  return (
    <article className={`flex shrink-0 snap-start flex-col overflow-hidden rounded-[1.5rem] border border-darb-gold/20 bg-darb-surface shadow-soft ${compact ? "w-[88%] p-5 sm:w-[48%] lg:w-[32%]" : "w-[84%] p-6 sm:w-[46%] lg:w-[calc(25%_-_0.9375rem)]"}`}>
      {review.media?.url && review.media.type === "image" && (
        <img src={review.media.url} alt={review.media.alt || `Review shared by ${review.displayName}`} loading="lazy" className="mb-5 aspect-[4/3] w-full rounded-2xl object-cover" />
      )}
      {review.media?.url && review.media.type === "video" && (
        <video controls preload="metadata" poster={review.media.posterUrl || undefined} className="mb-5 aspect-video w-full rounded-2xl bg-darb-green" aria-label={`Video review by ${review.displayName}`}>
          <source src={review.media.url} />
        </video>
      )}
      <Stars rating={review.rating} />
      <p className="mt-5 flex-1 text-sm leading-7 text-darb-black/80">{review.text}</p>
      <div className="mt-6 border-t border-darb-gold/20 pt-4">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-darb-green">{review.displayName}</p>
          {review.isVerifiedPurchase && <BadgeCheck size={16} className="text-darb-green" aria-label="Verified purchase" />}
        </div>
        <div className="mt-1 flex flex-wrap justify-between gap-2 text-xs text-darb-muted">
          <span>{review.fragrance?.name || "Darb fragrance"}</span>
          {date && <time dateTime={new Date(date).toISOString()}>{new Date(date).toLocaleDateString("en-EG", { month: "short", year: "numeric" })}</time>}
        </div>
      </div>
    </article>
  );
}

export default function ReviewCarousel({ reviews, label = "Reviews", compact = false }) {
  const trackRef = useRef(null);
  const [canBack, setCanBack] = useState(false);
  const [canForward, setCanForward] = useState(false);

  const updateControls = () => {
    const track = trackRef.current;
    if (!track) return;
    setCanBack(track.scrollLeft > 2);
    setCanForward(track.scrollLeft + track.clientWidth < track.scrollWidth - 2);
  };

  useEffect(() => {
    updateControls();
    const track = trackRef.current;
    if (!track) return undefined;
    const observer = new ResizeObserver(updateControls);
    observer.observe(track);
    track.addEventListener("scroll", updateControls, { passive: true });
    return () => {
      observer.disconnect();
      track.removeEventListener("scroll", updateControls);
    };
  }, [reviews.length]);

  const move = (direction) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * Math.max(track.clientWidth * 0.82, 300), behavior: "smooth" });
  };

  return (
    <div>
      <div ref={trackRef} className="darb-horizontal-scroll flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3" aria-label={label} tabIndex="0">
        {reviews.map((review, index) => <ReviewCard key={review._id || index} review={review} compact={compact} />)}
      </div>
      {reviews.length > 1 && (
        <div className="mt-5 hidden items-center justify-between md:flex">
          <button type="button" onClick={() => move(-1)} disabled={!canBack} className="rounded-full border border-darb-gold/35 p-3 text-darb-green transition hover:bg-darb-surface active:scale-95 disabled:cursor-not-allowed disabled:opacity-30" aria-label="Previous reviews"><ArrowLeft size={18} /></button>
          <button type="button" onClick={() => move(1)} disabled={!canForward} className="rounded-full border border-darb-gold/35 p-3 text-darb-green transition hover:bg-darb-surface active:scale-95 disabled:cursor-not-allowed disabled:opacity-30" aria-label="Next reviews"><ArrowRight size={18} /></button>
        </div>
      )}
    </div>
  );
}
