import { ArrowLeft, Compass } from "lucide-react";
import { Link } from "react-router-dom";
import SEO from "../../components/common/SEO";
import { useLanguage } from "../../context/LanguageContext";

export default function NotFound() {
  const { isArabic, t } = useLanguage();
  return (
    <main className="grid min-h-[70vh] place-items-center bg-darb-cream px-5 py-16">
      <SEO title={t("Path not found | Darb Perfumes")} description={t("This path does not exist or is no longer available.")} robots="noindex, nofollow" />
      <section className="w-full max-w-2xl border-y border-darb-gold/30 py-14 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-darb-green text-darb-gold" aria-hidden="true"><Compass size={24} strokeWidth={1.5} /></span>
        <p className="mt-7 text-xs font-semibold uppercase tracking-[0.3em] text-darb-gold">404 · Darb</p>
        <h1 className="mt-3 font-display text-5xl text-darb-green sm:text-6xl">{t("This path ends here.")}</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-darb-muted">{t("The page you’re looking for does not exist or may have moved.")}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/shop" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-darb-green px-6 text-sm font-semibold text-darb-beige transition hover:bg-darb-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-darb-green">
            <ArrowLeft size={16} className={isArabic ? "rotate-180" : ""} aria-hidden="true" />{t("Back to Shop")}
          </Link>
          <Link to="/" className="inline-flex min-h-12 items-center rounded-full border border-darb-gold/40 px-6 text-sm font-semibold text-darb-green transition hover:bg-darb-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-darb-gold">{t("Home")}</Link>
        </div>
      </section>
    </main>
  );
}
