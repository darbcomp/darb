import { Link, useLocation } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { formatCurrency } from "../../utils/formatCurrency";

function OrderSuccess() {
  const location = useLocation();
  const order = location.state?.order;
  const message = location.state?.message || "Your order has been placed.";

  return (
    <section className="mx-auto max-w-7xl px-4 py-14">
      <div className="rounded-[2rem] bg-darb-green p-8 text-darb-beige shadow-soft">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-darb-gold text-darb-green">
          <CheckCircle size={34} />
        </div>

        <p className="mt-8 text-sm font-semibold uppercase tracking-[0.3em] text-darb-gold">
          Order Confirmed
        </p>

        <h1 className="mt-2 font-display text-5xl">
          Your Darb journey has begun
        </h1>

        <p className="mt-4 max-w-2xl leading-7 text-darb-beige/75">
          {message}
        </p>

        {order && (
          <div className="mt-8 grid gap-4 rounded-[1.5rem] border border-darb-gold/25 bg-darb-beige/10 p-6 md:grid-cols-3">
            <div>
              <p className="text-sm text-darb-beige/60">Order Number</p>
              <p className="mt-1 font-semibold text-darb-gold">
                {order.orderNumber}
              </p>
            </div>

            <div>
              <p className="text-sm text-darb-beige/60">Status</p>
              <p className="mt-1 font-semibold capitalize text-darb-gold">
                {order.orderStatus}
              </p>
            </div>

            <div>
              <p className="text-sm text-darb-beige/60">Total</p>
              <p className="mt-1 font-semibold text-darb-gold">
                {formatCurrency(order.total)}
              </p>
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            to="/shop"
            className="rounded-full bg-darb-gold px-7 py-3 text-sm font-semibold text-darb-green transition hover:bg-darb-beige"
          >
            Continue Shopping
          </Link>

          <Link
            to="/account/orders"
            className="rounded-full border border-darb-gold px-7 py-3 text-sm font-semibold text-darb-beige transition hover:bg-darb-beige/10"
          >
            My Orders
          </Link>
        </div>
      </div>
    </section>
  );
}

export default OrderSuccess;