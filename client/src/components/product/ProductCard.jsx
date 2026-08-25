import { Link } from "react-router-dom";
import { ShoppingBag } from "lucide-react";

import { formatCurrency } from "../../utils/formatCurrency";

function ProductCard({ product }) {
  const images = [
    ...(product?.images || []),
  ]
    .sort(
      (a, b) =>
        Number(Boolean(b.isMain)) -
        Number(Boolean(a.isMain))
    )
    .slice(0, 3);

  const mainImage = images[0];
  const hoverImage = images[1];

  const categoryName =
    product.category?.name ||
    product.categorySnapshot?.name ||
    "Darb";

  const size =
    product.sizeLabel ||
    (product.sizeMl
      ? `${product.sizeMl} ML`
      : "50 ML");

  const hasDiscount =
    Number(product.compareAtPrice) >
      Number(product.price) &&
    Number(product.price) > 0;

  return (
    <article
      className="
        group flex h-full flex-col
        overflow-hidden
        rounded-[1.25rem]
        border border-darb-gold/20
        bg-white
        shadow-soft
        transition duration-300

        sm:rounded-[1.75rem]

        md:hover:-translate-y-1
        md:hover:border-darb-gold/50
      "
    >
      <Link
        to={`/product/${product.slug}`}
        className="flex h-full flex-col"
      >
        {/* PRODUCT IMAGE */}
        <div
          className="
            relative
            aspect-[4/5]
            overflow-hidden
            bg-darb-green
          "
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

                <p className="mt-2 text-[8px] font-semibold uppercase tracking-[0.25em] text-darb-beige/65 sm:text-xs sm:tracking-[0.35em]">
                  Visual soon
                </p>
              </div>
            </div>
          )}

          {/* BADGES */}
          <div className="absolute left-2 top-2 flex flex-col items-start gap-1.5 sm:left-4 sm:top-4">
            {product.isBestSeller &&
              !product.isPlaceholder && (
                <span
                  className="
                    rounded-full
                    bg-darb-beige
                    px-2 py-1
                    text-[8px]
                    font-bold
                    uppercase
                    tracking-[0.08em]
                    text-darb-green

                    sm:px-3
                    sm:text-[10px]
                  "
                >
                  Best Seller
                </span>
              )}

            {product.isNewArrival &&
              !product.isPlaceholder && (
                <span
                  className="
                    rounded-full
                    bg-darb-gold
                    px-2 py-1
                    text-[8px]
                    font-bold
                    uppercase
                    tracking-[0.08em]
                    text-darb-green

                    sm:px-3
                    sm:text-[10px]
                  "
                >
                  New
                </span>
              )}
          </div>
        </div>

        {/* PRODUCT INFORMATION */}
        <div className="flex flex-1 flex-col p-3.5 sm:p-5">
          <div className="mb-1.5 flex items-center justify-between gap-2 sm:mb-2">
            <p
              className="
                min-w-0 truncate
                text-[8px]
                font-semibold
                uppercase
                tracking-[0.18em]
                text-darb-gold

                sm:text-xs
                sm:tracking-[0.25em]
              "
            >
              {categoryName}
            </p>

            <p className="shrink-0 text-[9px] text-darb-muted sm:text-xs">
              {size}
            </p>
          </div>

          <h3
            className="
              line-clamp-2
              font-display
              text-xl
              leading-tight
              text-darb-green

              sm:text-2xl
            "
          >
            {product.name}
          </h3>

          {/* Description hidden on narrow mobile cards */}
          <p
            className="
              mt-2 hidden
              line-clamp-2
              min-h-[3rem]
              text-sm
              leading-6
              text-darb-muted

              sm:block
            "
          >
            {product.shortDescription ||
              product.description ||
              "A scent waiting to begin its path."}
          </p>

          <div className="mt-auto flex items-end justify-between gap-2 pt-4 sm:gap-4 sm:pt-5">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-darb-black sm:text-base">
                {product.price > 0
                  ? formatCurrency(
                      product.price
                    )
                  : "Price soon"}
              </p>

              {hasDiscount && (
                <p className="mt-0.5 text-[10px] text-darb-muted line-through sm:text-sm">
                  {formatCurrency(
                    product.compareAtPrice
                  )}
                </p>
              )}

              {product.stock <= 0 && (
                <p className="mt-1 text-[9px] font-semibold text-darb-muted sm:text-xs">
                  Join waitlist
                </p>
              )}
            </div>

            <div
              className="
                flex h-9 w-9 shrink-0
                items-center justify-center
                rounded-full
                bg-darb-green
                text-darb-beige
                transition

                sm:h-11 sm:w-11

                md:group-hover:bg-darb-gold
                md:group-hover:text-darb-green
              "
            >
              <ShoppingBag
                size={16}
                strokeWidth={1.8}
                className="sm:hidden"
              />

              <ShoppingBag
                size={18}
                strokeWidth={1.8}
                className="hidden sm:block"
              />
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}

export default ProductCard;