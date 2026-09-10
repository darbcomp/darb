import {
  useMemo,
  useState,
} from "react";

import {
  Link,
  useParams,
} from "react-router-dom";

import {
  useMutation,
  useQuery,
} from "@tanstack/react-query";

import {
  ArrowLeft,
  Bell,
  Check,
  Minus,
  Plus,
  ShoppingBag,
} from "lucide-react";

import {
  getProductBySlug,
  getProducts,
} from "../../api/productApi";

import {
  createWaitlistRequest,
} from "../../api/waitlistApi";

import {
  useAuth,
} from "../../context/AuthContext";

import { useCart } from "../../context/useCart";

import ProductCard from "../../components/product/ProductCard";

import {
  formatCurrency,
} from "../../utils/formatCurrency";
import { flyProductImageToCart } from "../../utils/flyToCart";
import { getActiveProductVariants, getStockLabel } from "../../utils/productVariants";

const initialWaitlistForm = {
  name: "",
  phone: "",
  email: "",
  note: "",
};

function ProductDetails() {
  const {
    slug,
  } = useParams();

  const {
    user,
  } = useAuth();

  const {
    addToCart,
  } = useCart();

  const [
    selectedImageIndex,
    setSelectedImageIndex,
  ] = useState(0);

  const [
    quantity,
    setQuantity,
  ] = useState(1);

  const [selectedVariantId, setSelectedVariantId] = useState("");

  const [
    cartMessage,
    setCartMessage,
  ] = useState("");

  const [
    waitlistForm,
    setWaitlistForm,
  ] = useState(
    initialWaitlistForm
  );

  const [
    waitlistMessage,
    setWaitlistMessage,
  ] = useState("");

  const [
    waitlistError,
    setWaitlistError,
  ] = useState("");

  /* =========================
     PRODUCT
  ========================== */

  const productQuery =
    useQuery({
      queryKey: [
        "product",
        slug,
      ],

      queryFn: () =>
        getProductBySlug(
          slug
        ),

      retry: 1,
    });

  const product =
    productQuery.data?.data;

  const activeVariants = useMemo(() => getActiveProductVariants(product), [product]);

  const selectedVariant = activeVariants.find((variant) =>
    String(variant.variantId || "") === String(selectedVariantId || "")
  ) || activeVariants[0];
  const displayPrice = Number(selectedVariant?.price) || 0;
  const displayCompareAtPrice = Number(selectedVariant?.compareAtPrice) || 0;
  const selectedStock = Number(selectedVariant?.stock) || 0;

  /* =========================
     IMAGES
  ========================== */

  const images = useMemo(
    () => {
      if (
        !product?.images
          ?.length
      ) {
        return [];
      }

      return [
        ...product.images,
      ]
        .sort(
          (
            a,
            b
          ) =>
            Number(
              Boolean(
                b.isMain
              )
            ) -
            Number(
              Boolean(
                a.isMain
              )
            )
        )
        .slice(0, 3);
    },
    [product]
  );

  const safeImageIndex =
    Math.min(
      selectedImageIndex,
      Math.max(
        images.length - 1,
        0
      )
    );

  const selectedImage =
    images[
      safeImageIndex
    ] ||
    images[0];

  /* =========================
     PRODUCT DATA
  ========================== */

  const categoryName =
    product?.category
      ?.name ||
    product
      ?.categorySnapshot
      ?.name ||
    "Darb";

  const categorySlug =
    product?.category
      ?.slug ||
    product
      ?.categorySnapshot
      ?.slug ||
    "";

  const sizeLabel = selectedVariant?.label || product?.sizeLabel || "";

  const concentration =
    product?.concentration ||
    "Eau de Parfum";

  const scentFamily =
    product?.scentFamily ||
    "";

  const canPurchase =
    product &&
    displayPrice > 0 &&
    selectedStock > 0 &&
    product.isActive &&
    !product.isPlaceholder;

  const lowStock =
    canPurchase &&
    selectedStock <= 3;

  const unavailableReason =
    useMemo(() => {
      if (!product) {
        return "";
      }

      if (
        product.isPlaceholder
      ) {
        return "This scent is still being prepared with its final Darb details.";
      }

      if (
        !product.isActive
      ) {
        return "This scent is currently unavailable.";
      }

      if (
        !displayPrice || displayPrice <= 0
      ) {
        return "The final price for this scent has not been confirmed yet.";
      }

      if (
        selectedStock <= 0
      ) {
        return "This scent is currently out of stock.";
      }

      return "";
    }, [product, displayPrice, selectedStock]);

  /* =========================
     RELATED PRODUCTS
  ========================== */

  const relatedProductsQuery =
    useQuery({
      queryKey: [
        "products",
        "related",
        categorySlug,
        product?._id,
      ],

      queryFn: () =>
        getProducts({
          category:
            categorySlug,
          limit: 5,
          sort: "featured",
        }),

      enabled:
        Boolean(
          categorySlug &&
            product?._id
        ),

      retry: 1,
    });

  const relatedProducts =
    (
      relatedProductsQuery
        .data?.data ||
      []
    )
      .filter(
        (item) =>
          item._id !==
          product?._id
      )
      .slice(0, 4);

  /* =========================
     WAITLIST
  ========================== */

  const waitlistMutation =
    useMutation({
      mutationFn:
        createWaitlistRequest,

      onSuccess: (
        response
      ) => {
        setWaitlistError(
          ""
        );

        setWaitlistMessage(
          response?.message ||
            "You have been added to the waitlist. We will contact you when this scent is available."
        );

        setWaitlistForm(
          (current) => ({
            ...current,
            note: "",
          })
        );
      },

      onError: (
        error
      ) => {
        setWaitlistMessage(
          ""
        );

        setWaitlistError(
          error.friendlyMessage ||
            "Failed to join waitlist. Please try again."
        );
      },
    });

  /* =========================
     QUANTITY
  ========================== */

  const handleQuantityChange =
    (type) => {
      setCartMessage("");

      setQuantity(
        (current) => {
          if (
            type ===
            "decrease"
          ) {
            return Math.max(
              current - 1,
              1
            );
          }

          const maxStock = selectedStock > 0 ? selectedStock : 1;

          return Math.min(
            current + 1,
            maxStock
          );
        }
      );
    };

  /* =========================
     CART
  ========================== */

  const handleAddToCart =
    (event) => {
      if (!canPurchase) {
        return;
      }

      addToCart(
        product,
        Math.min(quantity, selectedStock),
        selectedVariant?.isLegacy ? null : selectedVariant
      );

      flyProductImageToCart({
        imageUrl:
          selectedImage?.url,
        origin:
          event.currentTarget,
      });

      setCartMessage(
        `${Math.min(quantity, selectedStock)} ${
          Math.min(quantity, selectedStock) === 1
            ? "bottle"
            : "bottles"
        } added to your cart.`
      );
    };

  /* =========================
     WAITLIST FORM
  ========================== */

  const handleWaitlistChange =
    (event) => {
      const {
        name,
        value,
      } = event.target;

      setWaitlistForm(
        (current) => ({
          ...current,
          [name]: value,
        })
      );
    };

  const prefillWaitlistFromAccount =
    () => {
      if (!user) return;

      setWaitlistForm(
        (current) => ({
          ...current,

          name:
            current.name ||
            user.name ||
            "",

          phone:
            current.phone ||
            user.phone ||
            "",

          email:
            current.email ||
            user.email ||
            "",
        })
      );
    };

  const handleWaitlistSubmit =
    (event) => {
      event.preventDefault();

      if (!product) {
        return;
      }

      if (
        !waitlistForm.name.trim()
      ) {
        setWaitlistError(
          "Name is required."
        );

        setWaitlistMessage(
          ""
        );

        return;
      }

      if (
        !waitlistForm.phone.trim() &&
        !waitlistForm.email.trim()
      ) {
        setWaitlistError(
          "Phone or email is required."
        );

        setWaitlistMessage(
          ""
        );

        return;
      }

      setWaitlistError(
        ""
      );

      setWaitlistMessage(
        ""
      );

      waitlistMutation.mutate({
        product:
          product._id,

        productId:
          product._id,

        slug:
          product.slug,

        productSlug:
          product.slug,

        productName:
          product.name,

        name:
          waitlistForm.name.trim(),

        phone:
          waitlistForm.phone.trim(),

        email:
          waitlistForm.email.trim(),

        source:
          "product_page",

        note:
          [selectedVariant?.label ? `Requested size: ${selectedVariant.label}` : "", waitlistForm.note.trim()].filter(Boolean).join(" — "),
      });
    };

  /* =========================
     LOADING
  ========================== */

  if (
    productQuery.isLoading
  ) {
    return (
      <main className="min-h-[70vh] bg-darb-cream">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8 lg:py-14">
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="aspect-square animate-pulse rounded-[2rem] bg-white" />

            <div className="space-y-5 pt-4">
              <div className="h-4 w-28 animate-pulse rounded-full bg-darb-gold/20" />

              <div className="h-14 w-2/3 animate-pulse rounded-xl bg-white" />

              <div className="h-6 w-40 animate-pulse rounded-xl bg-white" />

              <div className="h-28 animate-pulse rounded-[1.5rem] bg-white" />

              <div className="h-16 animate-pulse rounded-full bg-darb-green/10" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  /* =========================
     NOT FOUND
  ========================== */

  if (
    productQuery.isError ||
    !product
  ) {
    return (
      <main className="min-h-[70vh] bg-darb-cream">
        <section className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8">
          <div className="rounded-[2rem] bg-darb-green px-6 py-14 text-center text-darb-beige shadow-soft sm:px-10">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-darb-gold">
              Darb
            </p>

            <h1 className="mt-3 font-display text-4xl sm:text-5xl">
              Scent not
              found.
            </h1>

            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-darb-beige/65">
              {productQuery
                .error
                ?.friendlyMessage ||
                "This fragrance is unavailable right now."}
            </p>

            <Link
              to="/shop"
              className="mt-8 inline-flex rounded-full bg-darb-gold px-7 py-3.5 text-sm font-semibold text-darb-green transition hover:bg-darb-beige"
            >
              Back to Shop
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-[70vh] bg-darb-cream">
      {/* =========================
          BREADCRUMB
      ========================== */}

      <div className="border-b border-darb-gold/15">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-5 py-4 text-xs text-darb-muted sm:px-6 lg:px-8">
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 transition hover:text-darb-green"
          >
            <ArrowLeft
              size={14}
            />

            Shop
          </Link>

          <span>/</span>

          {categorySlug ? (
            <Link
              to={`/category/${categorySlug}`}
              className="transition hover:text-darb-green"
            >
              {categoryName}
            </Link>
          ) : (
            <span>
              {categoryName}
            </span>
          )}

          <span>/</span>

          <span className="truncate text-darb-green">
            {product.name}
          </span>
        </div>
      </div>

      {/* =========================
          MAIN PRODUCT
      ========================== */}

      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-14">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          {/* =========================
              GALLERY
          ========================== */}

          <div>
            <div className="relative overflow-hidden rounded-[1.75rem] bg-white shadow-soft sm:rounded-[2rem]">
              <div className="aspect-square">
                {selectedImage?.url ? (
                  <img
                    src={
                      selectedImage.url
                    }
                    alt={
                      selectedImage.alt ||
                      product.name
                    }
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-darb-green">
                    <div className="text-center">
                      <p className="font-display text-6xl text-darb-gold">
                        Darb
                      </p>

                      <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-darb-beige/60">
                        Visual coming
                        soon
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Badges */}

              <div className="absolute left-4 top-4 flex flex-col items-start gap-2 sm:left-5 sm:top-5">
                {product.isNewArrival && (
                  <span className="rounded-full bg-darb-cream px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-darb-green shadow">
                    New
                  </span>
                )}

                {product.isBestSeller && (
                  <span className="rounded-full bg-darb-green px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-darb-beige shadow">
                    Best Seller
                  </span>
                )}
              </div>

              {images.length >
                1 && (
                <span className="absolute bottom-4 right-4 rounded-full bg-darb-black/65 px-3 py-1.5 text-[10px] font-semibold text-white backdrop-blur">
                  {safeImageIndex +
                    1}{" "}
                  /{" "}
                  {
                    images.length
                  }
                </span>
              )}
            </div>

            {/* Thumbnails */}

            {images.length >
              1 && (
              <div className="mt-3 grid grid-cols-3 gap-3 sm:mt-4">
                {images.map(
                  (
                    image,
                    index
                  ) => (
                    <button
                      key={
                        image.publicId ||
                        image.url ||
                        index
                      }
                      type="button"
                      onClick={() =>
                        setSelectedImageIndex(
                          index
                        )
                      }
                      aria-label={`View ${product.name} image ${
                        index + 1
                      }`}
                      className={`relative aspect-square overflow-hidden rounded-[1.2rem] border transition sm:rounded-[1.5rem] ${
                        safeImageIndex ===
                        index
                          ? "border-darb-green"
                          : "border-darb-gold/15 hover:border-darb-gold"
                      }`}
                    >
                      <img
                        src={
                          image.url
                        }
                        alt={
                          image.alt ||
                          `${product.name} ${
                            index +
                            1
                          }`
                        }
                        className="h-full w-full object-cover"
                      />
                    </button>
                  )
                )}
              </div>
            )}
          </div>

          {/* =========================
              PRODUCT INFORMATION
          ========================== */}

          <div className="lg:sticky lg:top-[125px] lg:self-start">
            {/* Category */}

            <div className="flex flex-wrap items-center gap-2">
              {categorySlug ? (
                <Link
                  to={`/category/${categorySlug}`}
                  className="text-[10px] font-semibold uppercase tracking-[0.24em] text-darb-gold transition hover:text-darb-green"
                >
                  {categoryName}
                </Link>
              ) : (
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-darb-gold">
                  {categoryName}
                </p>
              )}

              <span className="text-darb-gold/60">
                •
              </span>

              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-darb-muted">
                {concentration}
              </span>
            </div>

            {/* Name */}

            <h1 className="mt-4 font-display text-5xl leading-[1.02] text-darb-green sm:text-6xl">
              {product.name}
            </h1>

            {/* Description */}

            <p className="mt-5 max-w-xl text-sm leading-7 text-darb-muted sm:text-base">
              {product.shortDescription ||
                "A Darb fragrance made to become part of the journey and remain in the memory."}
            </p>

            {/* Price */}

            <div className="mt-7 flex flex-wrap items-end gap-3">
              {displayPrice >
              0 ? (
                <p className="font-display text-4xl text-darb-green">
                  {formatCurrency(
                    displayPrice
                  )}
                </p>
              ) : (
                <p className="font-display text-3xl text-darb-green">
                  Price coming
                  soon
                </p>
              )}

              {displayCompareAtPrice > displayPrice &&
                displayPrice >
                  0 && (
                  <p className="pb-1 text-base text-darb-muted line-through">
                    {formatCurrency(
                      displayCompareAtPrice
                    )}
                  </p>
                )}
            </div>

            {activeVariants.length > 1 && (
              <div className="mt-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-darb-muted">Choose size</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {activeVariants.map((variant) => (
                    <button key={variant.variantId} type="button"
                      onClick={() => { setSelectedVariantId(variant.variantId); setQuantity(1); setCartMessage(""); }}
                      className={`rounded-full border px-5 py-2.5 text-sm font-semibold transition ${String(selectedVariant?.variantId) === String(variant.variantId) ? "border-darb-green bg-darb-green text-darb-beige" : "border-darb-gold/30 bg-white text-darb-green"}`}>
                      {variant.label || variant.sku}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* =========================
                PRODUCT ESSENTIALS
            ========================== */}

            <div className="mt-7 grid grid-cols-2 border-y border-darb-gold/20">
              <ProductFact
                label="Size"
                value={
                  sizeLabel
                }
              />

              <ProductFact
                label="Concentration"
                value={
                  concentration
                }
                borderLeft
              />

              {scentFamily && (
                <ProductFact
                  label="Scent Family"
                  value={
                    scentFamily
                  }
                  borderTop
                />
              )}

              <ProductFact
                label="Availability"
                value={
                  canPurchase
                    ? getStockLabel(selectedStock)
                    : "Out of Stock"
                }
                borderLeft={
                  Boolean(
                    scentFamily
                  )
                }
                borderTop
              />
            </div>

            {/* =========================
                BUY BOX
            ========================== */}

            {canPurchase ? (
              <div className="mt-8">
                {/* Stock */}

                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-darb-green text-darb-beige">
                    <Check
                      size={12}
                      strokeWidth={
                        2.3
                      }
                    />
                  </span>

                  <p
                    className={`text-xs font-semibold ${
                      lowStock
                        ? "text-darb-gold"
                        : "text-darb-green"
                    }`}
                  >
                    {lowStock
                      ? `Only ${selectedStock} left`
                      : "Ready to order"}
                  </p>
                </div>

                {/* Quantity */}

                <div className="mt-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-darb-muted">
                    Quantity
                  </p>

                  <div className="mt-3 inline-flex items-center rounded-full border border-darb-gold/30 bg-white">
                    <button
                      type="button"
                      onClick={() =>
                        handleQuantityChange(
                          "decrease"
                        )
                      }
                      disabled={
                        quantity <=
                        1
                      }
                      className="flex h-12 w-12 items-center justify-center text-darb-green transition hover:text-darb-gold disabled:cursor-not-allowed disabled:opacity-30"
                      aria-label="Decrease quantity"
                    >
                      <Minus
                        size={
                          17
                        }
                      />
                    </button>

                    <span className="min-w-12 text-center text-sm font-semibold text-darb-green">
                      {
                        quantity
                      }
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        handleQuantityChange(
                          "increase"
                        )
                      }
                      disabled={
                        quantity >= selectedStock
                      }
                      className="flex h-12 w-12 items-center justify-center text-darb-green transition hover:text-darb-gold disabled:cursor-not-allowed disabled:opacity-30"
                      aria-label="Increase quantity"
                    >
                      <Plus
                        size={
                          17
                        }
                      />
                    </button>
                  </div>
                </div>

                {/* Add Cart */}

                <button
                  type="button"
                  onClick={
                    handleAddToCart
                  }
                  className="mt-5 inline-flex min-h-[56px] w-full items-center justify-center gap-3 rounded-full bg-darb-green px-8 text-sm font-bold uppercase tracking-[0.14em] text-darb-beige transition hover:bg-darb-black"
                >
                  <ShoppingBag
                    size={18}
                  />

                  Add to Cart
                </button>

                {cartMessage && (
                  <div className="mt-4 flex items-start gap-3 rounded-[1.2rem] border border-darb-green/15 bg-darb-green/5 px-4 py-3.5">
                    <Check
                      size={17}
                      className="mt-0.5 shrink-0 text-darb-green"
                    />

                    <p className="text-sm font-semibold text-darb-green">
                      {
                        cartMessage
                      }
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* =========================
                  WAITLIST
              ========================== */

              <div className="mt-8 rounded-[1.75rem] border border-darb-gold/20 bg-white p-5 shadow-soft sm:p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-darb-green text-darb-beige">
                    <Bell
                      size={18}
                    />
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-darb-gold">
                      Availability
                    </p>

                    <h2 className="mt-1 font-display text-3xl text-darb-green">
                      Join the
                      waitlist
                    </h2>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-7 text-darb-muted">
                  {unavailableReason ||
                    "Leave your details and Darb can contact you when this fragrance becomes available."}
                </p>

                {user && (
                  <button
                    type="button"
                    onClick={
                      prefillWaitlistFromAccount
                    }
                    className="mt-5 rounded-full border border-darb-gold/35 px-5 py-2.5 text-xs font-semibold text-darb-green transition hover:bg-darb-gold/10"
                  >
                    Use my account
                    details
                  </button>
                )}

                <form
                  onSubmit={
                    handleWaitlistSubmit
                  }
                  className="mt-6 space-y-4"
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <WaitlistField
                      label="Name *"
                      name="name"
                      value={
                        waitlistForm.name
                      }
                      onChange={
                        handleWaitlistChange
                      }
                      placeholder="Your name"
                    />

                    <WaitlistField
                      label="Phone"
                      name="phone"
                      value={
                        waitlistForm.phone
                      }
                      onChange={
                        handleWaitlistChange
                      }
                      placeholder="01xxxxxxxxx"
                    />

                    <div className="sm:col-span-2">
                      <WaitlistField
                        label="Email"
                        name="email"
                        value={
                          waitlistForm.email
                        }
                        onChange={
                          handleWaitlistChange
                        }
                        placeholder="example@email.com"
                        type="email"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label>
                        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.13em] text-darb-green">
                          Note
                        </span>

                        <textarea
                          name="note"
                          value={
                            waitlistForm.note
                          }
                          onChange={
                            handleWaitlistChange
                          }
                          rows={3}
                          className="w-full rounded-[1.2rem] border border-darb-gold/30 bg-darb-cream px-4 py-3 text-sm outline-none transition focus:border-darb-green"
                          placeholder="Optional note"
                        />
                      </label>
                    </div>
                  </div>

                  {waitlistError && (
                    <div className="rounded-[1.2rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {
                        waitlistError
                      }
                    </div>
                  )}

                  {waitlistMessage && (
                    <div className="rounded-[1.2rem] border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                      {
                        waitlistMessage
                      }
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={
                      waitlistMutation.isPending
                    }
                    className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-darb-green px-7 text-sm font-bold uppercase tracking-[0.13em] text-darb-beige transition hover:bg-darb-black disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Bell
                      size={17}
                    />

                    {waitlistMutation.isPending
                      ? "Joining..."
                      : "Join Waitlist"}
                  </button>

                  <p className="text-[11px] leading-5 text-darb-muted">
                    Add at least
                    a phone number
                    or email so
                    Darb can reach
                    you.
                  </p>
                </form>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* =========================
          SCENT STORY
      ========================== */}

      <section className="border-t border-darb-gold/20">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-8">
          {/* Story */}

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-darb-gold">
              The Journey
            </p>

            <h2 className="mt-3 font-display text-4xl text-darb-green sm:text-5xl">
              The scent
            </h2>

            <p className="mt-6 whitespace-pre-line text-sm leading-8 text-darb-muted sm:text-base">
              {product.description ||
                "Darb is more than perfume. It is a journey carried softly in every step, leaving behind a memory that stays."}
            </p>
          </div>

          {/* Details */}

          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[1.75rem] border border-darb-gold/20 bg-darb-gold/20">
            <DetailCell
              label="Fragrance"
              value={
                product.name
              }
            />

            <DetailCell
              label="Collection"
              value={
                categoryName
              }
            />

            <DetailCell
              label="Size"
              value={
                sizeLabel
              }
            />

            <DetailCell
              label="Concentration"
              value={
                concentration
              }
            />

            <DetailCell
              label="Scent Family"
              value={
                scentFamily ||
                "Coming soon"
              }
            />

            <DetailCell
              label="Darb"
              value="A scent for every path"
            />
          </div>
        </div>
      </section>

      {/* =========================
          SCENT NOTES
      ========================== */}

      <section className="bg-darb-green text-darb-beige">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-darb-gold">
              Composition
            </p>

            <h2 className="mt-3 font-display text-4xl sm:text-5xl">
              Scent Notes
            </h2>
          </div>

          <div className="mx-auto mt-9 grid max-w-5xl gap-px overflow-hidden rounded-[1.75rem] border border-darb-gold/20 bg-darb-gold/20 md:grid-cols-3">
            <ScentNote
              number="01"
              label="Top Notes"
              notes={
                product
                  .scentNotes
                  ?.top
              }
            />

            <ScentNote
              number="02"
              label="Middle Notes"
              notes={
                product
                  .scentNotes
                  ?.middle
              }
            />

            <ScentNote
              number="03"
              label="Base Notes"
              notes={
                product
                  .scentNotes
                  ?.base
              }
            />
          </div>
        </div>
      </section>

      {/* =========================
          RELATED PRODUCTS
      ========================== */}

      {relatedProducts.length >
        0 && (
        <section className="border-t border-darb-gold/20">
          <div className="mx-auto max-w-7xl px-5 py-12 sm:px-6 sm:py-16 lg:px-8">
            <div className="flex items-end justify-between gap-6">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-darb-gold">
                  Continue the
                  journey
                </p>

                <h2 className="mt-2 font-display text-4xl text-darb-green sm:text-5xl">
                  You may also
                  like.
                </h2>
              </div>

              {categorySlug && (
                <Link
                  to={`/category/${categorySlug}`}
                  className="hidden text-xs font-semibold text-darb-green underline decoration-darb-gold underline-offset-4 transition hover:text-darb-gold sm:block"
                >
                  View{" "}
                  {categoryName}
                </Link>
              )}
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
              {relatedProducts.map(
                (
                  relatedProduct
                ) => (
                  <ProductCard
                    key={
                      relatedProduct._id ||
                      relatedProduct.slug
                    }
                    product={
                      relatedProduct
                    }
                  />
                )
              )}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

/* =========================
   PRODUCT FACT
========================== */

function ProductFact({
  label,
  value,
  borderLeft = false,
  borderTop = false,
}) {
  return (
    <div
      className={`
        py-5

        ${
          borderLeft
            ? "border-l border-darb-gold/20 pl-5"
            : "pr-5"
        }

        ${
          borderTop
            ? "border-t border-darb-gold/20"
            : ""
        }
      `}
    >
      <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-darb-gold">
        {label}
      </p>

      <p className="mt-2 text-sm font-semibold text-darb-green">
        {value}
      </p>
    </div>
  );
}

/* =========================
   DETAIL CELL
========================== */

function DetailCell({
  label,
  value,
}) {
  return (
    <div className="bg-darb-cream p-5 sm:p-6">
      <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-darb-gold">
        {label}
      </p>

      <p className="mt-2 text-sm font-semibold leading-6 text-darb-green">
        {value}
      </p>
    </div>
  );
}

/* =========================
   SCENT NOTE
========================== */

function ScentNote({
  number,
  label,
  notes,
}) {
  return (
    <article className="bg-darb-green p-6 sm:p-8">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-darb-gold">
        {number}
      </p>

      <h3 className="mt-4 font-display text-2xl text-darb-beige">
        {label}
      </h3>

      <p className="mt-4 text-sm leading-7 text-darb-beige/60">
        {notes?.length
          ? notes.join(", ")
          : "To be revealed."}
      </p>
    </article>
  );
}

/* =========================
   WAITLIST FIELD
========================== */

function WaitlistField({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
}) {
  return (
    <label>
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.13em] text-darb-green">
        {label}
      </span>

      <input
        name={name}
        value={value}
        onChange={onChange}
        type={type}
        className="w-full rounded-full border border-darb-gold/30 bg-darb-cream px-4 py-3 text-sm outline-none transition focus:border-darb-green"
        placeholder={
          placeholder
        }
      />
    </label>
  );
}

export default ProductDetails;
