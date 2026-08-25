import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Package, ShoppingBag } from "lucide-react";
import { getMyOrders } from "../../api/orderApi";
import { formatCurrency } from "../../utils/formatCurrency";

const statusStyles = {
  pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  confirmed: "bg-blue-50 text-blue-700 border-blue-200",
  processing: "bg-purple-50 text-purple-700 border-purple-200",
  shipped: "bg-indigo-50 text-indigo-700 border-indigo-200",
  delivered: "bg-green-50 text-green-700 border-green-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
  paid: "bg-green-50 text-green-700 border-green-200",
  failed: "bg-red-50 text-red-700 border-red-200",
  refunded: "bg-gray-50 text-gray-700 border-gray-200",
};

const formatStatus = (status = "") => {
  return status.replaceAll("_", " ");
};

const formatDate = (date) => {
  if (!date) return "—";

  return new Intl.DateTimeFormat("en-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
};

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${
        statusStyles[status] || "bg-gray-50 text-gray-700 border-gray-200"
      }`}
    >
      {formatStatus(status)}
    </span>
  );
}

function MyOrders() {
  const ordersQuery = useQuery({
    queryKey: ["my-orders"],
    queryFn: getMyOrders,
    retry: 1,
  });

  const orders = ordersQuery.data?.data || [];

  return (
    <section className="mx-auto max-w-7xl px-4 py-14">
      <div className="mb-10 rounded-[2rem] bg-darb-green p-8 text-darb-beige shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-darb-gold">
          Account
        </p>

        <h1 className="mt-2 font-display text-5xl">My Orders</h1>

        <p className="mt-4 max-w-2xl leading-7 text-darb-beige/75">
          Follow every Darb order from the moment it begins until it reaches
          your door.
        </p>
      </div>

      {ordersQuery.isLoading && (
        <div className="rounded-[1.5rem] border border-darb-gold/20 bg-white p-8 shadow-soft">
          <p className="text-darb-muted">Loading your orders...</p>
        </div>
      )}

      {ordersQuery.isError && (
        <div className="rounded-[1.5rem] border border-red-200 bg-red-50 p-8 shadow-soft">
          <h2 className="font-display text-3xl text-red-700">
            Could not load orders
          </h2>
          <p className="mt-3 leading-7 text-red-700">
            {ordersQuery.error?.friendlyMessage ||
              "Orders are unavailable right now."}
          </p>
        </div>
      )}

      {!ordersQuery.isLoading && !ordersQuery.isError && orders.length === 0 && (
        <div className="rounded-[1.5rem] border border-darb-gold/25 bg-white p-8 shadow-soft">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-darb-green text-darb-beige">
            <ShoppingBag size={26} />
          </div>

          <h2 className="mt-6 font-display text-3xl text-darb-green">
            No orders yet
          </h2>

          <p className="mt-3 max-w-2xl leading-7 text-darb-muted">
            Your Darb order history will appear here after your first purchase.
          </p>

          <Link
            to="/shop"
            className="mt-6 inline-flex rounded-full bg-darb-green px-7 py-3 text-sm font-semibold text-darb-beige transition hover:bg-darb-black"
          >
            Shop Darb
          </Link>
        </div>
      )}

      {!ordersQuery.isLoading && !ordersQuery.isError && orders.length > 0 && (
        <div className="space-y-5">
          {orders.map((order) => {
            const previewItems = order.items?.slice(0, 3) || [];
            const remainingItemsCount = Math.max(
              (order.items?.length || 0) - previewItems.length,
              0
            );

            return (
              <article
                key={order._id}
                className="overflow-hidden rounded-[1.5rem] border border-darb-gold/20 bg-white shadow-soft"
              >
                <div className="grid gap-5 border-b border-darb-gold/10 p-6 lg:grid-cols-[1fr_auto]">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-darb-green text-darb-beige">
                        <Package size={20} />
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-darb-gold">
                          Order
                        </p>
                        <h2 className="font-display text-3xl text-darb-green">
                          {order.orderNumber}
                        </h2>
                      </div>
                    </div>

                    <p className="mt-4 text-sm text-darb-muted">
                      Placed on {formatDate(order.createdAt)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-start gap-3 lg:justify-end">
                    <StatusBadge status={order.orderStatus} />
                    <StatusBadge status={order.paymentStatus} />
                  </div>
                </div>

                <div className="grid gap-6 p-6 lg:grid-cols-[1fr_260px]">
                  <div className="space-y-3">
                    {previewItems.map((item, index) => (
                      <div
                        key={`${order._id}-${item.productSnapshot?.slug || index}`}
                        className="flex items-center gap-4 rounded-2xl bg-darb-cream/70 p-3"
                      >
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-darb-green">
                          {item.productSnapshot?.image ? (
                            <img
                              src={item.productSnapshot.image}
                              alt={item.productSnapshot.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <p className="font-display text-xs text-darb-gold">
                              Darb
                            </p>
                          )}
                        </div>

                        <div className="flex-1">
                          <p className="font-semibold text-darb-green">
                            {item.productSnapshot?.name || "Darb Product"}
                          </p>
                          <p className="mt-1 text-xs text-darb-muted">
                            Qty: {item.quantity}
                            {item.productSnapshot?.sizeLabel
                              ? ` • ${item.productSnapshot.sizeLabel}`
                              : ""}
                          </p>
                        </div>

                        <p className="text-sm font-semibold text-darb-black">
                          {formatCurrency(item.lineTotal)}
                        </p>
                      </div>
                    ))}

                    {remainingItemsCount > 0 && (
                      <p className="text-sm font-semibold text-darb-muted">
                        + {remainingItemsCount} more item
                        {remainingItemsCount === 1 ? "" : "s"}
                      </p>
                    )}
                  </div>

                  <div className="rounded-[1.25rem] border border-darb-gold/20 p-5">
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between gap-4">
                        <span className="text-darb-muted">Subtotal</span>
                        <span className="font-semibold text-darb-black">
                          {formatCurrency(order.subtotal)}
                        </span>
                      </div>

                      <div className="flex justify-between gap-4">
                        <span className="text-darb-muted">Discount</span>
                        <span className="font-semibold text-darb-green">
                          -{formatCurrency(order.discountTotal)}
                        </span>
                      </div>

                      <div className="flex justify-between gap-4">
                        <span className="text-darb-muted">Delivery</span>
                        <span className="font-semibold text-darb-black">
                          {formatCurrency(order.deliveryFee)}
                        </span>
                      </div>
                    </div>

                    <div className="my-4 border-t border-darb-gold/20" />

                    <div className="flex justify-between gap-4">
                      <span className="font-semibold text-darb-green">
                        Total
                      </span>
                      <span className="font-display text-2xl text-darb-green">
                        {formatCurrency(order.total)}
                      </span>
                    </div>

                    <p className="mt-4 text-xs capitalize text-darb-muted">
                      Payment: {formatStatus(order.paymentMethod)}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default MyOrders;