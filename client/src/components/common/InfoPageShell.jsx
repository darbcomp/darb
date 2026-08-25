import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

function InfoPageShell({
  eyebrow,
  title,
  intro,
  children,
}) {
  return (
    <main className="bg-darb-cream">
      {/* Header */}
      <section className="bg-darb-green text-darb-beige">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-darb-beige/55 transition hover:text-darb-gold"
          >
            <ArrowLeft size={15} />

            Back to Darb
          </Link>

          <div className="mt-12 max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.34em] text-darb-gold">
              {eyebrow}
            </p>

            <h1 className="mt-4 font-display text-5xl leading-[1.02] sm:text-6xl lg:text-7xl">
              {title}
            </h1>

            {intro && (
              <p className="mt-6 max-w-2xl text-base leading-8 text-darb-beige/65 sm:text-lg">
                {intro}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="mx-auto max-w-5xl px-5 py-14 sm:px-6 sm:py-18 lg:px-8 lg:py-20">
        {children}
      </section>
    </main>
  );
}

export default InfoPageShell;