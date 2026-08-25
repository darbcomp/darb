import { Link } from "react-router-dom";

const categoryLinks = [
  { label: "Men", path: "/category/men" },
  { label: "Women", path: "/category/women" },
  { label: "Unisex", path: "/category/unisex" },
  { label: "Musk", path: "/category/musk" },
];

function Footer() {
  return (
    <footer className="bg-darb-green text-darb-beige">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-[1.4fr_0.8fr_0.8fr]">
          {/* Brand */}
          <div>
            <Link
              to="/"
              className="inline-flex"
              aria-label="Darb home"
            >
              <img
                src="/images/logo/beige.webp"
                alt="Darb"
                loading="lazy"
                className="h-20 w-auto object-contain sm:h-24"
              />
            </Link>

            <p className="mt-5 max-w-md text-sm leading-7 text-darb-beige/70">
              More than perfume — a journey, a memory, and a scent
              that walks with you.
            </p>

            <p className="mt-5 text-xs uppercase tracking-[0.24em] text-darb-gold">
              A scent for every path.
            </p>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-darb-gold">
              Explore
            </h3>

            <div className="mt-5 flex flex-col gap-3">
              <Link
                to="/shop"
                className="w-fit text-sm text-darb-beige/70 transition hover:text-darb-gold"
              >
                Shop All
              </Link>

              {categoryLinks.map((category) => (
                <Link
                  key={category.path}
                  to={category.path}
                  className="w-fit text-sm text-darb-beige/70 transition hover:text-darb-gold"
                >
                  {category.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Account */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-darb-gold">
              Darb
            </h3>

            <div className="mt-5 flex flex-col gap-3">
              <Link
                to="/cart"
                className="w-fit text-sm text-darb-beige/70 transition hover:text-darb-gold"
              >
                Cart
              </Link>

              <Link
                to="/account/orders"
                className="w-fit text-sm text-darb-beige/70 transition hover:text-darb-gold"
              >
                My Orders
              </Link>

              <Link
                to="/login"
                className="w-fit text-sm text-darb-beige/70 transition hover:text-darb-gold"
              >
                Account
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-darb-beige/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-center text-xs text-darb-beige/50 sm:flex-row sm:px-6 lg:px-8">
          <p>
            © {new Date().getFullYear()} Darb. All rights reserved.
          </p>

          <p>
            Built by{" "}
            <span className="font-semibold text-darb-gold">
              Web District
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;