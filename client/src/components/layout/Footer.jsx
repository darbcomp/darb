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

function SocialBrandIcon({ brand }) {
  const icons = {
    instagram: {
      size: 22,
      viewBox: "0 32 448 448",
      path: "M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z",
    },
    tiktok: {
      size: 21,
      viewBox: "0 0 448 512",
      path: "M448 209.91a210.06 210.06 0 0 1-122.77-39.25v178.72A162.55 162.55 0 1 1 185 188.31v89.89a74.62 74.62 0 1 0 52.23 71.18V0h88a121.18 121.18 0 0 0 1.86 22.17A122.18 122.18 0 0 0 381 102.39a121.43 121.43 0 0 0 67 20.14Z",
    },
    whatsapp: {
      size: 21.5,
      viewBox: "0 32 448 448",
      path: "M380.9 97.1C339 55.1 283.2 32 223.9 32 101.5 32 1.9 131.6 1.9 254c0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1C346.2 476.1 448 376.5 448 254.1c0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z",
    },
  };
  const icon = icons[brand];

  return (
    <svg
      viewBox={icon.viewBox}
      fill="currentColor"
      aria-hidden="true"
      className="block shrink-0"
      style={{ width: icon.size, height: icon.size }}
    >
      <path d={icon.path} />
    </svg>
  );
}

const socialLinks = [
  { brand: "instagram", label: "Instagram", href: "https://www.instagram.com/darb1.0" },
  { brand: "tiktok", label: "TikTok", href: "https://www.tiktok.com/@darb1.0" },
  { brand: "whatsapp", label: "WhatsApp", href: "https://wa.me/201099589674" },
];

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

            lg:grid-cols-[1.7fr_0.8fr_0.8fr_0.8fr]
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

          <div className="lg:pt-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-darb-gold">SOCIALS</p>
            <nav className="mt-5 flex items-center gap-2" aria-label="Darb social links">
              {socialLinks.map((social) => (
                <a
                  key={social.brand}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  title={social.label}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-darb-beige transition duration-200 hover:-translate-y-0.5 hover:bg-darb-gold/10 hover:text-darb-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-darb-gold"
                >
                  <span className="flex h-[25px] w-[25px] items-center justify-center"><SocialBrandIcon brand={social.brand} /></span>
                  <span className="sr-only">{social.label}</span>
                </a>
              ))}
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
