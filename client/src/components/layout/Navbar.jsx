import {
  useEffect,
  useRef,
  useState,
} from "react";
import { useQuery } from "@tanstack/react-query";

import {
  Link,
  NavLink,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  ChevronDown,
  LogOut,
  Menu,
  Search,
  ShoppingBag,
  User,
  X,
} from "lucide-react";

import {
  useAuth,
} from "../../context/AuthContext";

import { useCart } from "../../context/useCart";
import { useLanguage } from "../../context/LanguageContext";
import { useFeedback } from "../../context/FeedbackContext";
import { getSearchSuggestions } from "../../api/productApi";
import { trackMarketingEvent } from "../../utils/marketingEvents";


const categories = [
  {
    label: "Men",
    path: "/category/men",
  },
  {
    label: "Women",
    path: "/category/women",
  },
  {
    label: "Unisex",
    path: "/category/unisex",
  },
  {
    label: "Musk",
    path: "/category/musk",
  },
];

const adminSections = [
  [
    {
      label: "Dashboard",
      path: "/admin",
    },
  ],

  [
    {
      label: "Products",
      path: "/admin/products",
    },
    {
      label: "Categories",
      path: "/admin/categories",
    },
    {
      label: "Orders",
      path: "/admin/orders",
    },
    {
      label: "Customers",
      path: "/admin/customers",
    },
  ],

  [
    {
      label: "Offers",
      path: "/admin/offers",
    },
    {
      label: "Bundles",
      path: "/admin/bundles",
    },
    {
      label: "Coupons",
      path: "/admin/coupons",
    },
  ],

  [
    {
      label: "Waitlist",
      path: "/admin/waitlist",
    },
    {
      label: "Reviews",
      path: "/admin/reviews",
    },
    {
      label: "Analytics",
      path: "/admin/analytics",
    },
    {
      label: "Settings",
      path: "/admin/settings",
    },
  ],
];

function LanguageSwitch({ language, setLanguage, label }) {
  return <div className="inline-flex rounded-full border border-darb-gold/40 bg-darb-cream p-1 text-xs font-semibold shadow-sm" role="group" aria-label={label}>
    <button type="button" onClick={() => setLanguage("en")} aria-pressed={language === "en"} className={`rounded-full px-2.5 py-1.5 transition duration-200 ease-out active:scale-[0.97] motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-darb-gold ${language === "en" ? "bg-darb-green text-darb-beige shadow-sm" : "text-darb-green hover:bg-darb-gold/15"}`}>EN</button>
    <button type="button" onClick={() => setLanguage("ar")} aria-pressed={language === "ar"} className={`rounded-full px-2.5 py-1.5 transition duration-200 ease-out active:scale-[0.97] motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-darb-gold ${language === "ar" ? "bg-darb-green text-darb-beige shadow-sm" : "text-darb-green hover:bg-darb-gold/15"}`}>عربي</button>
  </div>;
}

function Navbar() {
  const {
    user,
    isAuthenticated,
    logout,
  } = useAuth();

  const {
    itemCount,
  } = useCart();

  const {
    language,
    setLanguage,
    t,
  } = useLanguage();
  const { confirm } = useFeedback();

  const location =
    useLocation();

  const navigate =
    useNavigate();

  const categoriesRef =
    useRef(null);

  const adminRef =
    useRef(null);

  const overlayTriggerRef =
    useRef(null);

  const [
    categoriesOpen,
    setCategoriesOpen,
  ] = useState(false);

  const [
    adminOpen,
    setAdminOpen,
  ] = useState(false);

  const [
    mobileCategoriesOpen,
    setMobileCategoriesOpen,
  ] = useState(false);

  const [
    mobileAdminOpen,
    setMobileAdminOpen,
  ] = useState(false);

  const [
    mobileMenuOpen,
    setMobileMenuOpen,
  ] = useState(false);

  const [
    searchOpen,
    setSearchOpen,
  ] = useState(false);

  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchTerm.trim()), 220);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  const searchQuery = useQuery({
    queryKey: ["search-suggestions", debouncedSearch],
    queryFn: () => getSearchSuggestions(debouncedSearch),
    enabled: searchOpen && debouncedSearch.length >= 2,
    staleTime: 30_000,
  });
  const searchResults = searchQuery.data?.data || { products: [], categories: [] };

  const isAdmin =
    isAuthenticated &&
    user?.role === "admin";

  const isCustomer =
    isAuthenticated &&
    user?.role !== "admin";

  const categoriesActive =
    location.pathname.startsWith(
      "/category/"
    );

  const adminActive =
    location.pathname.startsWith(
      "/admin"
    );

  /* =========================
     CLICK OUTSIDE
  ========================== */

  useEffect(() => {
    const handleClickOutside = (
      event
    ) => {
      if (
        categoriesRef.current &&
        !categoriesRef.current.contains(
          event.target
        )
      ) {
        setCategoriesOpen(
          false
        );
      }

      if (
        adminRef.current &&
        !adminRef.current.contains(
          event.target
        )
      ) {
        setAdminOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  /* =========================
     BODY LOCK
  ========================== */

  useEffect(() => {
    const shouldLock =
      mobileMenuOpen ||
      searchOpen;

    document.body.style.overflow =
      shouldLock
        ? "hidden"
        : "";

    return () => {
      document.body.style.overflow =
        "";
    };
  }, [
    mobileMenuOpen,
    searchOpen,
  ]);

  useEffect(() => {
    if (!searchOpen && !mobileMenuOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setSearchOpen(false);
        setMobileMenuOpen(false);
        setMobileCategoriesOpen(false);
        setMobileAdminOpen(false);
        window.requestAnimationFrame(() => overlayTriggerRef.current?.focus());
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileMenuOpen, searchOpen]);

  /* =========================
     HELPERS
  ========================== */

  const closeDesktopMenus =
    () => {
      setCategoriesOpen(false);
      setAdminOpen(false);
    };

  const closeMobileMenu =
    () => {
      setMobileMenuOpen(false);

      setMobileCategoriesOpen(
        false
      );

      setMobileAdminOpen(false);

      window.requestAnimationFrame(() => overlayTriggerRef.current?.focus());
    };

  const openMobileMenu =
    () => {
      overlayTriggerRef.current = document.activeElement;
      setSearchOpen(false);

      setMobileMenuOpen(true);
    };

  const openSearch = () => {
    overlayTriggerRef.current = document.activeElement;
    closeDesktopMenus();
    setMobileMenuOpen(false);
    setMobileCategoriesOpen(false);
    setMobileAdminOpen(false);

    setSearchOpen(true);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    window.requestAnimationFrame(() => overlayTriggerRef.current?.focus());
  };

  const handleSearchSubmit = (
    event
  ) => {
    event.preventDefault();

    const cleanSearch =
      searchTerm.trim();

    if (!cleanSearch) return;

    trackMarketingEvent("Search", { search_string: cleanSearch });

    closeSearch();

    navigate(
      `/shop?search=${encodeURIComponent(
        cleanSearch
      )}`
    );
  };

  const handleAdminLogout =
    async () => {
      const confirmed = await confirm({ title: "Log out?", body: "You’ll need to sign in again to continue.", confirmLabel: "Log out", variant: "destructive" });
      if (!confirmed) return;
      closeDesktopMenus();
      closeMobileMenu();

      await logout();

      navigate("/", {
        replace: true,
      });
    };

  const desktopNavClass = ({
    isActive,
  }) =>
    `relative flex h-full items-center py-3 text-sm font-medium transition-colors duration-200 after:absolute after:bottom-[19px] after:left-1/2 after:h-px after:w-5 after:-translate-x-1/2 after:bg-darb-gold after:transition-transform after:duration-200 after:content-[''] motion-reduce:after:transition-none ${
      isActive
        ? "text-darb-green after:scale-x-100"
        : "text-darb-black/65 after:scale-x-0 hover:text-darb-green hover:after:scale-x-50"
    }`;

  const mobileNavClass = ({
    isActive,
  }) =>
    `flex w-full items-center justify-between border-b border-darb-gold/15 py-4 text-[15px] font-semibold transition ${
      isActive
        ? "text-darb-green"
        : "text-darb-black/75 hover:text-darb-green"
    }`;

  return (
    <>
      <style>{`
        @keyframes darbAnnouncementMove {
          from {
            transform:
              translateY(-50%)
              translateX(100vw);
          }

          to {
            transform:
              translateY(-50%)
              translateX(-100%);
          }
        }

        .darb-announcement-motion {
          position: absolute;
          top: 50%;
          left: 0;
          width: max-content;
          white-space: nowrap;
          will-change: transform;
          animation:
            darbAnnouncementMove
            14s
            linear
            infinite;
        }

        .darb-nav-menu {
          opacity: 0;
          transform: translate(-50%, -0.35rem) scale(0.985);
          visibility: hidden;
          pointer-events: none;
          transition: opacity 180ms ease, transform 180ms ease, visibility 0s linear 180ms;
        }
        .darb-nav-menu[data-open="true"] {
          opacity: 1;
          transform: translate(-50%, 0) scale(1);
          visibility: visible;
          pointer-events: auto;
          transition-delay: 0s;
        }
        .darb-mobile-layer, .darb-search-layer { opacity: 0; pointer-events: none; transition: opacity 220ms ease; }
        .darb-mobile-layer[data-open="true"], .darb-search-layer[data-open="true"] { opacity: 1; pointer-events: auto; }
        .darb-mobile-drawer { transition: transform 240ms cubic-bezier(.22,.75,.25,1); }
        .darb-mobile-drawer[data-open="false"][data-side="left"] { transform: translateX(-100%); }
        .darb-mobile-drawer[data-open="false"][data-side="right"] { transform: translateX(100%); }
        .darb-mobile-drawer[data-open="true"] { transform: translateX(0); }
        .darb-search-panel { opacity: 0; transform: translateY(-0.5rem) scale(.985); transition: opacity 200ms ease, transform 200ms ease; }
        .darb-search-layer[data-open="true"] .darb-search-panel { opacity: 1; transform: translateY(0) scale(1); }

        .darb-dropdown-scroll {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .darb-dropdown-scroll::-webkit-scrollbar {
          display: none;
        }

        @media (
          prefers-reduced-motion:
          reduce
        ) {
          .darb-announcement-motion {
            left: 50%;
            transform:
              translate(
                -50%,
                -50%
              );
            animation: none;
          }

          .darb-nav-menu, .darb-mobile-layer, .darb-mobile-drawer, .darb-search-layer, .darb-search-panel { transition: none; }
        }
      `}</style>

      {/* =========================
          HEADER
      ========================== */}

      <header className="sticky top-0 z-50 bg-darb-cream">
        {/* Announcement */}

        <div
          className="relative h-[29px] overflow-hidden bg-darb-green"
          aria-label={t("Announcement")}
        >
          <p className="darb-announcement-motion text-[10px] font-semibold uppercase tracking-[0.32em] text-darb-gold sm:text-[11px]">
            {t("A SCENT FOR EVERY PATH")}
          </p>
        </div>

        {/* =========================
            DESKTOP NAVBAR
        ========================== */}

        <div className="hidden border-b border-darb-gold/20 bg-darb-cream/95 backdrop-blur-md md:block">
          <div className="mx-auto grid min-h-[76px] max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-8 px-6 lg:px-8">
            {/* Logo */}

            <Link
              to="/"
              onClick={
                closeDesktopMenus
              }
              className="justify-self-start"
              aria-label={t("Darb home")}
            >
              <img
                src="/images/logo/green.webp"
                alt="Darb"
                className="h-12 w-auto object-contain"
              />
            </Link>

            {/* =========================
                CENTER NAVIGATION
            ========================== */}

            <nav className="flex h-full items-center gap-8">
              {/* Home */}

              <NavLink
                to="/"
                end
                onClick={
                  closeDesktopMenus
                }
                className={
                  desktopNavClass
                }
              >
                {() => (
                  <>
                    {t("Home")}

                  </>
                )}
              </NavLink>

              {/* Shop */}

              <NavLink
                to="/shop"
                onClick={
                  closeDesktopMenus
                }
                className={
                  desktopNavClass
                }
              >
                {() => (
                  <>
                    {t("Shop")}

                  </>
                )}
              </NavLink>

              {/* =========================
                  CATEGORIES
              ========================== */}

              <div
                ref={
                  categoriesRef
                }
                className="relative flex h-full items-center"
              >
                <button
                  type="button"
                  onClick={() => {
                    setAdminOpen(
                      false
                    );

                    setCategoriesOpen(
                      (current) =>
                        !current
                    );
                  }}
                  className={`relative flex h-full items-center gap-1.5 py-3 text-sm font-medium transition-colors ${
                    categoriesActive
                      ? "text-darb-green"
                      : "text-darb-black/65 hover:text-darb-green"
                  }`}
                  aria-haspopup="menu"
                  aria-expanded={
                    categoriesOpen
                  }
                >
                  {t("Categories")}

                  <ChevronDown
                    size={15}
                    strokeWidth={
                      1.8
                    }
                    className={`transition-transform duration-200 ${
                      categoriesOpen
                        ? "rotate-180"
                        : ""
                    }`}
                  />

                  <span className={`absolute bottom-[19px] left-1/2 h-px w-5 -translate-x-1/2 bg-darb-gold transition-transform duration-200 motion-reduce:transition-none ${categoriesActive ? "scale-x-100" : "scale-x-0"}`} />
                </button>

                  <div
                    data-open={categoriesOpen}
                    aria-hidden={!categoriesOpen}
                    className="darb-nav-menu absolute left-1/2 top-[66px] w-52 overflow-hidden rounded-2xl border border-darb-gold/20 bg-darb-cream p-2 shadow-xl"
                    role="menu"
                  >
                    {categories.map(
                      (
                        category
                      ) => (
                        <NavLink
                          key={
                            category.path
                          }
                          to={
                            category.path
                          }
                          tabIndex={categoriesOpen ? undefined : -1}
                          onClick={
                            closeDesktopMenus
                          }
                          className={({
                            isActive,
                          }) =>
                            `block rounded-xl px-4 py-3 text-sm font-medium transition ${
                              isActive
                                ? "bg-darb-green text-darb-beige"
                                : "text-darb-black/70 hover:bg-darb-gold/10 hover:text-darb-green"
                            }`
                          }
                        >
                          {
                                    t(category.label)
                          }
                        </NavLink>
                      )
                    )}
                  </div>
              </div>

              {/* =========================
                  ADMIN
              ========================== */}

              {isAdmin ? (
                <div
                  ref={adminRef}
                  className="relative flex h-full items-center"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setCategoriesOpen(
                        false
                      );

                      setAdminOpen(
                        (current) =>
                          !current
                      );
                    }}
                    className={`relative flex h-full items-center gap-1.5 py-3 text-sm font-medium transition-colors ${
                      adminActive
                        ? "text-darb-green"
                        : "text-darb-black/65 hover:text-darb-green"
                    }`}
                    aria-haspopup="menu"
                    aria-expanded={
                      adminOpen
                    }
                  >
                    Admin

                    <ChevronDown
                      size={15}
                      strokeWidth={
                        1.8
                      }
                      className={`transition-transform duration-200 ${
                        adminOpen
                          ? "rotate-180"
                          : ""
                      }`}
                    />

                    <span className={`absolute bottom-[19px] left-1/2 h-px w-5 -translate-x-1/2 bg-darb-gold transition-transform duration-200 motion-reduce:transition-none ${adminActive ? "scale-x-100" : "scale-x-0"}`} />
                  </button>

                    <div
                      data-open={adminOpen}
                      aria-hidden={!adminOpen}
                      className="
                        darb-dropdown-scroll
                        darb-nav-menu
                        absolute
                        left-1/2
                        top-[66px]
                        max-h-[72vh]
                        w-60
                        overflow-y-auto
                        rounded-[1.4rem]
                        border
                        border-darb-gold/20
                        bg-darb-cream
                        p-2
                        shadow-2xl
                      "
                      role="menu"
                    >
                      {adminSections.map(
                        (
                          section,
                          sectionIndex
                        ) => (
                          <div
                            key={
                              sectionIndex
                            }
                            className={
                              sectionIndex >
                              0
                                ? "mt-1 border-t border-darb-gold/15 pt-1"
                                : ""
                            }
                          >
                            {section.map(
                              (
                                item
                              ) => (
                                <NavLink
                                  key={
                                    item.path
                                  }
                                  to={
                                    item.path
                                  }
                                  end={
                                    item.path ===
                                    "/admin"
                                  }
                                  tabIndex={adminOpen ? undefined : -1}
                                  onClick={
                                    closeDesktopMenus
                                  }
                                  className={({
                                    isActive,
                                  }) =>
                                    `block rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                                      isActive
                                        ? "bg-darb-green text-darb-beige"
                                        : "text-darb-black/70 hover:bg-darb-gold/10 hover:text-darb-green"
                                    }`
                                  }
                                >
                                  {
                                    item.label
                                  }
                                </NavLink>
                              )
                            )}
                          </div>
                        )
                      )}
                    </div>
                </div>
              ) : (
                /* Guest / Customer */

                <NavLink
                  to={
                    isCustomer
                      ? "/account/orders"
                      : "/track-order"
                  }
                  onClick={
                    closeDesktopMenus
                  }
                  className={
                    desktopNavClass
                  }
                >
                  {() => (
                    <>
                      {t(isCustomer ? "My Orders" : "Track Order")}

                    </>
                  )}
                </NavLink>
              )}
            </nav>

            {/* =========================
                RIGHT SIDE
            ========================== */}

            <div className="flex items-center justify-self-end gap-2">
              {!isAdmin && (
                <LanguageSwitch language={language} setLanguage={setLanguage} label={t("Choose language")} />
              )}

              {/* Search */}

              <button
                type="button"
                onClick={
                  openSearch
                }
                className="flex h-10 w-10 items-center justify-center rounded-full text-darb-green transition hover:bg-darb-gold/10"
                aria-label={t("Search Darb")}
              >
                <Search
                  size={19}
                  strokeWidth={
                    1.8
                  }
                />
              </button>

              {/* Admin Logout */}

              {isAdmin ? (
                <button
                  type="button"
                  onClick={
                    handleAdminLogout
                  }
                  className="inline-flex min-h-10 items-center gap-2 rounded-full border border-darb-gold/35 px-4 text-sm font-semibold text-darb-green transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 focus-visible:border-red-300 focus-visible:bg-red-50 focus-visible:text-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                >
                  <LogOut
                    size={15}
                    strokeWidth={
                      1.8
                    }
                  />

                  Logout
                </button>
              ) : isCustomer ? (
                /* Customer Account */

                <Link
                  to="/account"
                  onClick={
                    closeDesktopMenus
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-darb-gold/35 text-darb-green transition hover:border-darb-green hover:bg-darb-green hover:text-darb-beige"
                  aria-label={t("Account")}
                >
                  <User
                    size={18}
                    strokeWidth={
                      1.8
                    }
                  />
                </Link>
              ) : (
                /* Guest Sign In */

                <Link
                  to="/login"
                  onClick={
                    closeDesktopMenus
                  }
                  className="px-3 py-2 text-sm font-semibold text-darb-green transition hover:text-darb-black"
                >
                  {t("Sign In")}
                </Link>
              )}

              {/* Cart */}

              <Link
                to="/cart"
                data-cart-target
                onClick={
                  closeDesktopMenus
                }
                className="relative flex h-10 w-10 items-center justify-center rounded-full bg-darb-green text-darb-beige transition hover:bg-darb-black"
                aria-label={t(`Cart with ${itemCount} item${
                  itemCount === 1
                    ? ""
                    : "s"
                }`)}
              >
                <ShoppingBag
                  size={18}
                  strokeWidth={
                    1.8
                  }
                />

                {itemCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-[19px] min-w-[19px] items-center justify-center rounded-full bg-darb-gold px-1 text-[9px] font-bold text-darb-green">
                    {itemCount >
                    99
                      ? "99+"
                      : itemCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>

        {/* =========================
            MOBILE NAVBAR
        ========================== */}

        <div className="border-b border-darb-gold/20 bg-darb-cream md:hidden">
          <div className="grid min-h-[72px] grid-cols-[1fr_auto_1fr] items-center px-4">
            {/* Left */}

            <div className="flex items-center gap-1 justify-self-start">
              <button
                type="button"
                onClick={
                  openMobileMenu
                }
                className="flex h-10 w-10 items-center justify-center rounded-full text-darb-green transition active:bg-darb-gold/10"
                aria-label={t("Open menu")}
              >
                <Menu
                  size={23}
                  strokeWidth={
                    1.7
                  }
                />
              </button>

              <button
                type="button"
                onClick={
                  openSearch
                }
                className="flex h-10 w-10 items-center justify-center rounded-full text-darb-green transition active:bg-darb-gold/10"
                aria-label={t("Search Darb")}
              >
                <Search
                  size={21}
                  strokeWidth={
                    1.7
                  }
                />
              </button>
            </div>

            {/* Logo */}

            <Link
              to="/"
              onClick={
                closeMobileMenu
              }
              className="justify-self-center"
              aria-label={t("Darb home")}
            >
              <img
                src="/images/logo/green.webp"
                alt="Darb"
                className="h-11 w-auto object-contain"
              />
            </Link>

            {/* Cart */}

            <Link
              to="/cart"
              data-cart-target
              onClick={
                closeMobileMenu
              }
              className="relative flex h-11 w-11 items-center justify-center justify-self-end rounded-full bg-darb-green text-darb-beige transition active:bg-darb-black"
              aria-label={t(`Cart with ${itemCount} item${
                itemCount === 1
                  ? ""
                  : "s"
              }`)}
            >
              <ShoppingBag
                size={20}
                strokeWidth={
                  1.7
                }
              />

              {itemCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-[19px] min-w-[19px] items-center justify-center rounded-full bg-darb-gold px-1 text-[9px] font-bold text-darb-green">
                  {itemCount >
                  99
                    ? "99+"
                    : itemCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* =========================
          MOBILE DRAWER
      ========================== */}

        {mobileMenuOpen && <div data-open="true" className="darb-mobile-layer fixed inset-0 z-[80] md:hidden">
          <button
            type="button"
            aria-label={t("Close menu")}
            onClick={
              closeMobileMenu
            }
            className="absolute inset-0 bg-darb-black/45 backdrop-blur-[1px]"
          />

          <aside data-open={mobileMenuOpen} data-side={language === "ar" ? "right" : "left"} className={`darb-mobile-drawer absolute top-0 flex h-full w-[86%] max-w-[350px] flex-col bg-darb-cream shadow-2xl ${language === "ar" ? "right-0" : "left-0"}`}>
            {/* Header */}

            <div className="flex items-center justify-between border-b border-darb-gold/20 px-6 py-5">
              <img
                src="/images/logo/green.webp"
                alt="Darb"
                className="h-11 w-auto object-contain"
              />

              <button
                type="button"
                onClick={
                  closeMobileMenu
                }
                className="flex h-10 w-10 items-center justify-center rounded-full border border-darb-gold/30 text-darb-green"
                aria-label={t("Close menu")}
              >
                <X
                  size={20}
                  strokeWidth={
                    1.7
                  }
                />
              </button>
            </div>

            {/* Drawer Content */}

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <nav>
                {/* Home */}

                <NavLink
                  to="/"
                  end
                  onClick={
                    closeMobileMenu
                  }
                  className={
                    mobileNavClass
                  }
                >
                  {t("Home")}
                </NavLink>

                {/* Shop */}

                <NavLink
                  to="/shop"
                  onClick={
                    closeMobileMenu
                  }
                  className={
                    mobileNavClass
                  }
                >
                  {t("Shop")}
                </NavLink>

                {/* =========================
                    CATEGORIES
                ========================== */}

                <div className="border-b border-darb-gold/15">
                  <button
                    type="button"
                    onClick={() =>
                      setMobileCategoriesOpen(
                        (
                          current
                        ) =>
                          !current
                      )
                    }
                    className={`flex w-full items-center justify-between py-4 text-[15px] font-semibold transition ${
                      categoriesActive
                        ? "text-darb-green"
                        : "text-darb-black/75"
                    }`}
                  >
                    {t("Categories")}

                    <ChevronDown
                      size={18}
                      strokeWidth={
                        1.7
                      }
                      className={`transition-transform duration-200 ${
                        mobileCategoriesOpen
                          ? "rotate-180"
                          : ""
                      }`}
                    />
                  </button>

                  {mobileCategoriesOpen && (
                    <div className="pb-4 pl-4">
                      {categories.map(
                        (
                          category
                        ) => (
                          <NavLink
                            key={
                              category.path
                            }
                            to={
                              category.path
                            }
                            onClick={
                              closeMobileMenu
                            }
                            className={({
                              isActive,
                            }) =>
                              `block border-l px-4 py-2.5 text-sm transition ${
                                isActive
                                  ? "border-darb-green font-semibold text-darb-green"
                                  : "border-darb-gold/30 text-darb-muted hover:text-darb-green"
                              }`
                            }
                          >
                            {
                              t(category.label)
                            }
                          </NavLink>
                        )
                      )}
                    </div>
                  )}
                </div>

                {/* =========================
                    ADMIN MOBILE
                ========================== */}

                {isAdmin ? (
                  <div className="border-b border-darb-gold/15">
                    <button
                      type="button"
                      onClick={() =>
                        setMobileAdminOpen(
                          (
                            current
                          ) =>
                            !current
                        )
                      }
                      className={`flex w-full items-center justify-between py-4 text-[15px] font-semibold transition ${
                        adminActive
                          ? "text-darb-green"
                          : "text-darb-black/75"
                      }`}
                    >
                      Admin

                      <ChevronDown
                        size={18}
                        strokeWidth={
                          1.7
                        }
                        className={`transition-transform duration-200 ${
                          mobileAdminOpen
                            ? "rotate-180"
                            : ""
                        }`}
                      />
                    </button>

                    {mobileAdminOpen && (
                      <div className="pb-4 pl-4">
                        {adminSections
                          .flat()
                          .map(
                            (
                              item
                            ) => (
                              <NavLink
                                key={
                                  item.path
                                }
                                to={
                                  item.path
                                }
                                end={
                                  item.path ===
                                  "/admin"
                                }
                                onClick={
                                  closeMobileMenu
                                }
                                className={({
                                  isActive,
                                }) =>
                                  `block border-l px-4 py-2.5 text-sm transition ${
                                    isActive
                                      ? "border-darb-green font-semibold text-darb-green"
                                      : "border-darb-gold/30 text-darb-muted hover:text-darb-green"
                                  }`
                                }
                              >
                                {
                                  item.label
                                }
                              </NavLink>
                            )
                          )}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Guest / Customer */

                  <NavLink
                    to={
                      isCustomer
                        ? "/account/orders"
                        : "/track-order"
                    }
                    onClick={
                      closeMobileMenu
                    }
                    className={
                      mobileNavClass
                    }
                  >
                    {t(isCustomer ? "My Orders" : "Track Order")}
                  </NavLink>
                )}
              </nav>

              {!isAdmin && (
                <div className="mt-7 flex items-center justify-between border-y border-darb-gold/15 py-4">
                  <span className="text-sm font-semibold text-darb-green">
                    {t("Language")}
                  </span>
                  <LanguageSwitch language={language} setLanguage={setLanguage} label={t("Choose language")} />
                </div>
              )}

              {/* =========================
                  MOBILE ROLE ACTION
              ========================== */}

              <div className="mt-8">
                {isAdmin ? (
                  <button
                    type="button"
                    onClick={
                      handleAdminLogout
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-full border border-darb-gold/35 px-5 py-3.5 text-sm font-semibold text-darb-green transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 focus-visible:border-red-300 focus-visible:bg-red-50 focus-visible:text-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                  >
                    <LogOut
                      size={17}
                      strokeWidth={
                        1.7
                      }
                    />

                    Log Out
                  </button>
                ) : isCustomer ? (
                  <Link
                    to="/account"
                    onClick={
                      closeMobileMenu
                    }
                    className="flex items-center gap-3 rounded-full bg-darb-green px-5 py-3.5 text-sm font-semibold text-darb-beige"
                  >
                    <User
                      size={18}
                      strokeWidth={
                        1.7
                      }
                    />

                    {t("Account")}
                  </Link>
                ) : (
                  <Link
                    to="/login"
                    onClick={
                      closeMobileMenu
                    }
                    className="flex items-center justify-center rounded-full bg-darb-green px-5 py-3.5 text-sm font-semibold text-darb-beige"
                  >
                    {t("Sign In")}
                  </Link>
                )}
              </div>
            </div>

            {/* Drawer Footer */}

            <div className="border-t border-darb-gold/20 px-6 py-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-darb-gold">
                {t("A SCENT FOR EVERY PATH")}
              </p>
            </div>
          </aside>
        </div>}

      {/* =========================
          SEARCH OVERLAY
      ========================== */}

        {searchOpen && <div data-open="true" className="darb-search-layer fixed inset-0 z-[90] flex items-start justify-center bg-darb-black/50 px-4 pt-20 backdrop-blur-sm sm:pt-28">
          <button
            type="button"
            aria-label={t("Close search")}
            onClick={
              closeSearch
            }
            className="absolute inset-0"
          />

          <div className="darb-search-panel relative z-10 w-full max-w-2xl overflow-hidden rounded-[2rem] bg-darb-cream shadow-2xl">
            {/* Search Header */}

            <div className="flex items-center justify-between border-b border-darb-gold/20 px-6 py-5 sm:px-8">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-darb-gold">
                  {t("Find your path")}
                </p>

                <h2 className="mt-1 font-display text-2xl text-darb-green">
                  {t("Search Darb")}
                </h2>
              </div>

              <button
                type="button"
                onClick={
                  closeSearch
                }
                className="flex h-10 w-10 items-center justify-center rounded-full border border-darb-gold/30 text-darb-green transition hover:bg-darb-gold/10"
                aria-label={t("Close search")}
              >
                <X
                  size={19}
                  strokeWidth={
                    1.7
                  }
                />
              </button>
            </div>

            {/* Search Form */}

            <form
              onSubmit={
                handleSearchSubmit
              }
              className="p-6 sm:p-8"
            >
              <div className="relative">
                <Search
                  size={20}
                  strokeWidth={
                    1.7
                  }
                  className="absolute left-5 top-1/2 -translate-y-1/2 text-darb-green"
                />

                <input
                  autoFocus
                  value={
                    searchTerm
                  }
                  onChange={(
                    event
                  ) =>
                    setSearchTerm(
                      event.target
                        .value
                    )
                  }
                  placeholder={t("Search fragrances...")}
                  className="w-full rounded-full border border-darb-gold/35 bg-white py-4 pl-14 pr-5 text-darb-black outline-none transition placeholder:text-darb-muted/70 focus:border-darb-green"
                />
              </div>

              {debouncedSearch.length >= 2 && (
                <div className="mt-3 max-h-[42vh] overflow-y-auto rounded-3xl border border-darb-gold/20 bg-white p-2" aria-live="polite">
                  {searchQuery.isFetching && <p className="px-4 py-3 text-sm text-darb-muted">{t("Searching...")}</p>}
                  {!searchQuery.isFetching && searchResults.products.length === 0 && searchResults.categories.length === 0 && (
                    <p className="px-4 py-3 text-sm text-darb-muted">{t("No matching paths found.")}</p>
                  )}
                  {searchResults.categories.map((category) => (
                    <Link key={category._id} to={`/category/${category.slug}`} onClick={closeSearch} className="block rounded-2xl px-4 py-3 text-sm font-semibold text-darb-green hover:bg-darb-cream">
                      {t("Category")} · {language === "ar" && category.arabicName ? category.arabicName : category.name}
                    </Link>
                  ))}
                  {searchResults.products.map((product) => (
                    <Link key={product._id} to={`/product/${product.slug}`} onClick={closeSearch} className="flex items-center gap-3 rounded-2xl px-3 py-2 hover:bg-darb-cream">
                      {product.images?.[0]?.url && <img src={product.images[0].url} alt="" className="h-12 w-12 rounded-xl object-cover" />}
                      <span><span className="block text-sm font-semibold text-darb-green">{language === "ar" && product.arabicName ? product.arabicName : product.name}</span><span className="line-clamp-1 text-xs text-darb-muted">{language === "ar" ? product.arabicShortDescription || product.category?.arabicName || product.shortDescription || product.category?.name : product.shortDescription || product.category?.name}</span></span>
                    </Link>
                  ))}
                  {(searchResults.products.length > 0 || searchResults.categories.length > 0) && (
                    <button type="submit" className="mt-1 w-full rounded-2xl px-4 py-3 text-start text-sm font-semibold text-darb-green hover:bg-darb-cream">{t(`View all results for “${debouncedSearch}”`)}</button>
                  )}
                </div>
              )}

              <button
                type="submit"
                className="mt-4 w-full rounded-full bg-darb-green px-6 py-4 text-sm font-semibold text-darb-beige transition hover:bg-darb-black"
              >
                {t("Search")}
              </button>

              <div className="mt-7 border-t border-darb-gold/20 pt-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-darb-gold">
                  {t("Browse categories")}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {categories.map(
                    (
                      category
                    ) => (
                      <Link
                        key={
                          category.path
                        }
                        to={
                          category.path
                        }
                        onClick={
                          closeSearch
                        }
                        className="rounded-full border border-darb-gold/30 px-4 py-2 text-sm font-medium text-darb-green transition hover:border-darb-green hover:bg-darb-green hover:text-darb-beige"
                      >
                        {
                          t(category.label)
                        }
                      </Link>
                    )
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>}
    </>
  );
}

export default Navbar;
