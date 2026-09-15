import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { getAdminDashboard } from "../../api/adminApi";
import { formatCurrency } from "../../utils/formatCurrency";

const formatStatus = (value = "") => value.replaceAll("_", " ");
const formatDateTime = (date) => date ? new Intl.DateTimeFormat("en-EG", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(date)) : "—";

function AdminDashboard() {
  const dashboardQuery = useQuery({ queryKey: ["admin-dashboard"], queryFn: getAdminDashboard, retry: 1, staleTime: 30_000 });
  const dashboard = dashboardQuery.data?.data || {};
  const summary = dashboard.summary || {};
  const recentOrders = dashboard.recentOrders || [];
  const topProducts = dashboard.topProducts || [];
  const categoryPerformance = dashboard.categoryPerformance || [];
  const waitlistDemand = dashboard.waitlistDemand || [];
  const metrics = [
    ["Paid Revenue", formatCurrency(summary.totalRevenue || 0)],
    ["Orders", summary.totalOrders || 0],
    ["Pending", summary.pendingOrders || 0],
    ["Delivered", summary.deliveredOrders || 0],
  ];
  const attention = [
    ["Payment proofs to review", summary.paymentProofsToReview || 0, "/admin/orders"],
    ["Orders awaiting confirmation", summary.pendingOrders || 0, "/admin/orders"],
    ["Low-stock variants", summary.lowStockVariants || 0, "/admin/products"],
    ["Reviews awaiting approval", summary.pendingReviews || 0, "/admin/reviews"],
    ["Waitlist requests", summary.waitlistCount || 0, "/admin/waitlist"],
  ];

  return <section>
    <header className="border-b border-darb-gold/25 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-6"><div><p className="text-xs font-semibold uppercase tracking-[0.3em] text-darb-gold">Admin</p><h1 className="mt-2 font-display text-5xl text-darb-green sm:text-6xl">Operations</h1><p className="mt-3 max-w-xl text-sm leading-6 text-darb-muted">Orders, payments, stock and customer activity in one working view.</p></div><div className="flex items-end gap-3"><div><p className="mb-2 text-xs text-darb-muted">Reporting period</p><div className="rounded-full border border-darb-gold/30 bg-darb-cream px-5 py-3 text-sm text-darb-green">All time</div></div><button type="button" onClick={() => dashboardQuery.refetch()} disabled={dashboardQuery.isFetching} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-darb-gold/35 px-5 text-sm font-semibold text-darb-green transition hover:bg-darb-surface disabled:opacity-50"><RefreshCw size={16} className={dashboardQuery.isFetching ? "animate-spin" : ""} />Refresh</button></div></div>
    </header>

    {dashboardQuery.isLoading && <div className="mt-8 h-72 animate-pulse rounded-[1.5rem] bg-darb-surface" />}
    {dashboardQuery.isError && <div className="mt-8 border-l-4 border-red-500 bg-red-50 p-5 text-red-700" role="alert">{dashboardQuery.error?.friendlyMessage || "Dashboard data is unavailable right now."}</div>}

    {!dashboardQuery.isLoading && !dashboardQuery.isError && <>
      <div className="mt-8 grid border-y border-darb-gold/25 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(([label, value], index) => <div key={label} className={`py-6 sm:px-6 ${index > 0 ? "sm:border-l sm:border-darb-gold/20" : ""}`}><p className="text-xs font-semibold uppercase tracking-[0.18em] text-darb-muted">{label}</p><p className="mt-3 font-display text-3xl tabular-nums text-darb-green">{value}</p></div>)}</div>

      <section className="mt-12"><div className="flex items-end justify-between gap-4"><div><h2 className="font-display text-4xl text-darb-green">Needs attention</h2><p className="mt-2 text-sm text-darb-muted">Operational items that may need an admin action.</p></div></div><div className="mt-6 border-y border-darb-gold/25">{attention.map(([label, value, to]) => <Link key={label} to={to} className="flex items-center justify-between border-b border-darb-gold/15 py-4 text-sm transition last:border-0 hover:px-2 hover:bg-darb-surface"><span className="font-semibold text-darb-green">{label}</span><span className="font-display text-2xl tabular-nums text-darb-green">{value}</span></Link>)}</div></section>

      <div className="mt-14 grid gap-12 xl:grid-cols-[1.2fr_0.8fr]">
        <section><div className="flex items-center justify-between"><h2 className="font-display text-4xl text-darb-green">Recent orders</h2><Link to="/admin/orders" className="text-sm font-semibold text-darb-green underline decoration-darb-gold underline-offset-4">View all</Link></div><div className="mt-5 border-y border-darb-gold/25">{recentOrders.length ? recentOrders.map((order) => <div key={order._id} className="grid gap-2 border-b border-darb-gold/15 py-4 last:border-0 sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="font-semibold text-darb-green">{order.orderNumber}</p><p className="mt-1 text-xs text-darb-muted">{order.customerSnapshot?.name || "Customer"} · {formatDateTime(order.createdAt)}</p></div><div className="sm:text-right"><p className="font-semibold text-darb-black">{formatCurrency(order.total)}</p><p className="mt-1 text-xs capitalize text-darb-muted">{formatStatus(order.orderStatus)} · {formatStatus(order.paymentStatus)}</p></div></div>) : <p className="py-7 text-sm text-darb-muted">No orders yet.</p>}</div></section>
        <section><h2 className="font-display text-4xl text-darb-green">Top products</h2><div className="mt-5 border-y border-darb-gold/25">{topProducts.length ? topProducts.map((product, index) => <div key={product._id || product.slug} className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 border-b border-darb-gold/15 py-4 last:border-0"><span className="font-display text-xl text-darb-gold">{String(index + 1).padStart(2, "0")}</span><div><p className="font-semibold text-darb-green">{product.name}</p><p className="mt-1 text-xs text-darb-muted">{product.quantitySold} sold</p></div><p className="text-sm font-semibold text-darb-black">{formatCurrency(product.revenue)}</p></div>) : <p className="py-7 text-sm text-darb-muted">No product sales yet.</p>}</div></section>
      </div>

      {(categoryPerformance.length > 0 || waitlistDemand.length > 0) && <div className="mt-14 grid gap-12 border-t border-darb-gold/25 pt-10 xl:grid-cols-2">{categoryPerformance.length > 0 && <section><h2 className="font-display text-3xl text-darb-green">Category performance</h2><div className="mt-4">{categoryPerformance.map((category) => <div key={category._id || category.categorySlug} className="flex justify-between border-b border-darb-gold/15 py-3 text-sm"><span className="text-darb-green">{category.categoryName || "Uncategorized"} · {category.quantitySold} sold</span><strong>{formatCurrency(category.revenue)}</strong></div>)}</div></section>}{waitlistDemand.length > 0 && <section><h2 className="font-display text-3xl text-darb-green">Waitlist demand</h2><div className="mt-4">{waitlistDemand.map((item) => <div key={item._id || item.productSlug} className="flex justify-between border-b border-darb-gold/15 py-3 text-sm"><span className="text-darb-green">{item.productName || "Product"}</span><strong>{item.count}</strong></div>)}</div></section>}</div>}
    </>}
  </section>;
}

export default AdminDashboard;
