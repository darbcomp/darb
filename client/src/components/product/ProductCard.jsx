import { Link } from "react-router-dom";
import { ShoppingBag } from "lucide-react";

import { formatCurrency } from "../../utils/formatCurrency";

function ProductCard({ product }) {
  const images = [...(product?.images || [])]
    .sort((a, b) => Number(Boolean(b.isMain)) - Number(Boolean(a.isMain)))
    .slice(0, 3);

  const mainImage = images[0];
  const hoverImage = images[1];

  return (
    <article className="group overflow-hidden rounded-[1.75rem] border border-darb-gold/20 bg-white shadow-soft transition hover:-translate-y-1 hover:border-darb-gold/50">
      <Link to={`/product/${product.slug}`} className="block">
        <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden bg-darb-green">
          {mainImage?.url ? (
            <>
              <img
                src={mainImage.url}
                alt={mainImage.alt || product.name}
                className={`h-full w-full object-cover transition duration-500 ${
                  hoverImage ? "group-hover:opacity-0" : "group-hover:scale-105"
                }`}
              />

              {hoverImage?.url && (
                <img
                  src={hoverImage.url}
                  alt={hoverImage.alt || `${product.name} alternate view`}
                  className="absolute inset-0 h-full w-full object-cover opacity-0 transition duration-500 group-hover:scale-105 group-hover:opacity-100"
                />
              )}
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,#C8A97E33,#0F3D2E_55%)] px-6 text-center">
              <div>
                <p className="font-display text-4xl text-darb-gold">Darb</p>
                <p className="mt-2 text-xs uppercase tracking-[0.35em] text-darb-beige/70">
                  Visual soon
                </p>
              </div>
            </div>
          )}

          {product.isNewArrival && !product.isPlaceholder && (
            <span className="absolute left-4 top-4 rounded-full bg-darb-gold px-3 py-1 text-xs font-semibold text-darb-green">
              New
            </span>
          )}

          {product.isBestSeller && !product.isPlaceholder && (
            <span className="absolute right-4 top-4 rounded-full bg-darb-beige px-3 py-1 text-xs font-semibold text-darb-green">
              Best Seller
            </span>
          )}
        </div>

        <div className="p-5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-darb-gold">
              {product.category?.name ||
                product.categorySnapshot?.name ||
                "Darb"}
            </p>

            <p className="text-xs text-darb-muted">
              {product.sizeLabel ||
                (product.sizeMl ? `${product.sizeMl} ML` : "50 ML")}
            </p>
          </div>

          <h3 className="line-clamp-2 font-display text-2xl text-darb-green">
            {product.name}
          </h3>

          <p className="mt-2 line-clamp-2 min-h-[3rem] text-sm leading-6 text-darb-muted">
            {product.shortDescription ||
              product.description ||
              "A scent waiting to begin its path."}
          </p>

          <div className="mt-5 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-darb-black">
                {product.price > 0
                  ? formatCurrency(product.price)
                  : "Price soon"}
              </p>

              {product.compareAtPrice > product.price && product.price > 0 && (
                <p className="text-sm text-darb-muted line-through">
                  {formatCurrency(product.compareAtPrice)}
                </p>
              )}

              {product.stock <= 0 && (
                <p className="mt-1 text-xs font-semibold text-darb-muted">
                  Join waitlist
                </p>
              )}
            </div>

            <div className="rounded-full bg-darb-green p-3 text-darb-beige transition group-hover:bg-darb-gold group-hover:text-darb-green">
              <ShoppingBag size={18} />
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}

export default ProductCard;
