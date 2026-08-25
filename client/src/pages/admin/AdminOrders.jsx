import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Filter, Package, Search } from "lucide-react";
import { getAdminOrders, updateAdminOrderStatus } from "../../api/adminApi";
import { formatCurrency } from "../../utils/formatCurrency";

const orderStatuses = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

const paymentStatuses = ["pending", "paid", "failed", "refunded"];

const paymentMethods = [
  "cash_on_delivery",
  "instapay",
  "vodafone_cash",
  "paymob_card",
];

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

const formatStatus = (value = "") => value.replaceAll("_", " ");

const formatDateTime = (date) => {
  if (!date) return "—";

  return new Intl.DateTimeFormat("en-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
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

function AdminOrders() {
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState({
    search: "",
    orderStatus: "",
    paymentStatus: "",
    paymentMethod: "",
  });

  const [editingOrderId, setEditingOrderId] = useState("");
  const [statusForm, setStatusForm] = useState({
    orderStatus: "",
    paymentStatus: "",
    adminNotes: "",
    note: "",
  });

  const queryParams = useMemo(() => {
    const params = {
      limit: 30,
    };

    if (filters.search.trim()) params.search = filters.search.trim();
    if (filters.orderStatus) params.orderStatus = filters.orderStatus;
    if (filters.paymentStatus) params.paymentStatus = filters.paymentStatus;
    if (filters.paymentMethod) params.paymentMethod = filters.paymentMethod;

    return params;
  }, [filters]);

  const ordersQuery = useQuery({
    queryKey: ["admin-orders", queryParams],
    queryFn: () => getAdminOrders(queryParams),
    retry: 1,
  });

  const updateMutation = useMutation({
    mutationFn: updateAdminOrderStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      setEditingOrderId("");
      setStatusForm({
        orderStatus: "",
        paymentStatus: "",
        adminNotes: "",
        note: "",
      });
    },
  });

  const orders = ordersQuery.data?.data || [];
  const pagination = ordersQuery.data?.pagination;

  const handleFilterChange = (event) => {
    const { name, value } = event.target;

    setFilters((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      orderStatus: "",
      paymentStatus: "",
      paymentMethod: "",
    });
  };

  const startEditing = (order) => {
    setEditingOrderId(order._id);
    setStatusForm({
      orderStatus: order.orderStatus || "",
      paymentStatus: order.paymentStatus || "",
      adminNotes: order.adminNotes || "",
      note: "",
    });
  };

  const handleStatusFormChange = (event) => {
    const { name, value } = event.target;

    setStatusForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const submitStatusUpdate = (orderId) => {
    updateMutation.mutate({
      orderId,
      payload: statusForm,
    });
  };

  return (
    <section>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-darb-gold">
            Admin
          </p>
          <h1 className="mt-2 font-display text-4xl text-darb-green">
            Orders
          </h1>
          <p className="mt-3 max-w-2xl text-darb-muted">
            Monitor customer orders, payment status, delivery progress, and
            admin notes.
          </p>
        </div>

        <div className="rounded-full border border-darb-gold/30 bg-white px-5 py-3 text-sm font-semibold text-darb-green shadow-soft">
          {pagination?.total || orders.length} orders
        </div>
      </div>

      <div className="mb-8 rounded-[1.5rem] border border-darb-gold/20 bg-white p-5 shadow-soft">
        <div className="mb-4 flex items-center gap-2 text-darb-green">
          <Filter size={18} />
          <h2 className="font-semibold">Filters</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.5fr_1fr_1fr_1fr_auto]">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-darb-muted"
            />
            <input
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Search order, customer, phone..."
              className="w-full rounded-full border border-darb-gold/30 py-3 pl-11 pr-5 outline-none transition focus:border-darb-green"
            />
          </div>

          <select
            name="orderStatus"
            value={filters.orderStatus}
            onChange={handleFilterChange}
            className="rounded-full border border-darb-gold/30 bg-white px-5 py-3 capitalize outline-none transition focus:border-darb-green"
          >
            <option value="">All order statuses</option>
            {orderStatuses.map((status) => (
              <option key={status} value={status}>
                {formatStatus(status)}
              </option>
            ))}
          </select>

          <select
            name="paymentStatus"
            value={filters.paymentStatus}
            onChange={handleFilterChange}
            className="rounded-full border border-darb-gold/30 bg-white px-5 py-3 capitalize outline-none transition focus:border-darb-green"
          >
            <option value="">All payment statuses</option>
            {paymentStatuses.map((status) => (
              <option key={status} value={status}>
                {formatStatus(status)}
              </option>
            ))}
          </select>

          <select
            name="paymentMethod"
            value={filters.paymentMethod}
            onChange={handleFilterChange}
            className="rounded-full border border-darb-gold/30 bg-white px-5 py-3 capitalize outline-none transition focus:border-darb-green"
          >
            <option value="">All payment methods</option>
            {paymentMethods.map((method) => (
              <option key={method} value={method}>
                {formatStatus(method)}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={resetFilters}
            className="rounded-full border border-darb-gold/40 px-5 py-3 text-sm font-semibold text-darb-green transition hover:bg-darb-gold/15"
          >
            Reset
          </button>
        </div>
      </div>

      {ordersQuery.isLoading && (
        <div className="rounded-[1.5rem] border border-darb-gold/20 bg-white p-8 shadow-soft">
          <p className="text-darb-muted">Loading orders...</p>
        </div>
      )}

      {ordersQuery.isError && (
        <div className="rounded-[1.5rem] border border-red-200 bg-red-50 p-8 shadow-soft">
          <h2 className="font-display text-3xl text-red-700">
            Could not load orders
          </h2>
          <p className="mt-3 leading-7 text-red-700">
            {ordersQuery.error?.friendlyMessage ||
              "Admin orders are unavailable right now."}
          </p>
        </div>
      )}

      {!ordersQuery.isLoading && !ordersQuery.isError && orders.length === 0 && (
        <div className="rounded-[1.5rem] border border-darb-gold/20 bg-white p-8 shadow-soft">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-darb-green text-darb-beige">
            <Package size={24} />
          </div>

          <h2 className="mt-6 font-display text-3xl text-darb-green">
            No orders found
          </h2>

          <p className="mt-3 max-w-2xl leading-7 text-darb-muted">
            Orders will appear here once customers start placing Darb purchases.
          </p>
        </div>
      )}

      {!ordersQuery.isLoading && !ordersQuery.isError && orders.length > 0 && (
        <div className="space-y-5">
          {orders.map((order) => {
            const isEditing = editingOrderId === order._id;
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
                <div className="grid gap-5 border-b border-darb-gold/10 p-6 xl:grid-cols-[1fr_auto]">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-darb-green text-darb-beige">
                        <Package size={20} />
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-darb-gold">
                          {order.orderNumber}
                        </p>
                        <h2 className="font-display text-3xl text-darb-green">
                          {order.customerSnapshot?.name || "Customer"}
                        </h2>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2 text-sm text-darb-muted sm:grid-cols-2 xl:grid-cols-4">
                      <p>Phone: {order.customerSnapshot?.phone || "—"}</p>
                      <p>Email: {order.customerSnapshot?.email || "—"}</p>
                      <p>Placed: {formatDateTime(order.createdAt)}</p>
                      <p className="capitalize">
                        Payment: {formatStatus(order.paymentMethod)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-start gap-3 xl:justify-end">
                    <StatusBadge status={order.orderStatus} />
                    <StatusBadge status={order.paymentStatus} />
                  </div>
                </div>

                <div className="grid gap-6 p-6 xl:grid-cols-[1fr_300px]">
                  <div>
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

                    <div className="mt-5 rounded-2xl border border-darb-gold/20 p-4">
                      <p className="font-semibold text-darb-green">
                        Delivery Address
                      </p>
                      <p className="mt-2 text-sm leading-7 text-darb-muted">
                        {order.shippingAddress?.street},{" "}
                        {order.shippingAddress?.city},{" "}
                        {order.shippingAddress?.governorate}
                        {order.shippingAddress?.building
                          ? ` • Building ${order.shippingAddress.building}`
                          : ""}
                        {order.shippingAddress?.floor
                          ? ` • Floor ${order.shippingAddress.floor}`
                          : ""}
                        {order.shippingAddress?.apartment
                          ? ` • Apt ${order.shippingAddress.apartment}`
                          : ""}
                      </p>

                      {order.shippingAddress?.notes && (
                        <p className="mt-2 text-sm leading-7 text-darb-muted">
                          Notes: {order.shippingAddress.notes}
                        </p>
                      )}
                    </div>
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

                    <button
                      type="button"
                      onClick={() => startEditing(order)}
                      className="mt-5 w-full rounded-full bg-darb-green px-5 py-3 text-sm font-semibold text-darb-beige transition hover:bg-darb-black"
                    >
                      Update Status
                    </button>
                  </div>
                </div>

                {isEditing && (
                  <div className="border-t border-darb-gold/10 bg-darb-cream/70 p-6">
                    <h3 className="font-display text-3xl text-darb-green">
                      Update Order
                    </h3>

                    {updateMutation.isError && (
                      <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {updateMutation.error?.friendlyMessage ||
                          "Failed to update order."}
                      </div>
                    )}

                    <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-darb-green">
                          Order Status
                        </label>
                        <select
                          name="orderStatus"
                          value={statusForm.orderStatus}
                          onChange={handleStatusFormChange}
                          className="w-full rounded-full border border-darb-gold/30 bg-white px-5 py-3 capitalize outline-none transition focus:border-darb-green"
                        >
                          {orderStatuses.map((status) => (
                            <option key={status} value={status}>
                              {formatStatus(status)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-darb-green">
                          Payment Status
                        </label>
                        <select
                          name="paymentStatus"
                          value={statusForm.paymentStatus}
                          onChange={handleStatusFormChange}
                          className="w-full rounded-full border border-darb-gold/30 bg-white px-5 py-3 capitalize outline-none transition focus:border-darb-green"
                        >
                          {paymentStatuses.map((status) => (
                            <option key={status} value={status}>
                              {formatStatus(status)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="xl:col-span-2">
                        <label className="mb-2 block text-sm font-semibold text-darb-green">
                          Status Note
                        </label>
                        <input
                          name="note"
                          value={statusForm.note}
                          onChange={handleStatusFormChange}
                          placeholder="Example: Order confirmed with customer"
                          className="w-full rounded-full border border-darb-gold/30 bg-white px-5 py-3 outline-none transition focus:border-darb-green"
                        />
                      </div>

                      <div className="md:col-span-2 xl:col-span-4">
                        <label className="mb-2 block text-sm font-semibold text-darb-green">
                          Admin Notes
                        </label>
                        <textarea
                          name="adminNotes"
                          value={statusForm.adminNotes}
                          onChange={handleStatusFormChange}
                          rows={3}
                          placeholder="Internal notes for the store team"
                          className="w-full rounded-3xl border border-darb-gold/30 bg-white px-5 py-3 outline-none transition focus:border-darb-green"
                        />
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => submitStatusUpdate(order._id)}
                        disabled={updateMutation.isPending}
                        className="rounded-full bg-darb-green px-6 py-3 text-sm font-semibold text-darb-beige transition hover:bg-darb-black disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {updateMutation.isPending ? "Saving..." : "Save Update"}
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditingOrderId("")}
                        className="rounded-full border border-darb-gold/40 px-6 py-3 text-sm font-semibold text-darb-green transition hover:bg-darb-gold/15"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default AdminOrders;