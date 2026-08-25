import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

const supportLinks = [
  {
    label: "Contact",
    to: "/contact",
  },
  {
    label: "Shipping & Delivery",
    to: "/shipping-delivery",
  },
  {
    label: "Returns & Exchanges",
    to: "/returns-exchanges",
  },
];

const legalLinks = [
  {
    label: "Privacy Policy",
    to: "/privacy-policy",
  },
  {
    label: "Terms & Conditions",
    to: "/terms-conditions",
  },
];

function FooterLink({
  to,
  children,
}) {
  return (
    <Link
      to={to}
      className="
        group inline-flex
        items-center gap-1.5
        text-sm
        text-darb-beige/65
        transition
        duration-300
        hover:text-darb-gold
      "
    >
      <span>{children}</span>

      <ArrowUpRight
        size={13}
        strokeWidth={1.7}
        className="
          opacity-0
          transition
          duration-300
          group-hover:-translate-y-0.5
          group-hover:translate-x-0.5
          group-hover:opacity-100
        "
      />
    </Link>
  );
}

function Footer() {
  const year =
    new Date().getFullYear();

  return (
    <footer className="bg-darb-green text-darb-beige">
      {/* =========================
          MAIN FOOTER
      ========================== */}

      <div
        className="
          mx-auto
          max-w-7xl
          px-5
          pb-12
          pt-14

          sm:px-6
          sm:pb-14
          sm:pt-16

          lg:px-8
          lg:pb-16
          lg:pt-20
        "
      >
        <div
          className="
            grid
            gap-12

            md:grid-cols-2

            lg:grid-cols-[1.7fr_0.8fr_0.8fr]
            lg:gap-16
          "
        >
          {/* =========================
              BRAND
          ========================== */}

          <div>
            <Link
              to="/"
              className="inline-flex"
              aria-label="Darb home"
            >
              <img
                src="/images/logo/beige.webp"
                alt="Darb"
                className="
                  h-16
                  w-auto
                  object-contain

                  sm:h-[72px]
                "
              />
            </Link>

            <p
              className="
                mt-6
                max-w-[420px]
                font-display
                text-2xl
                leading-[1.35]
                text-darb-beige

                sm:text-[1.7rem]
              "
            >
              More than perfume —
              a journey, a memory
              in every step.
            </p>

            <p
              className="
                mt-4
                max-w-[390px]
                text-sm
                leading-7
                text-darb-beige/55
              "
            >
              Scents created to
              walk beside the
              moments that become
              part of your story.
            </p>
          </div>

          {/* =========================
              CUSTOMER CARE
          ========================== */}

          <div className="lg:pt-3">
            <p
              className="
                text-[10px]
                font-semibold
                uppercase
                tracking-[0.3em]
                text-darb-gold
              "
            >
              Customer Care
            </p>

            <nav className="mt-5 flex flex-col items-start gap-3.5">
              {supportLinks.map(
                (link) => (
                  <FooterLink
                    key={link.to}
                    to={link.to}
                  >
                    {link.label}
                  </FooterLink>
                )
              )}
            </nav>
          </div>

          {/* =========================
              LEGAL
          ========================== */}

          <div className="lg:pt-3">
            <p
              className="
                text-[10px]
                font-semibold
                uppercase
                tracking-[0.3em]
                text-darb-gold
              "
            >
              Darb
            </p>

            <nav className="mt-5 flex flex-col items-start gap-3.5">
              {legalLinks.map(
                (link) => (
                  <FooterLink
                    key={link.to}
                    to={link.to}
                  >
                    {link.label}
                  </FooterLink>
                )
              )}
            </nav>
          </div>
        </div>
      </div>

      {/* =========================
          BOTTOM BAR
      ========================== */}

      <div className="border-t border-darb-beige/10">
        <div
          className="
            mx-auto
            flex
            max-w-7xl
            flex-col
            gap-3
            px-5
            py-5
            text-[10px]
            uppercase
            tracking-[0.12em]
            text-darb-beige/40

            sm:px-6

            md:flex-row
            md:items-center
            md:justify-between

            lg:px-8
          "
        >
          <p>
            © {year} Darb Perfumes.
            All rights reserved.
          </p>

          <p>
            A scent for every path
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;