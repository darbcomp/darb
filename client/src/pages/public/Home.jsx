import {
  useEffect,
  useRef,
  useState,
} from "react";

import { Link } from "react-router-dom";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ShieldCheck,
  Star,
  X,
} from "lucide-react";

import { getCategories } from "../../api/categoryApi";

import {
  getBestSellerProducts,
} from "../../api/productApi";

import {
  createCustomerReview,
  getPublicReviews,
  getReviewEligibility,
} from "../../api/reviewApi";

import ProductCard from "../../components/product/ProductCard";
import { useAuth } from "../../context/AuthContext";

const categoryVisuals = {
  men: "/images/home/category-for-him.webp",
  women: "/images/home/category-for-her.webp",
};

const fallbackCategories = [
  {
    name: "Men",
    slug: "men",
  },
  {
    name: "Women",
    slug: "women",
  },
];

const initialReviewForm = {
  displayName: "",
  rating: 5,
  productId: "",
  text: "",
};

const reviewPrompts = [
  {
    label: "The scent",
    placeholder:
      "What did you notice first about the scent?",
  },
  {
    label: "Longevity",
    placeholder:
      "How did the fragrance stay with you throughout the day?",
  },
  {
    label: "The memory",
    placeholder:
      "Was there a moment or memory this fragrance became part of?",
  },
  {
    label: "The feeling",
    placeholder:
      "How did wearing Darb make you feel?",
  },
];

function CategoryCard({
  category,
}) {
  const image =
    categoryVisuals[
      category.slug
    ];

  return (
    <Link
      to={`/category/${category.slug}`}
      className="
        group relative block
        min-w-[82%]
        snap-start
        overflow-hidden
        rounded-[1.75rem]
        sm:min-w-[48%]
        md:min-w-0
      "
    >
      <div className="relative aspect-[4/5] overflow-hidden lg:aspect-[3/4]">
        {image && (
          <img
            src={image}
            alt={category.name}
            onError={(event) => {
              event.currentTarget.style.display =
                "none";
            }}
            className="
              absolute inset-0
              h-full w-full
              object-cover
              transition
              duration-700
              group-hover:scale-[1.04]
            "
          />
        )}
      </div>
    </Link>
  );
}

function RatingStars({
  rating = 0,
  size = 17,
}) {
  return (
    <div
      className="flex items-center gap-1 text-darb-gold"
      aria-label={`${rating} out of 5 stars`}
    >
      {Array.from({
        length: 5,
      }).map(
        (_, index) => (
          <Star
            key={index}
            size={size}
            strokeWidth={1.6}
            fill={
              index <
              Number(rating)
                ? "currentColor"
                : "none"
            }
          />
        )
      )}
    </div>
  );
}

function ReviewCard({
  review,
  isDuplicate = false,
}) {
  const dateValue =
    review.reviewDate ||
    review.createdAt;

  const formattedDate =
    dateValue
      ? new Date(
          dateValue
        ).toLocaleDateString(
          "en-EG",
          {
            month: "short",
            year: "numeric",
          }
        )
      : "";

  const fragranceName =
    review.fragrance?.name ||
    "";

  return (
    <article
      aria-hidden={
        isDuplicate || undefined
      }
      className="
        flex min-h-[340px]
        min-w-[84%]
        snap-start
        flex-col
        rounded-[1.75rem]
        border border-darb-gold/25
        bg-white
        p-6
        shadow-soft
        sm:min-w-[46%]
        lg:min-w-[calc(25%_-_0.9375rem)]
        lg:basis-[calc(25%_-_0.9375rem)]
        lg:p-7
      "
    >
      <div className="flex items-start justify-between gap-4">
        <RatingStars
          rating={
            review.rating
          }
        />

        <span className="font-display text-4xl leading-none text-darb-gold/30">
          “
        </span>
      </div>

      <p className="mt-6 flex-1 text-[15px] leading-7 text-darb-black/80">
        {review.text}
      </p>

      <div className="mt-7 border-t border-darb-gold/20 pt-5">
        <p className="font-display text-xl text-darb-green">
          {review.displayName}
        </p>

        {fragranceName && (
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-darb-gold">
            {fragranceName}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          {review.isVerifiedPurchase && (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-darb-green">
              <ShieldCheck
                size={14}
                strokeWidth={
                  1.8
                }
              />

              Verified Purchase
            </span>
          )}

          {formattedDate && (
            <span className="text-[10px] uppercase tracking-[0.12em] text-darb-muted">
              {formattedDate}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

function StepIndicator({
  currentStep,
}) {
  const steps = [1, 2, 3];

  return (
    <div className="flex items-center">
      {steps.map(
        (step, index) => {
          const active =
            step <=
            currentStep;

          return (
            <div
              key={step}
              className="flex flex-1 items-center last:flex-none"
            >
              <div
                className={`
                  flex h-8 w-8 shrink-0
                  items-center justify-center
                  rounded-full
                  text-[10px]
                  font-bold
                  tracking-[0.08em]
                  transition
                  ${
                    active
                      ? "bg-darb-green text-darb-beige"
                      : "border border-darb-gold/30 bg-white text-darb-muted"
                  }
                `}
              >
                0{step}
              </div>

              {index <
                steps.length -
                  1 && (
                <div
                  className={`
                    mx-2 h-px flex-1
                    transition
                    ${
                      step <
                      currentStep
                        ? "bg-darb-green"
                        : "bg-darb-gold/25"
                    }
                  `}
                />
              )}
            </div>
          );
        }
      )}
    </div>
  );
}

function Home() {
  const queryClient =
    useQueryClient();

  const {
    user,
    isAuthenticated,
  } = useAuth();

  const reviewTrackRef =
    useRef(null);

  const [
    reviewMarqueePaused,
    setReviewMarqueePaused,
  ] = useState(false);

  const [
    reduceReviewMotion,
    setReduceReviewMotion,
  ] = useState(
    () =>
      typeof window !==
        "undefined" &&
      Boolean(
        window.matchMedia?.(
          "(prefers-reduced-motion: reduce)"
        )?.matches
      )
  );

  const [
    reviewForm,
    setReviewForm,
  ] = useState(
    initialReviewForm
  );

  const [
    reviewMessage,
    setReviewMessage,
  ] = useState("");

  const [
    reviewError,
    setReviewError,
  ] = useState("");

  const [
    reviewModalOpen,
    setReviewModalOpen,
  ] = useState(false);

  const [
    reviewStep,
    setReviewStep,
  ] = useState(1);

  const [
    activePrompt,
    setActivePrompt,
  ] = useState(0);

  const categoriesQuery =
    useQuery({
      queryKey: [
        "categories",
      ],
      queryFn:
        getCategories,
    });

  const bestSellersQuery =
    useQuery({
      queryKey: [
        "best-seller-products",
      ],

      queryFn: () =>
        getBestSellerProducts(
          {
            limit: 8,
          }
        ),
    });

  const reviewsQuery =
    useQuery({
      queryKey: [
        "public-reviews",
      ],

      queryFn: () =>
        getPublicReviews({
          limit: 20,
        }),

      retry: 1,
    });

  const eligibilityQuery =
    useQuery({
      queryKey: [
        "review-eligibility",
        user?._id ||
          "guest",
      ],

      queryFn:
        getReviewEligibility,

      enabled:
        Boolean(
          isAuthenticated
        ),

      retry: 1,
    });

  const categories =
    categoriesQuery.data
      ?.data || [];

  const bestSellerProducts =
    bestSellersQuery.data
      ?.data || [];

  const reviews =
    reviewsQuery.data
      ?.data || [];

  const eligibility =
    eligibilityQuery.data
      ?.data || null;

  const purchasedProducts =
    eligibility
      ?.purchasedProducts ||
    [];

  const categoryOrder = [
    "men",
    "women",
  ];

  const sourceCategories =
    categories.length > 0
      ? categories
      : fallbackCategories;

  const displayCategories =
    categoryOrder
      .map((slug) =>
        sourceCategories.find(
          (category) =>
            category.slug ===
            slug
        )
      )
      .filter(Boolean);

  const categoryGridClasses = {
    2: "md:grid-cols-2 md:max-w-3xl",
    3: "md:grid-cols-3 md:max-w-5xl",
    4: "md:grid-cols-4 md:max-w-7xl",
  };

  const categoryGridClass =
    categoryGridClasses[
      displayCategories.length
    ] || categoryGridClasses[4];

  useEffect(() => {
    if (!reviewModalOpen) {
      return undefined;
    }

    const previousOverflow =
      document.body.style
        .overflow;

    document.body.style.overflow =
      "hidden";

    const handleKeyDown = (
      event
    ) => {
      if (
        event.key === "Escape"
      ) {
        setReviewModalOpen(
          false
        );
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [reviewModalOpen]);

  useEffect(() => {
    const mediaQuery =
      window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      );

    const updateMotionPreference =
      () => {
        setReduceReviewMotion(
          mediaQuery.matches
        );
      };

    updateMotionPreference();

    mediaQuery.addEventListener?.(
      "change",
      updateMotionPreference
    );

    return () => {
      mediaQuery.removeEventListener?.(
        "change",
        updateMotionPreference
      );
    };
  }, []);

  useEffect(() => {
    const container =
      reviewTrackRef.current;

    if (
      !container ||
      reduceReviewMotion ||
      reviewMarqueePaused ||
      reviews.length === 0
    ) {
      return undefined;
    }

    let frameId = 0;
    let scrollPosition =
      container.scrollLeft;
    let previousTime =
      performance.now();

    const moveReviews = (
      currentTime
    ) => {
      const firstReview =
        container.children[0];

      const firstDuplicate =
        container.children[
          reviews.length
        ];

      if (
        firstReview &&
        firstDuplicate
      ) {
        const loopWidth =
          firstDuplicate.offsetLeft -
          firstReview.offsetLeft;

        const elapsed =
          Math.min(
            currentTime -
              previousTime,
            64
          );

        scrollPosition +=
          (elapsed / 1000) *
          30;

        if (
          loopWidth > 0 &&
          scrollPosition >=
            loopWidth
        ) {
          scrollPosition %=
            loopWidth;
        }

        container.scrollLeft =
          scrollPosition;
      }

      previousTime =
        currentTime;

      frameId =
        window.requestAnimationFrame(
          moveReviews
        );
    };

    frameId =
      window.requestAnimationFrame(
        moveReviews
      );

    return () => {
      window.cancelAnimationFrame(
        frameId
      );
    };
  }, [
    reduceReviewMotion,
    reviewMarqueePaused,
    reviews.length,
  ]);

  useEffect(() => {
    if (!reviewMarqueePaused) {
      return undefined;
    }

    const resumeOutside = (
      event
    ) => {
      const container =
        reviewTrackRef.current;

      if (
        container &&
        !container.contains(
          event.target
        )
      ) {
        setReviewMarqueePaused(
          false
        );
      }
    };

    document.addEventListener(
      "pointerdown",
      resumeOutside,
      true
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        resumeOutside,
        true
      );
    };
  }, [reviewMarqueePaused]);

  const reviewMutation =
    useMutation({
      mutationFn:
        createCustomerReview,

      onSuccess: (
        response
      ) => {
        setReviewError("");

        setReviewMessage(
          response?.message ||
            "Thank you. Your review is waiting for approval."
        );

        setReviewModalOpen(
          false
        );

        setReviewStep(1);

        setReviewForm(
          initialReviewForm
        );

        queryClient.invalidateQueries(
          {
            queryKey: [
              "review-eligibility",
            ],
          }
        );

        queryClient.invalidateQueries(
          {
            queryKey: [
              "public-reviews",
            ],
          }
        );
      },

      onError: (
        error
      ) => {
        setReviewMessage("");

        setReviewError(
          error.friendlyMessage ||
            "We could not submit your review. Please try again."
        );
      },
    });

  const openReviewModal = () => {
    setReviewError("");
    setReviewMessage("");
    setReviewStep(1);
    setActivePrompt(0);

    setReviewForm({
      ...initialReviewForm,
      displayName:
        user?.name || "",
    });

    setReviewModalOpen(true);
  };

  const closeReviewModal = () => {
    if (
      reviewMutation.isPending
    ) {
      return;
    }

    setReviewModalOpen(false);
    setReviewStep(1);
    setReviewError("");
  };

  const handleReviewChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setReviewForm(
      (current) => ({
        ...current,
        [name]: value,
      })
    );

    setReviewError("");
  };

  const setRating = (
    rating
  ) => {
    setReviewForm(
      (current) => ({
        ...current,
        rating,
      })
    );

    setReviewError("");
  };

  const goToStepTwo = () => {
    if (
      Number(
        reviewForm.rating
      ) < 1
    ) {
      setReviewError(
        "Choose a rating before continuing."
      );

      return;
    }

    setReviewError("");
    setReviewStep(2);
  };

  const goToStepThree = () => {
    if (
      reviewForm.text
        .trim().length < 5
    ) {
      setReviewError(
        "Tell us a little more before continuing."
      );

      return;
    }

    setReviewError("");
    setReviewStep(3);
  };

  const handleReviewSubmit = (
    event
  ) => {
    event.preventDefault();

    setReviewMessage("");
    setReviewError("");

    if (
      reviewForm.text
        .trim().length < 5
    ) {
      setReviewError(
        "Please write a little more about your experience."
      );

      return;
    }

    reviewMutation.mutate({
      displayName:
        reviewForm.displayName.trim() ||
        user?.name ||
        "Darb Customer",

      rating: Number(
        reviewForm.rating
      ),

      productId:
        reviewForm.productId ||
        "",

      text:
        reviewForm.text.trim(),
    });
  };

  const selectedProduct =
    purchasedProducts.find(
      (product) =>
        String(
          product._id
        ) ===
        String(
          reviewForm.productId
        )
    );

  const reviewCloneCount =
    reviews.length === 1
      ? 4
      : 2;

  return (
    <div className="bg-darb-cream">
      <style>{`
        .darb-horizontal-scroll {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .darb-horizontal-scroll::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* =========================
          HERO
      ========================== */}

      <section
        className="
          relative isolate
          min-h-[690px]
          overflow-hidden
          bg-darb-green
          sm:min-h-[720px]
          lg:min-h-[760px]
        "
      >
        <picture className="absolute inset-0 -z-30">
          <source
            media="(min-width: 768px)"
            srcSet="/images/home/home_hero_desktop.webp"
          />

          <img
            src="/images/home/home_hero_mobile.webp"
            alt=""
            aria-hidden="true"
            onError={(event) => {
              event.currentTarget.style.display =
                "none";
            }}
            className="
              h-full w-full
              object-cover
              object-[62%_center]
              md:object-center
            "
          />
        </picture>

        <div className="absolute inset-0 -z-40 bg-[radial-gradient(circle_at_70%_35%,#C8A97E33,#0F3D2E_62%)]" />

        <div
          className="
            absolute inset-0 -z-20
            hidden
            bg-gradient-to-r
            from-darb-black/85
            via-darb-black/50
            to-darb-black/10
            md:block
          "
        />

        <div
          className="
            absolute inset-0 -z-20
            bg-gradient-to-b
            from-darb-black/10
            via-darb-black/30
            to-darb-black/90
            md:hidden
          "
        />

        <div
          className="
            mx-auto flex
            min-h-[690px]
            max-w-7xl
            items-end
            px-5
            pb-14
            pt-20
            sm:min-h-[720px]
            sm:px-6
            sm:pb-20
            lg:min-h-[760px]
            lg:items-center
            lg:px-8
            lg:py-24
          "
        >
          <div className="max-w-[680px]">
            <h1
              className="
                mt-5
                max-w-[650px]
                font-display
                text-[3.5rem]
                font-semibold
                leading-[0.98]
                tracking-[-0.035em]
                text-darb-beige
                sm:text-7xl
                lg:text-[5.5rem]
              "
            >
              A scent for
              <br />
              every path.
            </h1>

            <p className="mt-6 max-w-[570px] text-base leading-7 text-darb-beige/85 sm:text-lg sm:leading-8">
              Darb is more than
              perfume — a journey,
              a memory in every
              step.
            </p>

            <div className="mt-8 flex flex-wrap gap-3 sm:gap-4">
              <Link
                to="/shop"
                className="
                  inline-flex
                  min-h-[50px]
                  items-center
                  justify-center
                  rounded-full
                  bg-darb-beige
                  px-7
                  text-sm
                  font-semibold
                  text-darb-green
                  transition
                  duration-300
                  hover:bg-darb-gold
                "
              >
                Shop Now
              </Link>

              <a
                href="#categories"
                className="
                  inline-flex
                  min-h-[50px]
                  items-center
                  justify-center
                  rounded-full
                  border
                  border-darb-beige/65
                  bg-darb-black/10
                  px-7
                  text-sm
                  font-semibold
                  text-darb-beige
                  backdrop-blur-sm
                  transition
                  duration-300
                  hover:border-darb-beige
                  hover:bg-darb-beige
                  hover:text-darb-green
                "
              >
                Explore Categories
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* =========================
          CATEGORIES
      ========================== */}

      <section
        id="categories"
        className="
          scroll-mt-32
          bg-darb-cream
          py-16
          sm:py-20
          lg:py-24
        "
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 px-5 sm:px-6 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-darb-gold sm:text-sm">
              Categories
            </p>

            <h2 className="mt-2 font-display text-4xl leading-tight text-darb-green sm:text-5xl">
              Choose your path
            </h2>
          </div>

          <div
            className={`
              darb-horizontal-scroll
              flex
              snap-x
              snap-mandatory
              gap-4
              overflow-x-auto
              pl-5 pr-0
              pb-2
              scroll-pl-5
              sm:pl-5
              sm:pr-0
              md:grid
              md:mx-auto
              md:overflow-visible
              md:px-6
              md:scroll-pl-0
              lg:gap-5
              lg:px-8
              ${categoryGridClass}
            `}
          >
            {displayCategories.map(
              (category) => (
                <CategoryCard
                  key={
                    category.slug
                  }
                  category={
                    category
                  }
                />
              )
            )}
          </div>

          <div className="mt-8 flex justify-center px-5 sm:px-6 lg:px-8">
            <Link
              to="/shop"
              className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-darb-green px-8 text-sm font-semibold text-darb-beige transition duration-300 hover:bg-darb-gold hover:text-darb-green"
            >
              Shop All Fragrances
            </Link>
          </div>
        </div>
      </section>

      {/* =========================
          BEST SELLERS
      ========================== */}

      <section className="bg-darb-green py-16 text-darb-beige sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="mb-9">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-darb-gold sm:text-sm">
              Best Sellers
            </p>

            <h2 className="mt-2 font-display text-4xl leading-tight sm:text-5xl">
              Scents worth
              remembering.
            </h2>

            <p className="mt-4 max-w-xl text-sm leading-7 text-darb-beige/65 sm:text-base">
              Fragrances that
              found their way into
              more than one memory.
            </p>
          </div>

          {bestSellersQuery.isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
              {Array.from({
                length: 8,
              }).map(
                (_, index) => (
                  <div
                    key={
                      index
                    }
                    className="aspect-[3/5] animate-pulse rounded-[1.25rem] bg-darb-beige/10 sm:rounded-[1.5rem]"
                  />
                )
              )}
            </div>
          ) : bestSellersQuery.isError ? (
            <div className="rounded-[1.75rem] border border-darb-gold/25 bg-darb-beige/10 px-6 py-12 text-center">
              <p className="font-display text-3xl text-darb-gold">
                The path is quiet
                for now
              </p>

              <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-darb-beige/70">
                Best sellers could
                not be loaded right
                now.
              </p>
            </div>
          ) : bestSellerProducts.length >
            0 ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
              {bestSellerProducts
                .slice(0, 8)
                .map(
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
          ) : (
            <div className="rounded-[1.75rem] border border-darb-gold/25 bg-darb-beige/10 px-6 py-12 text-center">
              <p className="font-display text-3xl text-darb-gold">
                Best sellers
                coming soon
              </p>

              <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-darb-beige/70">
                Mark fragrances as
                Best Seller from
                the Darb admin
                dashboard.
              </p>
            </div>
          )}

          <div className="mt-10 text-center">
            <Link
              to="/shop"
              className="inline-flex min-h-[50px] items-center justify-center rounded-full border border-darb-beige/45 px-7 text-sm font-semibold text-darb-beige transition hover:bg-darb-beige hover:text-darb-green"
            >
              Shop All Fragrances
            </Link>
          </div>
        </div>
      </section>

      {/* =========================
          REVIEWS
      ========================== */}

      <section
        id="reviews"
        className="bg-darb-cream py-16 sm:py-20 lg:py-24"
      >
        <div className="mx-auto max-w-7xl">
          <div className="px-5 sm:px-6 lg:px-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-darb-gold sm:text-sm">
                What They Remember
              </p>

              <h2 className="mt-2 font-display text-4xl leading-tight text-darb-green sm:text-5xl">
                Stories that stayed.
              </h2>

              <p className="mt-4 max-w-xl text-sm leading-7 text-darb-muted sm:text-base">
                Moments, memories
                and impressions
                left along the Darb
                journey.
              </p>
            </div>
          </div>

          {reviewsQuery.isLoading && (
            <div className="mt-10 flex gap-4 overflow-hidden px-5 sm:px-6 lg:px-8">
              {Array.from({
                length: 4,
              }).map(
                (_, index) => (
                  <div
                    key={
                      index
                    }
                    className="min-h-[340px] min-w-[84%] animate-pulse rounded-[1.75rem] bg-white sm:min-w-[46%] lg:min-w-[calc(25%_-_0.9375rem)]"
                  />
                )
              )}
            </div>
          )}

          {reviewsQuery.isError && (
            <div className="mx-5 mt-10 rounded-[1.75rem] border border-darb-gold/20 bg-white p-8 text-center shadow-soft sm:mx-6 lg:mx-8">
              <p className="font-display text-3xl text-darb-green">
                The stories are
                quiet for now.
              </p>
            </div>
          )}

          {!reviewsQuery.isLoading &&
            !reviewsQuery.isError &&
            reviews.length >
              0 && (
              <>
                <div
                  ref={
                    reviewTrackRef
                  }
                  onPointerDown={() =>
                    setReviewMarqueePaused(
                      true
                    )
                  }
                  className="
                    darb-horizontal-scroll
                    mt-10
                    flex
                    gap-4
                    overflow-x-auto
                    px-5
                    pb-3
                    sm:px-6
                    lg:gap-5
                    lg:px-8
                  "
                >
                  {reviews.map(
                    (
                      review,
                      index
                    ) => (
                      <ReviewCard
                        key={
                          review._id ||
                          index
                        }
                        review={
                          review
                        }
                      />
                    )
                  )}

                  {!reduceReviewMotion &&
                    Array.from(
                      {
                        length:
                          reviewCloneCount,
                      },
                      (_, index) =>
                        index + 1
                    ).flatMap(
                      (copy) =>
                        reviews.map(
                          (
                            review,
                            index
                          ) => (
                            <ReviewCard
                              key={`${
                                review._id ||
                                index
                              }-duplicate-${copy}`}
                              review={
                                review
                              }
                              isDuplicate
                            />
                          )
                        )
                    )}
                </div>

              </>
            )}

          {!reviewsQuery.isLoading &&
            !reviewsQuery.isError &&
            reviews.length ===
              0 && (
              <div className="mx-5 mt-10 rounded-[1.75rem] border border-darb-gold/20 bg-white px-6 py-10 text-center shadow-soft sm:mx-6 lg:mx-8">
                <Star
                  size={27}
                  className="mx-auto text-darb-gold"
                />

                <p className="mt-4 font-display text-3xl text-darb-green">
                  The first memory
                  is still waiting
                  to be shared.
                </p>

                <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-darb-muted">
                  Approved customer
                  experiences will
                  appear here.
                </p>
              </div>
            )}

          {/* =========================
              COMPACT REVIEW CTA
          ========================== */}

          <div className="mx-5 mt-14 overflow-hidden rounded-[2rem] bg-darb-green text-darb-beige shadow-soft sm:mx-6 lg:mx-8 lg:mt-16">
            <div className="flex flex-col justify-between gap-8 px-7 py-8 sm:px-9 sm:py-9 lg:flex-row lg:items-center lg:px-10">
              <div className="max-w-2xl">
                <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-darb-gold sm:text-xs">
                  Your Journey
                </p>

                <h3 className="mt-3 font-display text-3xl leading-tight sm:text-4xl">
                  Leave a memory behind.
                </h3>

                <p className="mt-3 max-w-xl text-sm leading-7 text-darb-beige/65">
                  Already walked
                  part of the Darb
                  journey? Share
                  what stayed with
                  you.
                </p>

                <div className="mt-5 flex items-center gap-2 text-xs text-darb-beige/60">
                  <ShieldCheck
                    size={16}
                    className="shrink-0 text-darb-gold"
                  />

                  Verified order
                  checking
                </div>
              </div>

              <div className="shrink-0">
                {!isAuthenticated && (
                  <Link
                    to="/login"
                    className="inline-flex min-h-[50px] w-full items-center justify-center rounded-full bg-darb-beige px-8 text-sm font-semibold text-darb-green transition hover:bg-darb-gold sm:w-auto"
                  >
                    Sign In to Review
                  </Link>
                )}

                {isAuthenticated &&
                  eligibilityQuery.isLoading && (
                    <div className="h-[50px] w-44 animate-pulse rounded-full bg-darb-beige/10" />
                  )}

                {isAuthenticated &&
                  !eligibilityQuery.isLoading &&
                  !eligibilityQuery.isError &&
                  eligibility &&
                  !eligibility.hasOrder && (
                    <div>
                      <p className="max-w-xs text-sm leading-6 text-darb-beige/60">
                        Reviews unlock
                        after your
                        first Darb
                        order.
                      </p>

                      <Link
                        to="/shop"
                        className="mt-4 inline-flex min-h-[48px] items-center justify-center rounded-full border border-darb-beige/35 px-6 text-sm font-semibold text-darb-beige transition hover:bg-darb-beige hover:text-darb-green"
                      >
                        Explore Fragrances
                      </Link>
                    </div>
                  )}

                {isAuthenticated &&
                  !eligibilityQuery.isLoading &&
                  !eligibilityQuery.isError &&
                  eligibility
                    ?.existingReview && (
                    <div className="max-w-sm rounded-[1.4rem] border border-darb-gold/25 bg-darb-beige/10 px-5 py-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle2
                          size={18}
                          className="text-darb-gold"
                        />

                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-darb-gold">
                          {eligibility
                            .existingReview
                            .status ===
                          "approved"
                            ? "Part of the Journey"
                            : "Review Received"}
                        </p>
                      </div>

                      <p className="mt-2 text-sm leading-6 text-darb-beige/75">
                        {eligibility
                          .existingReview
                          .status ===
                        "approved"
                          ? "Your review has been approved."
                          : "Your review is waiting for approval."}
                      </p>
                    </div>
                  )}

                {isAuthenticated &&
                  !eligibilityQuery.isLoading &&
                  !eligibilityQuery.isError &&
                  eligibility
                    ?.canReview && (
                    <button
                      type="button"
                      onClick={
                        openReviewModal
                      }
                      className="inline-flex min-h-[50px] w-full items-center justify-center rounded-full bg-darb-beige px-8 text-sm font-semibold text-darb-green transition hover:bg-darb-gold sm:w-auto"
                    >
                      Write a Review
                    </button>
                  )}
              </div>
            </div>
          </div>

          {reviewMessage && (
            <div className="mx-5 mt-5 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-700 sm:mx-6 lg:mx-8">
              {reviewMessage}
            </div>
          )}
        </div>
      </section>

      {/* =========================
          REVIEW STEPPER MODAL
      ========================== */}

      {reviewModalOpen && (
        <div
          className="
            fixed inset-0
            z-[100]
            flex
            items-end
            justify-center
            bg-darb-black/60
            px-0
            backdrop-blur-sm
            sm:items-center
            sm:px-5
            sm:py-8
          "
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeReviewModal();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Write a Darb review"
            className="
              darb-horizontal-scroll
              max-h-[92vh]
              w-full
              max-w-[700px]
              overflow-y-auto
              rounded-t-[2rem]
              bg-darb-cream
              shadow-2xl
              sm:rounded-[2rem]
            "
          >
            {/* Modal Header */}

            <div className="sticky top-0 z-10 border-b border-darb-gold/20 bg-darb-cream/95 px-6 pb-5 pt-6 backdrop-blur-md sm:px-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-darb-gold">
                    Write a Review
                  </p>

                  <p className="mt-1 text-xs text-darb-muted">
                    A small memory
                    in three steps.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    closeReviewModal
                  }
                  disabled={
                    reviewMutation.isPending
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-darb-gold/30 text-darb-green transition hover:bg-darb-gold/10"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-6">
                <StepIndicator
                  currentStep={
                    reviewStep
                  }
                />
              </div>
            </div>

            <form
              onSubmit={
                handleReviewSubmit
              }
              className="px-6 pb-7 pt-7 sm:px-8 sm:pb-8"
            >
              {reviewError && (
                <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                  {reviewError}
                </div>
              )}

              {/* STEP 1 */}

              {reviewStep ===
                1 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-darb-gold">
                    Step One
                  </p>

                  <h3 className="mt-2 font-display text-4xl leading-tight text-darb-green">
                    How did it
                    stay with you?
                  </h3>

                  <p className="mt-3 max-w-lg text-sm leading-7 text-darb-muted">
                    Start with the
                    feeling. Pick
                    your rating,
                    then choose the
                    fragrance if
                    one stands out.
                  </p>

                  <div className="mt-8">
                    <label className="text-sm font-semibold text-darb-green">
                      Your rating
                    </label>

                    <div className="mt-3 flex gap-2">
                      {Array.from({
                        length: 5,
                      }).map(
                        (
                          _,
                          index
                        ) => {
                          const rating =
                            index +
                            1;

                          const selected =
                            rating <=
                            Number(
                              reviewForm.rating
                            );

                          return (
                            <button
                              key={
                                rating
                              }
                              type="button"
                              onClick={() =>
                                setRating(
                                  rating
                                )
                              }
                              className="
                                flex h-12 w-12
                                items-center
                                justify-center
                                rounded-full
                                border
                                border-darb-gold/25
                                bg-white
                                transition
                                hover:border-darb-gold
                              "
                              aria-label={`${rating} stars`}
                            >
                              <Star
                                size={24}
                                strokeWidth={
                                  1.5
                                }
                                className={
                                  selected
                                    ? "text-darb-gold"
                                    : "text-darb-gold/30"
                                }
                                fill={
                                  selected
                                    ? "currentColor"
                                    : "none"
                                }
                              />
                            </button>
                          );
                        }
                      )}
                    </div>

                    <p className="mt-3 text-xs text-darb-muted">
                      {
                        reviewForm.rating
                      }{" "}
                      out of 5
                    </p>
                  </div>

                  <div className="mt-7">
                    <label className="mb-2 block text-sm font-semibold text-darb-green">
                      Which fragrance?
                    </label>

                    <select
                      name="productId"
                      value={
                        reviewForm.productId
                      }
                      onChange={
                        handleReviewChange
                      }
                      className="w-full rounded-full border border-darb-gold/30 bg-white px-5 py-3.5 outline-none transition focus:border-darb-green"
                    >
                      <option value="">
                        Darb overall
                        experience
                      </option>

                      {purchasedProducts.map(
                        (
                          product
                        ) => (
                          <option
                            key={
                              product._id
                            }
                            value={
                              product._id
                            }
                          >
                            {
                              product.name
                            }
                          </option>
                        )
                      )}
                    </select>

                    <p className="mt-2 text-xs leading-5 text-darb-muted">
                      Only fragrances
                      from your order
                      history appear
                      here.
                    </p>
                  </div>

                  <div className="mt-8 flex justify-end">
                    <button
                      type="button"
                      onClick={
                        goToStepTwo
                      }
                      className="inline-flex min-h-[50px] items-center justify-center rounded-full bg-darb-green px-8 text-sm font-semibold text-darb-beige transition hover:bg-darb-black"
                    >
                      Continue
                      <ArrowRight
                        size={16}
                        className="ml-2"
                      />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2 */}

              {reviewStep ===
                2 && (
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setReviewError(
                        ""
                      );

                      setReviewStep(
                        1
                      );
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-darb-muted transition hover:text-darb-green"
                  >
                    <ChevronLeft
                      size={15}
                    />
                    Back
                  </button>

                  <p className="mt-6 text-xs font-semibold uppercase tracking-[0.25em] text-darb-gold">
                    Step Two
                  </p>

                  <h3 className="mt-2 font-display text-4xl leading-tight text-darb-green">
                    What stayed
                    with you?
                  </h3>

                  <p className="mt-3 max-w-lg text-sm leading-7 text-darb-muted">
                    There is no
                    perfect way to
                    say it. Share
                    the scent, the
                    moment, or the
                    feeling.
                  </p>

                  <div className="mt-6 flex flex-wrap gap-2">
                    {reviewPrompts.map(
                      (
                        prompt,
                        index
                      ) => (
                        <button
                          key={
                            prompt.label
                          }
                          type="button"
                          onClick={() =>
                            setActivePrompt(
                              index
                            )
                          }
                          className={`
                            rounded-full
                            border
                            px-4 py-2
                            text-xs
                            font-semibold
                            transition
                            ${
                              activePrompt ===
                              index
                                ? "border-darb-green bg-darb-green text-darb-beige"
                                : "border-darb-gold/30 bg-white text-darb-green hover:border-darb-gold"
                            }
                          `}
                        >
                          {
                            prompt.label
                          }
                        </button>
                      )
                    )}
                  </div>

                  <div className="mt-5">
                    <textarea
                      name="text"
                      value={
                        reviewForm.text
                      }
                      onChange={
                        handleReviewChange
                      }
                      rows={4}
                      maxLength={
                        1200
                      }
                      autoFocus
                      placeholder={
                        reviewPrompts[
                          activePrompt
                        ]
                          .placeholder
                      }
                      className="w-full resize-none rounded-[1.5rem] border border-darb-gold/30 bg-white px-5 py-4 text-base outline-none transition focus:border-darb-green"
                    />

                    <div className="mt-2 flex justify-end">
                      <span className="text-[10px] text-darb-muted">
                        {
                          reviewForm
                            .text
                            .length
                        }
                        /1200
                      </span>
                    </div>
                  </div>

                  <div className="mt-7 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setReviewError(
                          ""
                        );

                        setReviewStep(
                          1
                        );
                      }}
                      className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-darb-gold/35 px-6 text-sm font-semibold text-darb-green transition hover:bg-darb-gold/10"
                    >
                      <ArrowLeft
                        size={15}
                        className="mr-2"
                      />
                      Back
                    </button>

                    <button
                      type="button"
                      onClick={
                        goToStepThree
                      }
                      className="inline-flex min-h-[50px] items-center justify-center rounded-full bg-darb-green px-7 text-sm font-semibold text-darb-beige transition hover:bg-darb-black"
                    >
                      Continue
                      <ArrowRight
                        size={16}
                        className="ml-2"
                      />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3 */}

              {reviewStep ===
                3 && (
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setReviewError(
                        ""
                      );

                      setReviewStep(
                        2
                      );
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-darb-muted transition hover:text-darb-green"
                  >
                    <ChevronLeft
                      size={15}
                    />
                    Back
                  </button>

                  <p className="mt-6 text-xs font-semibold uppercase tracking-[0.25em] text-darb-gold">
                    Step Three
                  </p>

                  <h3 className="mt-2 font-display text-4xl leading-tight text-darb-green">
                    Ready to leave
                    your memory?
                  </h3>

                  <p className="mt-3 max-w-lg text-sm leading-7 text-darb-muted">
                    One last look
                    before your
                    review begins
                    its Darb.
                  </p>

                  <div className="mt-7">
                    <label className="mb-2 block text-sm font-semibold text-darb-green">
                      Name shown
                      publicly
                    </label>

                    <input
                      name="displayName"
                      value={
                        reviewForm.displayName
                      }
                      onChange={
                        handleReviewChange
                      }
                      placeholder={
                        user?.name ||
                        "Your name"
                      }
                      className="w-full rounded-full border border-darb-gold/30 bg-white px-5 py-3.5 outline-none transition focus:border-darb-green"
                    />
                  </div>

                  {/* REVIEW PREVIEW */}

                  <div className="mt-7 rounded-[1.75rem] border border-darb-gold/25 bg-white p-6">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-darb-gold">
                      Preview
                    </p>

                    <div className="mt-4">
                      <RatingStars
                        rating={
                          reviewForm.rating
                        }
                        size={18}
                      />
                    </div>

                    <p className="mt-5 text-[15px] leading-7 text-darb-black/80">
                      “
                      {
                        reviewForm.text
                      }
                      ”
                    </p>

                    <div className="mt-6 border-t border-darb-gold/20 pt-5">
                      <p className="font-display text-xl text-darb-green">
                        {reviewForm.displayName.trim() ||
                          user?.name ||
                          "Darb Customer"}
                      </p>

                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-darb-gold">
                        {selectedProduct?.name ||
                          "Darb"}
                      </p>

                      <div className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-darb-green">
                        <ShieldCheck
                          size={14}
                        />

                        Verified Purchase
                      </div>
                    </div>
                  </div>

                  <p className="mt-4 text-xs leading-6 text-darb-muted">
                    Your review
                    will be checked
                    before appearing
                    publicly.
                  </p>

                  <div className="mt-7 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setReviewError(
                          ""
                        );

                        setReviewStep(
                          2
                        );
                      }}
                      disabled={
                        reviewMutation.isPending
                      }
                      className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-darb-gold/35 px-6 text-sm font-semibold text-darb-green transition hover:bg-darb-gold/10"
                    >
                      <ArrowLeft
                        size={15}
                        className="mr-2"
                      />
                      Back
                    </button>

                    <button
                      type="submit"
                      disabled={
                        reviewMutation.isPending
                      }
                      className="inline-flex min-h-[50px] items-center justify-center rounded-full bg-darb-green px-7 text-sm font-semibold text-darb-beige transition hover:bg-darb-black disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {reviewMutation.isPending
                        ? "Submitting..."
                        : "Submit Review"}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
