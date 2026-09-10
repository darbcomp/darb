import { ShoppingBag } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { useCart } from "../../context/useCart";
import { flyProductImageToCart } from "../../utils/flyToCart";
import { formatCurrency } from "../../utils/formatCurrency";
import { getActiveProductVariants } from "../../utils/productVariants";

function ProductCard({ product }) {
  const navigate = useNavigate();
  const {
    addToCart,
    items,
  } = useCart();

  const images = [
    ...(product?.images || []),
  ]
    .sort(
      (a, b) =>
        Number(Boolean(b.isMain)) -
        Number(Boolean(a.isMain))
    );

  const mainImage = images[0];
  const hoverImage = images[1];

  const categoryName =
    product.category?.name ||
    product.categorySnapshot?.name ||
    "Darb";

  const activeVariants = getActiveProductVariants(product);
  const quickVariant = activeVariants.length === 1 ? activeVariants[0] : null;
  const size = quickVariant?.label || `${activeVariants.length} sizes`;
  const displayVariant = quickVariant || activeVariants.find((variant) => Number(variant.price) > 0) || activeVariants[0];
  const price = Number(displayVariant?.price || product.price);
  const stock = quickVariant ? Number(quickVariant.stock) : Math.max(...activeVariants.map((variant) => Number(variant.stock) || 0), 0);

  const hasDiscount =
    Number(product.compareAtPrice) >
      price &&
    price > 0;

  const canPurchase =
    product.isActive &&
    !product.isPlaceholder &&
    Number.isFinite(price) &&
    price > 0 &&
    Number.isFinite(stock) &&
    stock > 0;

  const cartItemId = `${
    product._id || product.slug
  }_${quickVariant?.variantId || "default"}`;

  const cartQuantity =
    items.find(
      (item) =>
        item.cartItemId ===
        cartItemId
    )?.quantity || 0;

  const atCartLimit =
    canPurchase &&
    cartQuantity >= stock;

  const handleAddToCart = (
    event
  ) => {
    if (!quickVariant) {
      navigate(`/product/${product.slug}`);
      return;
    }
    if (
      !canPurchase ||
      atCartLimit
    ) {
      return;
    }

    addToCart(product, 1, quickVariant.isLegacy ? null : quickVariant);

    flyProductImageToCart({
      imageUrl: mainImage?.url,
      origin:
        event.currentTarget,
    });
  };

  return (
    <article
      className="
        group flex h-full flex-col
        overflow-hidden
        rounded-[1.25rem]
        border border-darb-gold/20
        bg-darb-surface
        shadow-soft
        transition duration-300

        sm:rounded-[1.75rem]

        md:hover:-translate-y-1
        md:hover:border-darb-gold/50
      "
    >
      <Link
        to={`/product/${product.slug}`}
        className="relative block aspect-[4/5] overflow-hidden bg-darb-green"
        aria-label={product.name}
      >
        {mainImage?.url ? (
          <>
            <img
              src={mainImage.url}
              alt={
                mainImage.alt ||
                product.name
              }
              className={`
                h-full w-full object-cover
                transition duration-500
                ${
                  hoverImage
                    ? "md:group-hover:opacity-0"
                    : "md:group-hover:scale-105"
                }
              `}
              loading="lazy"
              decoding="async"
            />

            {hoverImage?.url && (
              <img
                src={hoverImage.url}
                alt={
                  hoverImage.alt ||
                  `${product.name} alternate view`
                }
                className="
                  absolute inset-0
                  h-full w-full
                  object-cover
                  opacity-0
                  transition duration-500

                  md:group-hover:scale-105
                  md:group-hover:opacity-100
                "
                loading="lazy"
                decoding="async"
              />
            )}
          </>
        ) : (
          <div
            className="
              flex h-full w-full
              items-center justify-center
              bg-[radial-gradient(circle_at_top,#C8A97E33,#0F3D2E_55%)]
              px-4 text-center
            "
          >
            <div>
              <p className="font-display text-3xl text-darb-gold sm:text-4xl">
                Darb
              </p>

            </div>
          </div>
        )}

        <div className="absolute left-2 top-2 flex flex-col items-start gap-1.5 sm:left-4 sm:top-4">
          {product.isBestSeller &&
            !product.isPlaceholder && (
              <span className="rounded-full bg-darb-beige px-2 py-1 text-[8px] font-bold uppercase tracking-[0.08em] text-darb-green sm:px-3 sm:text-[10px]">
                Best Seller
              </span>
            )}

          {product.isNewArrival &&
            !product.isPlaceholder && (
              <span className="rounded-full bg-darb-gold px-2 py-1 text-[8px] font-bold uppercase tracking-[0.08em] text-darb-green sm:px-3 sm:text-[10px]">
                New
              </span>
            )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-3.5 sm:p-5">
        <div className="mb-1.5 flex items-center justify-between gap-2 sm:mb-2">
          <p className="min-w-0 truncate text-[8px] font-semibold uppercase tracking-[0.18em] text-darb-gold sm:text-xs sm:tracking-[0.25em]">
            {categoryName}
          </p>

          <p className="shrink-0 text-[9px] text-darb-muted sm:text-xs">
            {size}
          </p>
        </div>

        <h3 className="line-clamp-2 font-display text-xl leading-tight text-darb-green sm:text-2xl">
          <Link
            to={`/product/${product.slug}`}
            className="transition hover:text-darb-black"
          >
            {product.name}
          </Link>
        </h3>

        <p className="mt-2 hidden line-clamp-2 min-h-[3rem] text-sm leading-6 text-darb-muted sm:block">
          {product.shortDescription || product.description}
        </p>

        <div className="mt-auto pt-4 sm:pt-5">
          <p className="truncate text-sm font-semibold text-darb-black sm:text-base">
            {price > 0
              ? formatCurrency(price)
              : "Unavailable"}
          </p>

          {hasDiscount && (
            <p className="mt-0.5 text-[10px] text-darb-muted line-through sm:text-sm">
              {formatCurrency(
                product.compareAtPrice
              )}
            </p>
          )}

          {stock <= 0 && (
            <p className="mt-1 text-[9px] font-semibold text-darb-muted sm:text-xs">
              Join waitlist
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={
            handleAddToCart
          }
          disabled={
            !canPurchase ||
            atCartLimit
          }
          className="mt-3 inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-full bg-darb-green px-2 text-[10px] font-semibold text-darb-beige transition hover:bg-darb-gold hover:text-darb-green active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-darb-muted/20 disabled:text-darb-muted disabled:hover:bg-darb-muted/20 sm:min-h-11 sm:gap-2 sm:px-4 sm:text-sm"
        >
          <ShoppingBag
            size={15}
            strokeWidth={1.8}
            aria-hidden="true"
          />

          {!quickVariant
            ? "Select Options"
            : atCartLimit
            ? "Max in Cart"
            : canPurchase
              ? "Add to Cart"
              : "Unavailable"}
        </button>
      </div>
    </article>
  );
}

export default ProductCard;
