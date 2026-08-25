import { Link } from "react-router-dom";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "../../context/CartContext";
import { formatCurrency } from "../../utils/formatCurrency";

function Cart() {
  const {
    items,
    isEmpty,
    subtotal,
    productSavings,
    itemCount,
    incrementItem,
    decrementItem,
    removeItem,
    clearCart,
  } = useCart();

  if (isEmpty) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-14">
        <div className="rounded-[2rem] bg-darb-green p-8 text-darb-beige shadow-soft">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-darb-gold">
            Your Cart
          </p>
          <h1 className="mt-2 font-display text-5xl">Your path is still empty</h1>
          <p className="mt-4 max-w-2xl leading-7 text-darb-beige/75">
            Add a Darb scent to your cart and start your fragrance journey.
          </p>

          <Link
            to="/shop"
            className="mt-8 inline-flex rounded-full bg-darb-gold px-7 py-3 text-sm font-semibold text-darb-green transition hover:bg-darb-beige"
          >
            Shop Darb
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-14">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-darb-gold">
            Your Cart
          </p>
          <h1 className="mt-2 font-display text-5xl text-darb-green">
            Selected scents
          </h1>
          <p className="mt-3 text-darb-muted">
            {itemCount} {itemCount === 1 ? "item" : "items"} in your cart.
          </p>
        </div>

        <button
          onClick={clearCart}
          className="rounded-full border border-darb-gold/40 px-5 py-3 text-sm font-semibold text-darb-green transition hover:bg-darb-gold/15"
        >
          Clear Cart
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          {items.map((item) => (
            <article
              key={item.cartItemId}
              className="grid gap-5 rounded-[1.5rem] border border-darb-gold/20 bg-white p-4 shadow-soft md:grid-cols-[120px_1fr_auto]"
            >
              <Link
                to={`/product/${item.slug}`}
                className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-darb-green"
              >
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="text-center">
                    <p className="font-display text-2xl text-darb-gold">Darb</p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-darb-beige/70">
                      Visual soon
                    </p>
                  </div>
                )}
              </Link>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-darb-gold">
                  {item.categoryName || "Darb"}
                </p>

                <Link to={`/product/${item.slug}`}>
                  <h2 className="mt-2 font-display text-3xl text-darb-green">
                    {item.name}
                  </h2>
                </Link>

                <p className="mt-2 text-sm text-darb-muted">
                  {item.sizeLabel || "Size to be added"}
                </p>

                <p className="mt-4 font-semibold text-darb-black">
                  {formatCurrency(item.price)}
                </p>

                {item.compareAtPrice > item.price && (
                  <p className="text-sm text-darb-muted line-through">
                    {formatCurrency(item.compareAtPrice)}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between gap-4 md:flex-col md:items-end">
                <div className="flex items-center rounded-full border border-darb-gold/30">
                  <button
                    onClick={() => decrementItem(item.cartItemId)}
                    className="p-3 text-darb-green transition hover:text-darb-black"
                    aria-label="Decrease quantity"
                  >
                    <Minus size={16} />
                  </button>

                  <span className="min-w-10 text-center text-sm font-semibold">
                    {item.quantity}
                  </span>

                  <button
                    onClick={() => incrementItem(item.cartItemId)}
                    className="p-3 text-darb-green transition hover:text-darb-black"
                    aria-label="Increase quantity"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                <button
                  onClick={() => removeItem(item.cartItemId)}
                  className="rounded-full border border-red-200 p-3 text-red-600 transition hover:bg-red-50"
                  aria-label="Remove item"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))}
        </div>

        <aside className="h-fit rounded-[1.5rem] border border-darb-gold/20 bg-white p-6 shadow-soft">
          <h2 className="font-display text-3xl text-darb-green">Order Summary</h2>

          <div className="mt-6 space-y-4 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-darb-muted">Subtotal</span>
              <span className="font-semibold text-darb-black">
                {formatCurrency(subtotal)}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-darb-muted">Product savings</span>
              <span className="font-semibold text-darb-green">
                {productSavings > 0 ? `-${formatCurrency(productSavings)}` : formatCurrency(0)}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-darb-muted">Offers / bundles</span>
              <span className="font-semibold text-darb-muted">Next step</span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-darb-muted">Delivery</span>
              <span className="font-semibold text-darb-muted">At checkout</span>
            </div>
          </div>

          <div className="my-6 border-t border-darb-gold/20" />

          <div className="flex justify-between gap-4">
            <span className="font-semibold text-darb-green">Estimated Total</span>
            <span className="font-display text-3xl text-darb-green">
              {formatCurrency(subtotal)}
            </span>
          </div>

          <Link
            to="/checkout"
            className="mt-6 flex w-full justify-center rounded-full bg-darb-green px-6 py-3 text-sm font-semibold text-darb-beige transition hover:bg-darb-black"
          >
            Continue to Checkout
          </Link>

          <Link
            to="/shop"
            className="mt-3 flex w-full justify-center rounded-full border border-darb-gold px-6 py-3 text-sm font-semibold text-darb-green transition hover:bg-darb-gold/15"
          >
            Continue Shopping
          </Link>
        </aside>
      </div>
    </section>
  );
}

export default Cart;