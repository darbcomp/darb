import { Link, NavLink } from "react-router-dom";
import { ShoppingBag, User } from "lucide-react";

const navLinks = [
  { label: "Shop", path: "/shop" },
  { label: "Men", path: "/category/men" },
  { label: "Women", path: "/category/women" },
  { label: "Unisex", path: "/category/unisex" },
  { label: "Musk", path: "/category/musk" },
];

function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-darb-gold/20 bg-darb-cream/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-darb-green text-lg font-bold text-darb-beige">
            د
          </div>
          <div>
            <p className="font-display text-2xl font-semibold tracking-wide text-darb-green">
              Darb
            </p>
            <p className="-mt-1 text-xs tracking-[0.25em] text-darb-muted">
              PERFUMES
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {navLinks.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) =>
                `text-sm font-medium transition ${
                  isActive
                    ? "text-darb-green"
                    : "text-darb-black/70 hover:text-darb-green"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            to="/account/orders"
            className="rounded-full border border-darb-gold/40 p-2 text-darb-green transition hover:bg-darb-gold/15"
            aria-label="My orders"
          >
            <User size={19} />
          </Link>
          <Link
            to="/cart"
            className="rounded-full bg-darb-green p-2 text-darb-beige transition hover:bg-darb-black"
            aria-label="Cart"
          >
            <ShoppingBag size={19} />
          </Link>
        </div>
      </div>
    </header>
  );
}

export default Navbar;