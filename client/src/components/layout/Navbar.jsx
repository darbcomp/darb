import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import {
  LogOut,
  Menu,
  ShoppingBag,
  User,
  X,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";

const navLinks = [
  { label: "Shop", path: "/shop" },
  { label: "Men", path: "/category/men" },
  { label: "Women", path: "/category/women" },
  { label: "Unisex", path: "/category/unisex" },
  { label: "Musk", path: "/category/musk" },
];

function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { itemCount } = useCart();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    closeMobileMenu();
  };

  const desktopNavClass = ({ isActive }) =>
    `relative py-2 text-sm font-medium transition ${
      isActive
        ? "text-darb-green"
        : "text-darb-black/65 hover:text-darb-green"
    }`;

  const mobileNavClass = ({ isActive }) =>
    `block rounded-2xl px-4 py-3 text-sm font-semibold transition ${
      isActive
        ? "bg-darb-green text-darb-beige"
        : "text-darb-green hover:bg-darb-gold/15"
    }`;

  return (
    <header className="sticky top-0 z-50 border-b border-darb-gold/20 bg-darb-cream/95 backdrop-blur-md">
      <div className="mx-auto flex min-h-[76px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link
          to="/"
          onClick={closeMobileMenu}
          className="flex shrink-0 items-center"
          aria-label="Darb home"
        >
          <img
            src="/images/logo/green.webp"
            alt="Darb"
            className="h-11 w-auto object-contain sm:h-12"
          />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-7 md:flex">
          {navLinks.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              className={desktopNavClass}
            >
              {({ isActive }) => (
                <>
                  {link.label}

                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 h-px w-5 -translate-x-1/2 bg-darb-gold" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Right Side */}
        <div className="flex items-center gap-2 sm:gap-3">
          {isAuthenticated ? (
            <>
              <Link
                to={
                  user?.role === "admin"
                    ? "/admin"
                    : "/account/orders"
                }
                className="hidden text-sm font-semibold text-darb-green transition hover:text-darb-black sm:block"
              >
                {user?.role === "admin" ? "Admin" : "My Orders"}
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="hidden rounded-full border border-darb-gold/40 p-2.5 text-darb-green transition hover:border-darb-green hover:bg-darb-green hover:text-darb-beige sm:flex"
                aria-label="Logout"
              >
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="hidden rounded-full border border-darb-gold/40 p-2.5 text-darb-green transition hover:border-darb-green hover:bg-darb-green hover:text-darb-beige sm:flex"
              aria-label="Login"
            >
              <User size={18} />
            </Link>
          )}

          <Link
            to="/cart"
            onClick={closeMobileMenu}
            className="relative flex rounded-full bg-darb-green p-2.5 text-darb-beige transition hover:bg-darb-black"
            aria-label={`Cart with ${itemCount} item${itemCount === 1 ? "" : "s"}`}
          >
            <ShoppingBag size={18} />

            {itemCount > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-darb-gold px-1 text-[10px] font-bold text-darb-green">
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            )}
          </Link>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((current) => !current)}
            className="flex rounded-full border border-darb-gold/40 p-2.5 text-darb-green transition hover:bg-darb-gold/15 md:hidden"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="border-t border-darb-gold/20 bg-darb-cream md:hidden">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
            <nav className="space-y-1">
              {navLinks.map((link) => (
                <NavLink
                  key={link.path}
                  to={link.path}
                  onClick={closeMobileMenu}
                  className={mobileNavClass}
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>

            <div className="my-4 border-t border-darb-gold/20" />

            {isAuthenticated ? (
              <div className="grid gap-2">
                <Link
                  to={
                    user?.role === "admin"
                      ? "/admin"
                      : "/account/orders"
                  }
                  onClick={closeMobileMenu}
                  className="rounded-2xl border border-darb-gold/30 px-4 py-3 text-sm font-semibold text-darb-green"
                >
                  {user?.role === "admin"
                    ? "Admin Dashboard"
                    : "My Orders"}
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-2 rounded-2xl px-4 py-3 text-left text-sm font-semibold text-darb-muted transition hover:bg-darb-gold/10 hover:text-darb-green"
                >
                  <LogOut size={17} />
                  Logout
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                onClick={closeMobileMenu}
                className="flex items-center gap-2 rounded-2xl bg-darb-green px-4 py-3 text-sm font-semibold text-darb-beige"
              >
                <User size={17} />
                Login
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export default Navbar;