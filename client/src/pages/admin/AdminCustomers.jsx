import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Mail, Phone, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { getAdminCustomer, getAdminCustomers } from "../../api/adminApi";
import AdminPagination from "../../components/admin/AdminPagination";
import { formatCurrency } from "../../utils/formatCurrency";

const formatDate = (value) => value
  ? new Intl.DateTimeFormat("en-EG", { year: "numeric", month: "short", day: "numeric" }).format(new Date(value))
  : "—";
const formatStatus = (value = "") => String(value).replaceAll("_", " ");

function AdminCustomers() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ search: "", type: "", marketingConsent: "", hasOrders: "" });
  const [selectedKey, setSelectedKey] = useState("");
  const detailCloseRef = useRef(null);
  const detailOpenerRef = useRef(null);
  const queryParams = useMemo(() => ({
    page,
    limit: 20,
    ...(filters.search.trim() ? { search: filters.search.trim() } : {}),
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.marketingConsent ? { marketingConsent: filters.marketingConsent } : {}),
    ...(filters.hasOrders ? { hasOrders: filters.hasOrders } : {}),
  }), [filters, page]);

  const customersQuery = useQuery({ queryKey: ["admin-customers", queryParams], queryFn: () => getAdminCustomers(queryParams), retry: 1 });
  const detailQuery = useQuery({ queryKey: ["admin-customer", selectedKey], queryFn: () => getAdminCustomer(selectedKey), enabled: Boolean(selectedKey), retry: 1 });
  const customers = customersQuery.data?.data || [];
  const pagination = customersQuery.data?.pagination;
  const customer = detailQuery.data?.data;

  const closeDetail = useCallback(() => {
    setSelectedKey("");
    window.requestAnimationFrame(() => detailOpenerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!selectedKey) return undefined;
    detailCloseRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === "Escape") closeDetail();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeDetail, selectedKey]);

  const changeFilter = (event) => {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
    setPage(1);
  };

  return (
    <section className="admin-page">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm font-semibold uppercase tracking-[0.3em] text-darb-gold">Admin</p><h1 className="mt-2 font-display text-4xl text-darb-green">Customers</h1><p className="mt-3 max-w-2xl text-darb-muted">Registered customers and guest purchasers, grouped by their verified phone identity.</p></div>
        <div className="rounded-full border border-darb-gold/30 bg-white px-5 py-3 text-sm font-semibold text-darb-green">{pagination?.total || 0} customers</div>
      </div>

      <div className="mb-8 rounded-[1.5rem] border border-darb-gold/20 bg-white p-5 shadow-soft">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div className="relative"><Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-darb-muted" /><input name="search" value={filters.search} onChange={changeFilter} placeholder="Search name, phone, or email" className="w-full rounded-full border border-darb-gold/30 py-3 pl-11 pr-5 outline-none focus:border-darb-green" /></div>
          <select name="type" value={filters.type} onChange={changeFilter} className="rounded-full border border-darb-gold/30 bg-white px-5 py-3"><option value="">Registered and guest</option><option value="registered">Registered</option><option value="guest">Guest</option></select>
          <select name="marketingConsent" value={filters.marketingConsent} onChange={changeFilter} className="rounded-full border border-darb-gold/30 bg-white px-5 py-3"><option value="">Any marketing consent</option><option value="true">Opted in</option><option value="false">Not opted in</option></select>
          <select name="hasOrders" value={filters.hasOrders} onChange={changeFilter} className="rounded-full border border-darb-gold/30 bg-white px-5 py-3"><option value="">Any order history</option><option value="true">Has orders</option><option value="false">No orders</option></select>
        </div>
      </div>

      {customersQuery.isLoading && <div className="rounded-3xl bg-white p-8 text-darb-muted">Loading customers...</div>}
      {customersQuery.isError && <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-red-700">{customersQuery.error?.friendlyMessage || "Customers are unavailable."}</div>}
      {!customersQuery.isLoading && !customersQuery.isError && customers.length === 0 && <div className="rounded-3xl bg-white p-8"><UserRound className="text-darb-green" /><h2 className="mt-4 font-display text-3xl text-darb-green">No customers found</h2><p className="mt-2 text-darb-muted">Try changing the current filters.</p></div>}

      {customers.length > 0 && <div className="admin-record-list border-y border-darb-gold/25">
        {customers.map((item) => <article key={item.customerKey} className="admin-record-row border-b border-darb-gold/15 py-5 last:border-0">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(8rem,0.7fr))_auto] lg:items-center">
            <div><div className="flex flex-wrap gap-2"><span className="rounded-full bg-darb-green/10 px-3 py-1 text-xs font-semibold text-darb-green">{item.registered ? "Registered" : "Guest"}</span>{!item.isActive && <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">Inactive</span>}<span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.marketingConsent ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>{item.marketingConsent ? "Marketing: yes" : "Marketing: no"}</span></div><h2 className="mt-2 font-display text-2xl text-darb-green">{item.name}</h2><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-darb-muted">{item.phone && <span className="inline-flex items-center gap-1"><Phone size={14} />{item.phone}</span>}{item.email && <span className="inline-flex items-center gap-1"><Mail size={14} />{item.email}</span>}</div></div>
            <div><p className="text-xs uppercase tracking-wider text-darb-muted">Orders</p><p className="mt-1 font-semibold text-darb-green">{item.orderCount}</p></div>
            <div><p className="text-xs uppercase tracking-wider text-darb-muted">Total spent</p><p className="mt-1 font-semibold text-darb-green">{formatCurrency(item.totalSpent)}</p></div>
            <div><p className="text-xs uppercase tracking-wider text-darb-muted">Last order</p><p className="mt-1 font-semibold text-darb-green">{formatDate(item.lastOrder)}</p></div>
            <button type="button" onClick={(event) => { detailOpenerRef.current = event.currentTarget; setSelectedKey(item.customerKey); }} className="rounded-full bg-darb-green px-5 py-2.5 text-sm font-semibold text-darb-beige">View customer</button>
          </div>
        </article>)}
      </div>}
      <AdminPagination page={pagination?.page || page} pages={pagination?.pages || 1} onPageChange={setPage} />

      {selectedKey && <div className="fixed inset-0 z-[100] flex justify-end bg-black/45" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDetail(); }}>
        <aside role="dialog" aria-modal="true" aria-label="Customer details" className="h-full w-full max-w-2xl overflow-y-auto bg-darb-cream p-5 shadow-2xl sm:p-8">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.25em] text-darb-gold">Customer details</p><h2 className="mt-2 font-display text-4xl text-darb-green">{customer?.name || "Customer"}</h2></div><button ref={detailCloseRef} type="button" onClick={closeDetail} className="rounded-full border border-darb-gold/30 p-2" aria-label="Close customer details"><X /></button></div>
          {detailQuery.isLoading && <p className="mt-8 text-darb-muted">Loading customer...</p>}
          {detailQuery.isError && <p className="mt-8 text-red-700">{detailQuery.error?.friendlyMessage || "Customer details are unavailable."}</p>}
          {customer && <>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">{[["Type", customer.registered ? "Registered" : "Guest"], ["Account status", customer.registered ? (customer.isActive ? "Active" : "Inactive") : "Guest purchaser"], ["Phone", customer.phone || "—"], ["Email", customer.email || "—"], ["Marketing consent", customer.marketingConsent ? "Opted in" : "Not opted in"], ["First order", formatDate(customer.firstOrder)], ["Last order", formatDate(customer.lastOrder)], ["Orders", customer.orderCount], ["Total spent", formatCurrency(customer.totalSpent)]].map(([label, value]) => <div key={label} className="rounded-2xl border border-darb-gold/20 bg-white p-4"><p className="text-xs uppercase tracking-wider text-darb-muted">{label}</p><p className="mt-1 font-semibold text-darb-green">{value}</p></div>)}</div>
            <div className="mt-8"><div className="flex items-center gap-2"><ShoppingBag size={18} className="text-darb-gold" /><h3 className="font-display text-2xl text-darb-green">Order history</h3></div><div className="mt-4 space-y-3">{customer.orders.length === 0 && <p className="rounded-2xl bg-white p-4 text-darb-muted">No orders yet.</p>}{customer.orders.map((order) => <div key={order.orderNumber} className="rounded-2xl border border-darb-gold/20 bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-darb-green">{order.orderNumber}</p><p className="mt-1 text-xs text-darb-muted">{formatDate(order.createdAt)} · {formatStatus(order.paymentMethod)} · {formatStatus(order.paymentStatus)}</p></div><div className="text-right"><p className="font-semibold text-darb-green">{formatCurrency(order.total)}</p><p className="mt-1 text-xs capitalize text-darb-muted">{formatStatus(order.orderStatus)}</p></div></div><Link to={`/admin/orders?search=${encodeURIComponent(order.orderNumber)}`} className="mt-3 inline-flex text-sm font-semibold text-darb-green underline decoration-darb-gold underline-offset-4">View in Orders</Link></div>)}</div></div>
          </>}
        </aside>
      </div>}
    </section>
  );
}

export default AdminCustomers;
