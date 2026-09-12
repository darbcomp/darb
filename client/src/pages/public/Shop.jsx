import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useQuery,
} from "@tanstack/react-query";

import {
  useSearchParams,
} from "react-router-dom";

import {
  Check,
  ChevronDown,
  SlidersHorizontal,
  X,
} from "lucide-react";

import {
  getProducts,
} from "../../api/productApi";

import CatalogPagination from "../../components/common/CatalogPagination";
import ProductCard from "../../components/product/ProductCard";
import { useLanguage } from "../../context/LanguageContext";

const PRICE_MIN = 0;
const PRICE_MAX = 3000;
const PRICE_GAP = 1;
const PRODUCTS_PER_PAGE = 12;

const availabilityOptions = [
  {
    label: "In stock",
    value: "in",
  },
  {
    label: "Out of stock",
    value: "out",
  },
];

const productTypes = [
  {
    label: "Men",
    value: "men",
  },
  {
    label: "Women",
    value: "women",
  },
  {
    label: "Unisex",
    value: "unisex",
  },
  {
    label: "Musk",
    value: "musk",
  },
];

const sortOptions = [
  {
    label: "Featured",
    value: "featured",
  },
  {
    label: "Best Sellers",
    value: "best_selling",
  },
  {
    label: "Newest",
    value: "newest",
  },
  {
    label: "Price, low to high",
    value: "price_low",
  },
  {
    label: "Price, high to low",
    value: "price_high",
  },
  {
    label: "Name, A–Z",
    value: "name_az",
  },
  {
    label: "Name, Z–A",
    value: "name_za",
  },
];

const clampPrice = (
  value
) =>
  Math.max(
    PRICE_MIN,
    Math.min(
      PRICE_MAX,
      value
    )
  );

const formatPrice = (
  value
) =>
  new Intl.NumberFormat(
    "en-EG",
    {
      maximumFractionDigits: 0,
    }
  ).format(
    Number(value) || 0
  );

const readUrlPrice = (
  value,
  fallback
) => {
  if (
    value === null ||
    value === ""
  ) {
    return fallback;
  }

  const number =
    Number(value);

  if (
    !Number.isFinite(number)
  ) {
    return fallback;
  }

  return clampPrice(
    number
  );
};

const readUrlPage = (value) => {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : 1;
};

function Shop() {
  const { t } = useLanguage();
  const [
    searchParams,
    setSearchParams,
  ] = useSearchParams();

  const sortRef =
    useRef(null);

  const resultsRef =
    useRef(null);

  const lastPriceEditedRef =
    useRef(null);

  /* =========================
     URL STATE
  ========================== */

  const search =
    searchParams.get(
      "search"
    ) || "";

  const categoryParam =
    searchParams.get(
      "category"
    ) || "";

  const availabilityParam =
    searchParams.get(
      "availability"
    ) || "";

  const minPriceParam =
    searchParams.get(
      "minPrice"
    );

  const maxPriceParam =
    searchParams.get(
      "maxPrice"
    );

  const sort =
    searchParams.get(
      "sort"
    ) ||
    "featured";

  const pageParam =
    searchParams.get(
      "page"
    );

  const page = readUrlPage(
    pageParam
  );

  const activeCategories =
    useMemo(
      () =>
        categoryParam
          .split(",")
          .map((value) =>
            value.trim()
          )
          .filter(Boolean),
      [categoryParam]
    );

  const activeAvailability =
    useMemo(
      () =>
        availabilityParam
          .split(",")
          .map((value) =>
            value.trim()
          )
          .filter(Boolean),
      [availabilityParam]
    );

  const activeMinPrice =
    readUrlPrice(
      minPriceParam,
      PRICE_MIN
    );

  const activeMaxPrice =
    readUrlPrice(
      maxPriceParam,
      PRICE_MAX
    );

  /* =========================
     GENERAL UI
  ========================== */

  const [
    filterOpen,
    setFilterOpen,
  ] = useState(false);

  const [
    mobileSortOpen,
    setMobileSortOpen,
  ] = useState(false);

  const [
    desktopSortOpen,
    setDesktopSortOpen,
  ] = useState(false);

  /*
    null
    availability
    price
    productType
  */
  const [
    openFilterSection,
    setOpenFilterSection,
  ] = useState(null);

  /* =========================
     FILTER DRAFT
  ========================== */

  const [
    draftAvailability,
    setDraftAvailability,
  ] = useState(
    activeAvailability
  );

  const [
    draftCategories,
    setDraftCategories,
  ] = useState(
    activeCategories
  );

  const [
    draftMinPrice,
    setDraftMinPrice,
  ] = useState(
    activeMinPrice
  );

  const [
    draftMaxPrice,
    setDraftMaxPrice,
  ] = useState(
    activeMaxPrice
  );

  /*
    These are strings on purpose.

    This lets the customer delete
    everything inside an input and
    type naturally without React
    immediately forcing a number
    back into the box.
  */

  const [
    draftMinInput,
    setDraftMinInput,
  ] = useState(
    String(
      activeMinPrice
    )
  );

  const [
    draftMaxInput,
    setDraftMaxInput,
  ] = useState(
    String(
      activeMaxPrice
    )
  );

  /* =========================
     BODY LOCK
  ========================== */

  useEffect(() => {
    const shouldLock =
      filterOpen ||
      mobileSortOpen;

    document.body.style.overflow =
      shouldLock
        ? "hidden"
        : "";

    return () => {
      document.body.style.overflow =
        "";
    };
  }, [
    filterOpen,
    mobileSortOpen,
  ]);

  /* =========================
     DESKTOP SORT
  ========================== */

  useEffect(() => {
    const handleClickOutside = (
      event
    ) => {
      if (
        sortRef.current &&
        !sortRef.current.contains(
          event.target
        )
      ) {
        setDesktopSortOpen(
          false
        );
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
     PRODUCT QUERY
  ========================== */

  const productParams =
    useMemo(() => {
      const params = {
        page,
        limit: PRODUCTS_PER_PAGE,
        sort,
      };

      /*
        Search still comes from the
        navbar if the customer used it.
      */

      if (
        search.trim()
      ) {
        params.search =
          search.trim();
      }

      if (
        activeCategories.length >
        0
      ) {
        params.category =
          activeCategories.join(
            ","
          );
      }

      if (
        activeAvailability.length ===
        1
      ) {
        params.availability =
          activeAvailability[0];
      }

      if (
        activeMinPrice >
        PRICE_MIN
      ) {
        params.minPrice =
          activeMinPrice;
      }

      if (
        activeMaxPrice <
        PRICE_MAX
      ) {
        params.maxPrice =
          activeMaxPrice;
      }

      return params;
    }, [
      activeAvailability,
      activeCategories,
      activeMaxPrice,
      activeMinPrice,
      page,
      search,
      sort,
    ]);

  const productsQuery =
    useQuery({
      queryKey: [
        "products",
        productParams,
      ],

      queryFn: () =>
        getProducts(
          productParams
        ),

      retry: 1,
    });

  const products =
    productsQuery.data
      ?.data || [];

  const totalProducts =
    productsQuery.data
      ?.pagination?.total ??
    products.length;

  const paginationPage =
    Number(
      productsQuery.data
        ?.pagination?.page
    ) || page;

  const totalPages = Math.max(
    Number(
      productsQuery.data
        ?.pagination?.pages
    ) || 0,
    0
  );

  const normalizedPage =
    totalPages > 0
      ? Math.min(page, totalPages)
      : 1;

  const isNormalizingPage = Boolean(
    productsQuery.data &&
      page !== normalizedPage
  );

  useEffect(() => {
    if (
      pageParam === null ||
      page !== 1
    ) {
      return;
    }

    const next =
      new URLSearchParams(
        searchParams
      );
    next.delete("page");
    setSearchParams(next, {
      replace: true,
    });
  }, [
    page,
    pageParam,
    searchParams,
    setSearchParams,
  ]);

  useEffect(() => {
    if (
      !productsQuery.data ||
      page === normalizedPage
    ) {
      return;
    }

    const next =
      new URLSearchParams(
        searchParams
      );

    if (normalizedPage <= 1) {
      next.delete("page");
    } else {
      next.set(
        "page",
        String(normalizedPage)
      );
    }

    setSearchParams(next, {
      replace: true,
    });
  }, [
    normalizedPage,
    page,
    productsQuery.data,
    searchParams,
    setSearchParams,
  ]);

  /* =========================
     FILTER COUNT
  ========================== */

  const priceFiltered =
    activeMinPrice >
      PRICE_MIN ||
    activeMaxPrice <
      PRICE_MAX;

  const activeFilterCount =
    Number(
      activeAvailability.length ===
        1
    ) +
    Number(
      priceFiltered
    ) +
    Number(
      activeCategories.length >
        0
    );

  /* =========================
     OPEN FILTER DRAWER
  ========================== */

  const openFilters = () => {
    setMobileSortOpen(
      false
    );

    setDesktopSortOpen(
      false
    );

    setDraftAvailability(
      activeAvailability
    );

    setDraftCategories(
      activeCategories
    );

    setDraftMinPrice(
      activeMinPrice
    );

    setDraftMaxPrice(
      activeMaxPrice
    );

    setDraftMinInput(
      String(
        activeMinPrice
      )
    );

    setDraftMaxInput(
      String(
        activeMaxPrice
      )
    );

    lastPriceEditedRef.current =
      null;

    /*
      Artsy-style:
      all sections begin collapsed.
    */

    setOpenFilterSection(
      null
    );

    setFilterOpen(true);
  };

  /* =========================
     ACCORDION
  ========================== */

  const toggleFilterSection = (
    section
  ) => {
    setOpenFilterSection(
      (current) =>
        current === section
          ? null
          : section
    );
  };

  /* =========================
     CHECKBOXES
  ========================== */

  const toggleAvailability = (
    value
  ) => {
    setDraftAvailability(
      (current) =>
        current.includes(
          value
        )
          ? current.filter(
              (item) =>
                item !==
                value
            )
          : [
              ...current,
              value,
            ]
    );
  };

  const toggleCategory = (
    value
  ) => {
    setDraftCategories(
      (current) =>
        current.includes(
          value
        )
          ? current.filter(
              (item) =>
                item !==
                value
            )
          : [
              ...current,
              value,
            ]
    );
  };

  /* =========================
     PRICE NORMALIZATION
  ========================== */

  const normalizePriceDrafts =
    () => {
      /*
        If the input is empty when
        the customer stops typing,
        restore the previous slider
        value instead of forcing
        something during typing.
      */

      let nextMin =
        draftMinInput.trim() ===
        ""
          ? draftMinPrice
          : Number(
              draftMinInput
            );

      let nextMax =
        draftMaxInput.trim() ===
        ""
          ? draftMaxPrice
          : Number(
              draftMaxInput
            );

      if (
        !Number.isFinite(
          nextMin
        )
      ) {
        nextMin =
          draftMinPrice;
      }

      if (
        !Number.isFinite(
          nextMax
        )
      ) {
        nextMax =
          draftMaxPrice;
      }

      nextMin =
        Math.round(
          clampPrice(
            nextMin
          )
        );

      nextMax =
        Math.round(
          clampPrice(
            nextMax
          )
        );

      /*
        Artsy-style collision logic.

        Example:
        Min = 1052
        customer types Max = 1

        After blur / View Results:
        Max becomes 1053.
      */

      if (
        nextMin >=
        nextMax
      ) {
        if (
          lastPriceEditedRef.current ===
          "max"
        ) {
          if (
            nextMin >=
            PRICE_MAX
          ) {
            nextMin =
              PRICE_MAX -
              PRICE_GAP;

            nextMax =
              PRICE_MAX;
          } else {
            nextMax =
              nextMin +
              PRICE_GAP;
          }
        } else {
          if (
            nextMax <=
            PRICE_MIN
          ) {
            nextMin =
              PRICE_MIN;

            nextMax =
              PRICE_MIN +
              PRICE_GAP;
          } else {
            nextMin =
              nextMax -
              PRICE_GAP;
          }
        }
      }

      nextMin =
        clampPrice(
          nextMin
        );

      nextMax =
        clampPrice(
          nextMax
        );

      setDraftMinPrice(
        nextMin
      );

      setDraftMaxPrice(
        nextMax
      );

      setDraftMinInput(
        String(nextMin)
      );

      setDraftMaxInput(
        String(nextMax)
      );

      return {
        min: nextMin,
        max: nextMax,
      };
    };

  /* =========================
     PRICE TEXT INPUTS
  ========================== */

  const handleMinInputChange = (
    event
  ) => {
    const value =
      event.target.value;

    /*
      Empty is allowed.
      Digits only otherwise.
    */

    if (
      value === "" ||
      /^\d+$/.test(value)
    ) {
      lastPriceEditedRef.current =
        "min";

      setDraftMinInput(
        value
      );
    }
  };

  const handleMaxInputChange = (
    event
  ) => {
    const value =
      event.target.value;

    if (
      value === "" ||
      /^\d+$/.test(value)
    ) {
      lastPriceEditedRef.current =
        "max";

      setDraftMaxInput(
        value
      );
    }
  };

  const handleMinInputBlur =
    () => {
      lastPriceEditedRef.current =
        "min";

      normalizePriceDrafts();
    };

  const handleMaxInputBlur =
    () => {
      lastPriceEditedRef.current =
        "max";

      normalizePriceDrafts();
    };

  /* =========================
     PRICE SLIDERS
  ========================== */

  const handleMinRange = (
    event
  ) => {
    lastPriceEditedRef.current =
      "min";

    const value =
      Number(
        event.target.value
      );

    const nextValue =
      Math.min(
        value,
        draftMaxPrice -
          PRICE_GAP
      );

    setDraftMinPrice(
      nextValue
    );

    setDraftMinInput(
      String(
        nextValue
      )
    );
  };

  const handleMaxRange = (
    event
  ) => {
    lastPriceEditedRef.current =
      "max";

    const value =
      Number(
        event.target.value
      );

    const nextValue =
      Math.max(
        value,
        draftMinPrice +
          PRICE_GAP
      );

    setDraftMaxPrice(
      nextValue
    );

    setDraftMaxInput(
      String(
        nextValue
      )
    );
  };

  const minPercent =
    ((draftMinPrice -
      PRICE_MIN) /
      (PRICE_MAX -
        PRICE_MIN)) *
    100;

  const maxPercent =
    ((draftMaxPrice -
      PRICE_MIN) /
      (PRICE_MAX -
        PRICE_MIN)) *
    100;

  /* =========================
     APPLY FILTERS
  ========================== */

  const applyFilters = () => {
    /*
      Important:
      normalize first so pressing
      VIEW RESULTS acts exactly like
      leaving the price input.
    */

    const normalized =
      normalizePriceDrafts();

    const next =
      new URLSearchParams(
        searchParams
      );

    /*
      Selecting both availability
      options means no availability
      restriction.
    */

    if (
      draftAvailability.length ===
      1
    ) {
      next.set(
        "availability",
        draftAvailability[0]
      );
    } else {
      next.delete(
        "availability"
      );
    }

    if (
      draftCategories.length >
      0
    ) {
      next.set(
        "category",
        draftCategories.join(
          ","
        )
      );
    } else {
      next.delete(
        "category"
      );
    }

    if (
      normalized.min >
      PRICE_MIN
    ) {
      next.set(
        "minPrice",
        String(
          normalized.min
        )
      );
    } else {
      next.delete(
        "minPrice"
      );
    }

    if (
      normalized.max <
      PRICE_MAX
    ) {
      next.set(
        "maxPrice",
        String(
          normalized.max
        )
      );
    } else {
      next.delete(
        "maxPrice"
      );
    }

    next.delete("page");

    setSearchParams(
      next,
      {
        replace: true,
      }
    );

    setFilterOpen(false);
  };

  /* =========================
     CLEAR DRAFT
  ========================== */

  const clearFilterDraft =
    () => {
      setDraftAvailability(
        []
      );

      setDraftCategories(
        []
      );

      setDraftMinPrice(
        PRICE_MIN
      );

      setDraftMaxPrice(
        PRICE_MAX
      );

      setDraftMinInput(
        String(
          PRICE_MIN
        )
      );

      setDraftMaxInput(
        String(
          PRICE_MAX
        )
      );

      lastPriceEditedRef.current =
        null;
    };

  /* =========================
     CLEAR APPLIED
  ========================== */

  const clearAppliedFilters =
    () => {
      const next =
        new URLSearchParams(
          searchParams
        );

      next.delete(
        "availability"
      );

      next.delete(
        "category"
      );

      next.delete(
        "minPrice"
      );

      next.delete(
        "maxPrice"
      );

      next.delete("page");

      setSearchParams(
        next,
        {
          replace: true,
        }
      );
    };

  const clearSearch = () => {
    const next =
      new URLSearchParams(
        searchParams
      );

    next.delete(
      "search"
    );

    next.delete("page");

    setSearchParams(
      next,
      {
        replace: true,
      }
    );
  };

  /* =========================
     SORT
  ========================== */

  const handleSort = (
    value
  ) => {
    const next =
      new URLSearchParams(
        searchParams
      );

    if (
      value ===
      "featured"
    ) {
      next.delete(
        "sort"
      );
    } else {
      next.set(
        "sort",
        value
      );
    }

    next.delete("page");

    setSearchParams(
      next,
      {
        replace: true,
      }
    );

    setDesktopSortOpen(
      false
    );

    setMobileSortOpen(
      false
    );
  };

  const selectedSort =
    sortOptions.find(
      (option) =>
        option.value ===
        sort
    ) ||
    sortOptions[0];

  /* =========================
     REMOVE CHIPS
  ========================== */

  const removeCategory = (
    value
  ) => {
    const remaining =
      activeCategories.filter(
        (item) =>
          item !== value
      );

    const next =
      new URLSearchParams(
        searchParams
      );

    if (
      remaining.length >
      0
    ) {
      next.set(
        "category",
        remaining.join(",")
      );
    } else {
      next.delete(
        "category"
      );
    }

    next.delete("page");

    setSearchParams(
      next,
      {
        replace: true,
      }
    );
  };

  const removeAvailability =
    () => {
      const next =
        new URLSearchParams(
          searchParams
        );

      next.delete(
        "availability"
      );

      next.delete("page");

      setSearchParams(
        next,
        {
          replace: true,
        }
      );
    };

  const removePrice = () => {
    const next =
      new URLSearchParams(
        searchParams
      );

    next.delete(
      "minPrice"
    );

    next.delete(
      "maxPrice"
    );

    next.delete("page");

    setSearchParams(
      next,
      {
        replace: true,
      }
    );
  };

  const handlePageChange = (
    nextPage
  ) => {
    if (
      productsQuery.isFetching ||
      nextPage < 1 ||
      nextPage > totalPages
    ) {
      return;
    }

    const next =
      new URLSearchParams(
        searchParams
      );

    if (nextPage === 1) {
      next.delete("page");
    } else {
      next.set(
        "page",
        String(nextPage)
      );
    }

    setSearchParams(next);

    resultsRef.current?.scrollIntoView({
      behavior: window.matchMedia?.(
        "(prefers-reduced-motion: reduce)"
      ).matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  };

  return (
    <>
      <style>{`
        .darb-range {
          pointer-events: none;
          position: absolute;
          left: 0;
          top: 50%;
          width: 100%;
          height: 26px;
          transform: translateY(-50%);
          appearance: none;
          background: transparent;
          outline: none;
        }

        .darb-range::-webkit-slider-runnable-track {
          height: 4px;
          background: transparent;
        }

        .darb-range::-webkit-slider-thumb {
          width: 22px;
          height: 22px;
          margin-top: -9px;
          border: 4px solid #F7F1E6;
          border-radius: 9999px;
          background: #0F3D2E;
          box-shadow:
            0 0 0 1px #0F3D2E;
          appearance: none;
          cursor: grab;
          pointer-events: auto;
        }

        .darb-range::-webkit-slider-thumb:active {
          cursor: grabbing;
        }

        .darb-range::-moz-range-track {
          height: 4px;
          background: transparent;
        }

        .darb-range::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border: 4px solid #F7F1E6;
          border-radius: 9999px;
          background: #0F3D2E;
          box-shadow:
            0 0 0 1px #0F3D2E;
          cursor: grab;
          pointer-events: auto;
        }

        @keyframes darbFilterDrawer {
          from {
            transform: translateX(-100%);
          }

          to {
            transform: translateX(0);
          }
        }

        .darb-filter-drawer {
          animation:
            darbFilterDrawer
            260ms
            ease-out
            forwards;
        }

        @keyframes darbBottomSheet {
          from {
            transform: translateY(100%);
          }

          to {
            transform: translateY(0);
          }
        }

        .darb-bottom-sheet {
          animation:
            darbBottomSheet
            260ms
            ease-out
            forwards;
        }
      `}</style>

      <main className="min-h-[70vh] bg-darb-cream">
        {/* =========================
            FILTER / SORT BAR
        ========================== */}

        <section className="border-b border-darb-gold/20 bg-darb-cream">
          {/* Mobile */}

          <div className="grid grid-cols-2 md:hidden">
            <button
              type="button"
              onClick={
                openFilters
              }
              className="relative flex min-h-[68px] items-center justify-center gap-3 border-r border-darb-gold/20 text-[15px] font-semibold text-darb-black"
            >
              <SlidersHorizontal
                size={20}
                strokeWidth={
                  1.7
                }
              />

              {t("Filters")}

              {activeFilterCount >
                0 && (
                <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-darb-green px-1.5 text-[10px] font-bold text-darb-beige">
                  {
                    activeFilterCount
                  }
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setFilterOpen(
                  false
                );

                setMobileSortOpen(
                  true
                );
              }}
              className="flex min-h-[68px] items-center justify-center gap-3 text-[15px] font-semibold text-darb-black"
            >
              {t("Sort by")}

              <ChevronDown
                size={19}
                strokeWidth={
                  1.7
                }
              />
            </button>
          </div>

          {/* Desktop */}

          <div className="mx-auto hidden max-w-7xl grid-cols-[220px_1fr_240px] items-center px-6 md:grid lg:px-8">
            <button
              type="button"
              onClick={
                openFilters
              }
              className="flex min-h-[72px] items-center gap-3 border-r border-darb-gold/20 text-sm font-semibold text-darb-black"
            >
              <SlidersHorizontal
                size={19}
                strokeWidth={
                  1.7
                }
              />

              {t("Filters")}

              {activeFilterCount >
                0 && (
                <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-darb-green px-1.5 text-[10px] font-bold text-darb-beige">
                  {
                    activeFilterCount
                  }
                </span>
              )}
            </button>

            <div className="text-center text-sm text-darb-muted">
              {t(String(totalProducts) + ` fragrance${totalProducts === 1 ? "" : "s"}`)}
            </div>

            <div
              ref={sortRef}
              className="relative border-l border-darb-gold/20"
            >
              <button
                type="button"
                onClick={() =>
                  setDesktopSortOpen(
                    (current) =>
                      !current
                  )
                }
                className="flex min-h-[72px] w-full items-center justify-end gap-3 text-sm font-semibold text-darb-black"
              >
                {t("Sort by")}

                <ChevronDown
                  size={18}
                  strokeWidth={
                    1.7
                  }
                  className={`transition ${
                    desktopSortOpen
                      ? "rotate-180"
                      : ""
                  }`}
                />
              </button>

              {desktopSortOpen && (
                <div className="absolute right-0 top-[64px] z-40 w-64 overflow-hidden rounded-[1.3rem] border border-darb-gold/20 bg-darb-cream p-2 shadow-2xl">
                  {sortOptions.map(
                    (
                      option
                    ) => (
                      <button
                        key={
                          option.value
                        }
                        type="button"
                        onClick={() =>
                          handleSort(
                            option.value
                          )
                        }
                        className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-start text-sm transition ${
                          sort ===
                          option.value
                            ? "bg-darb-green text-darb-beige"
                            : "text-darb-black hover:bg-darb-gold/10"
                        }`}
                      >
                        {
                          t(option.label)
                        }

                        {sort ===
                          option.value && (
                          <Check
                            size={
                              16
                            }
                          />
                        )}
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* =========================
            PRODUCT AREA
        ========================== */}

        <section ref={resultsRef} className="mx-auto max-w-7xl scroll-mt-4 px-5 py-9 sm:px-6 lg:px-8 lg:py-12">
          {/* Mobile Count */}

          <p className="text-center text-sm text-darb-black md:hidden">
            {t(String(totalProducts) + ` fragrance${totalProducts === 1 ? "" : "s"}`)}
          </p>

          {/* Active Chips */}

          {(search ||
            activeFilterCount >
              0) && (
            <div className="mt-6 flex flex-wrap gap-2 md:mb-8 md:mt-0">
              {search && (
                <button
                  type="button"
                  onClick={
                    clearSearch
                  }
                  className="inline-flex items-center gap-2 bg-darb-gold/15 px-4 py-3 text-sm text-darb-green"
                >
                  {t("Search: “" + search + "”")}

                  <X
                    size={15}
                  />
                </button>
              )}

              {activeAvailability.length ===
                1 && (
                <button
                  type="button"
                  onClick={
                    removeAvailability
                  }
                  className="inline-flex items-center gap-2 bg-darb-gold/15 px-4 py-3 text-sm text-darb-green"
                >
                  {activeAvailability[0] ===
                  "in"
                    ? t("In stock")
                    : t("Out of stock")}

                  <X
                    size={15}
                  />
                </button>
              )}

              {priceFiltered && (
                <button
                  type="button"
                  onClick={
                    removePrice
                  }
                  className="inline-flex items-center gap-2 bg-darb-gold/15 px-4 py-3 text-sm text-darb-green"
                >
                  EGP{" "}
                  {formatPrice(
                    activeMinPrice
                  )}{" "}
                  – EGP{" "}
                  {formatPrice(
                    activeMaxPrice
                  )}

                  <X
                    size={15}
                  />
                </button>
              )}

              {activeCategories.map(
                (value) => {
                  const item =
                    productTypes.find(
                      (type) =>
                        type.value ===
                        value
                    );

                  return (
                    <button
                      key={
                        value
                      }
                      type="button"
                      onClick={() =>
                        removeCategory(
                          value
                        )
                      }
                      className="inline-flex items-center gap-2 bg-darb-gold/15 px-4 py-3 text-sm text-darb-green"
                    >
                        {t(item?.label || value)}

                      <X
                        size={
                          15
                        }
                      />
                    </button>
                  );
                }
              )}

              {activeFilterCount >
                0 && (
                <button
                  type="button"
                  onClick={
                    clearAppliedFilters
                  }
                  className="px-2 text-xs font-semibold text-darb-muted underline underline-offset-4 hover:text-darb-green"
                >
                  {t("Clear filters")}
                </button>
              )}
            </div>
          )}

          <div className="mt-5 text-center text-[11px] text-darb-muted md:hidden">
            {t("Sorted by")}{" "}
            <span className="font-semibold text-darb-green">
              {
                t(selectedSort.label)
              }
            </span>
          </div>

          {/* Loading */}

          {(productsQuery.isLoading || isNormalizingPage) && (
            <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
              {Array.from({
                length: 8,
              }).map(
                (_, index) => (
                  <div
                    key={index}
                    className="aspect-[3/5] animate-pulse rounded-[1.5rem] bg-white"
                  />
                )
              )}
            </div>
          )}

          {/* Error */}

          {productsQuery.isError && (
            <div className="mt-10 rounded-[2rem] border border-darb-gold/20 bg-white px-6 py-14 text-center shadow-soft">
              <h2 className="font-display text-3xl text-darb-green">
                {t("The collection couldn't load.")}
              </h2>

              <p className="mt-3 text-sm text-darb-muted">
                {t("Please try again shortly.")}
              </p>
            </div>
          )}

          {/* Products */}

          {!productsQuery.isLoading &&
            !isNormalizingPage &&
            !productsQuery.isError &&
            products.length >
              0 && (
              <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
                {products.map(
                  (
                    product
                  ) => (
                    <ProductCard
                      key={
                        product._id ||
                        product.slug
                      }
                      product={
                        product
                      }
                    />
                  )
                )}
              </div>
            )}

          {!productsQuery.isLoading &&
            !isNormalizingPage &&
            !productsQuery.isError &&
            products.length > 0 && (
              <CatalogPagination
                page={paginationPage}
                pages={totalPages}
                isPending={productsQuery.isFetching}
                onPageChange={handlePageChange}
              />
            )}

          {/* Empty */}

          {!productsQuery.isLoading &&
            !isNormalizingPage &&
            !productsQuery.isError &&
            products.length ===
              0 && (
              <div className="mt-10 rounded-[2rem] border border-darb-gold/20 bg-white px-6 py-16 text-center shadow-soft">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-darb-gold">
                  {t("No Match")}
                </p>

                <h2 className="mt-3 font-display text-3xl text-darb-green">
                  {t("No fragrances match these filters.")}
                </h2>

                <button
                  type="button"
                  onClick={
                    clearAppliedFilters
                  }
                  className="mt-7 rounded-full bg-darb-green px-7 py-3.5 text-sm font-semibold text-darb-beige"
                >
                  {t("Clear Filters")}
                </button>
              </div>
            )}
        </section>
      </main>

      {/* =========================
          FILTER DRAWER
      ========================== */}

      {filterOpen && (
        <div className="fixed inset-0 z-[100]">
          <button
            type="button"
            aria-label={t("Close filters")}
            onClick={() =>
              setFilterOpen(
                false
              )
            }
            className="absolute inset-0 bg-darb-black/45 backdrop-blur-[1px]"
          />

          <aside className="darb-filter-drawer absolute left-0 top-0 flex h-full w-[90%] max-w-[470px] flex-col bg-darb-cream shadow-2xl">
            {/* Header */}

            <div className="flex min-h-[82px] items-center justify-between border-b border-darb-gold/20 px-6">
              <div className="flex items-center gap-4">
                <h2 className="font-display text-2xl text-darb-black">
                  {t("Filters")}
                </h2>

                {activeFilterCount >
                  0 && (
                  <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-darb-green px-2 text-xs font-bold text-darb-beige">
                    {
                      activeFilterCount
                    }
                  </span>
                )}

                <button
                  type="button"
                  onClick={
                    clearFilterDraft
                  }
                  className="text-sm text-darb-muted underline underline-offset-4"
                >
                  {t("Clear all")}
                </button>
              </div>

              <button
                type="button"
                onClick={() =>
                  setFilterOpen(
                    false
                  )
                }
                className="flex h-11 w-11 items-center justify-center text-darb-black"
                aria-label={t("Close filters")}
              >
                <X
                  size={26}
                  strokeWidth={
                    1.5
                  }
                />
              </button>
            </div>

            {/* Sections */}

            <div className="flex-1 overflow-x-hidden overflow-y-auto px-6">
              {/* =========================
                  AVAILABILITY
              ========================== */}

              <section className="border-b border-darb-gold/20">
                <button
                  type="button"
                  onClick={() =>
                    toggleFilterSection(
                      "availability"
                    )
                  }
                  className="flex w-full items-center justify-between py-7 text-start"
                >
                  <h3 className="font-display text-2xl text-darb-green">
                    {t("Availability")}
                  </h3>

                  <ChevronDown
                    size={21}
                    strokeWidth={
                      1.8
                    }
                    className={`transition-transform duration-200 ${
                      openFilterSection ===
                      "availability"
                        ? "rotate-180"
                        : ""
                    }`}
                  />
                </button>

                {openFilterSection ===
                  "availability" && (
                  <div className="space-y-5 pb-8">
                    {availabilityOptions.map(
                      (
                        option
                      ) => {
                        const checked =
                          draftAvailability.includes(
                            option.value
                          );

                        return (
                          <label
                            key={
                              option.value
                            }
                            className="flex cursor-pointer items-center gap-4 text-base text-darb-black"
                          >
                            <input
                              type="checkbox"
                              checked={
                                checked
                              }
                              onChange={() =>
                                toggleAvailability(
                                  option.value
                                )
                              }
                              className="h-5 w-5 accent-darb-green"
                            />

                            {
                              t(option.label)
                            }
                          </label>
                        );
                      }
                    )}
                  </div>
                )}
              </section>

              {/* =========================
                  PRICE
              ========================== */}

              <section className="border-b border-darb-gold/20">
                <button
                  type="button"
                  onClick={() =>
                    toggleFilterSection(
                      "price"
                    )
                  }
                  className="flex w-full items-center justify-between gap-4 py-7 text-start"
                >
                  <h3 className="font-display text-2xl text-darb-green">
                    {t("Price")}
                  </h3>

                  <div className="flex items-center gap-4">
                    <p className="text-sm text-darb-muted">
                      EGP{" "}
                      {formatPrice(
                        draftMinPrice
                      )}{" "}
                      – EGP{" "}
                      {formatPrice(
                        draftMaxPrice
                      )}
                    </p>

                    <ChevronDown
                      size={21}
                      strokeWidth={
                        1.8
                      }
                      className={`transition-transform duration-200 ${
                        openFilterSection ===
                        "price"
                          ? "rotate-180"
                          : ""
                      }`}
                    />
                  </div>
                </button>

                {openFilterSection ===
                  "price" && (
                  <div className="pb-8">
                    {/* Slider */}

                    <div className="relative mt-2 h-8">
                      <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-darb-gold/25" />

                      <div
                        className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-darb-green"
                        style={{
                          left: `${minPercent}%`,
                          right: `${
                            100 -
                            maxPercent
                          }%`,
                        }}
                      />

                      <input
                        type="range"
                        min={
                          PRICE_MIN
                        }
                        max={
                          PRICE_MAX
                        }
                        step="1"
                        value={
                          draftMinPrice
                        }
                        onChange={
                          handleMinRange
                        }
                        className="darb-range z-20"
                        aria-label={t("Minimum price")}
                      />

                      <input
                        type="range"
                        min={
                          PRICE_MIN
                        }
                        max={
                          PRICE_MAX
                        }
                        step="1"
                        value={
                          draftMaxPrice
                        }
                        onChange={
                          handleMaxRange
                        }
                        className="darb-range z-30"
                        aria-label={t("Maximum price")}
                      />
                    </div>

                    {/* Inputs */}

                    <div className="mt-5 flex w-full items-center justify-between gap-3">
                      {/* Minimum */}

                      <div className="w-[135px] min-w-0 border border-darb-gold/25 bg-white px-4 py-3">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-darb-muted">
                          {t("Min")}
                        </p>

                        <div className="mt-1 flex min-w-0 items-center gap-2">
                          <span className="shrink-0 text-xs text-darb-muted">
                            EGP
                          </span>

                          <input
                            type="text"
                            inputMode="numeric"
                            value={draftMinInput}
                            onChange={handleMinInputChange}
                            onBlur={handleMinInputBlur}
                            className="w-full min-w-0 bg-transparent text-end text-sm outline-none"
                          />
                        </div>
                      </div>

                      <span className="shrink-0 text-sm text-darb-muted">
                        {t("to")}
                      </span>

                      {/* Maximum */}

                      <div className="w-[135px] min-w-0 border border-darb-gold/25 bg-white px-4 py-3">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-darb-muted">
                          {t("Max")}
                        </p>

                        <div className="mt-1 flex min-w-0 items-center gap-2">
                          <span className="shrink-0 text-xs text-darb-muted">
                            EGP
                          </span>

                          <input
                            type="text"
                            inputMode="numeric"
                            value={draftMaxInput}
                            onChange={handleMaxInputChange}
                            onBlur={handleMaxInputBlur}
                            className="w-full min-w-0 bg-transparent text-end text-sm outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* =========================
                  PRODUCT TYPE
              ========================== */}

              <section>
                <button
                  type="button"
                  onClick={() =>
                    toggleFilterSection(
                      "productType"
                    )
                  }
                  className="flex w-full items-center justify-between py-7 text-start"
                >
                  <h3 className="font-display text-2xl text-darb-green">
                    {t("Product Type")}
                  </h3>

                  <ChevronDown
                    size={21}
                    strokeWidth={
                      1.8
                    }
                    className={`transition-transform duration-200 ${
                      openFilterSection ===
                      "productType"
                        ? "rotate-180"
                        : ""
                    }`}
                  />
                </button>

                {openFilterSection ===
                  "productType" && (
                  <div className="space-y-5 pb-8">
                    {productTypes.map(
                      (
                        type
                      ) => {
                        const checked =
                          draftCategories.includes(
                            type.value
                          );

                        return (
                          <label
                            key={
                              type.value
                            }
                            className="flex cursor-pointer items-center gap-4 text-base text-darb-black"
                          >
                            <input
                              type="checkbox"
                              checked={
                                checked
                              }
                              onChange={() =>
                                toggleCategory(
                                  type.value
                                )
                              }
                              className="h-5 w-5 accent-darb-green"
                            />

                            {
                              t(type.label)
                            }
                          </label>
                        );
                      }
                    )}
                  </div>
                )}
              </section>
            </div>

            {/* =========================
                VIEW RESULTS
            ========================== */}

            <div className="border-t border-darb-gold/20 bg-darb-cream p-6">
              <button
                type="button"
                onClick={
                  applyFilters
                }
                className="w-full rounded-full bg-darb-green px-6 py-4 text-sm font-bold uppercase tracking-[0.18em] text-darb-beige transition hover:bg-darb-black"
              >
                {t("View Results")}
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* =========================
          MOBILE SORT
      ========================== */}

      {mobileSortOpen && (
        <div className="fixed inset-0 z-[110] md:hidden">
          <button
            type="button"
            aria-label={t("Close sort")}
            onClick={() =>
              setMobileSortOpen(
                false
              )
            }
            className="absolute inset-0 bg-darb-black/45"
          />

          <div className="darb-bottom-sheet absolute bottom-0 left-0 right-0 max-h-[82vh] overflow-y-auto rounded-t-[1.75rem] bg-darb-cream shadow-2xl">
            <div className="relative flex min-h-[86px] items-center justify-center border-b border-darb-gold/20 px-6">
              <h2 className="font-display text-3xl text-darb-green">
                {t("Sort by")}
              </h2>

              <button
                type="button"
                onClick={() =>
                  setMobileSortOpen(
                    false
                  )
                }
                className="absolute right-5 flex h-10 w-10 items-center justify-center"
                aria-label={t("Close sort")}
              >
                <X
                  size={24}
                />
              </button>
            </div>

            <div className="px-7 py-6">
              {sortOptions.map(
                (
                  option
                ) => (
                  <button
                    key={
                      option.value
                    }
                    type="button"
                    onClick={() =>
                      handleSort(
                        option.value
                      )
                    }
                    className="flex w-full items-center justify-between py-4 text-start text-[17px] text-darb-black"
                  >
                    {
                      t(option.label)
                    }

                    {sort ===
                      option.value && (
                      <Check
                        size={
                          20
                        }
                        className="text-darb-green"
                      />
                    )}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Shop;
