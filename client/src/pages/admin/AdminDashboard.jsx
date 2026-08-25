import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Box,
  Gift,
  Package,
  ShoppingBag,
  TicketPercent,
  Users,
  Wallet,
} from "lucide-react";
import { getAdminDashboard } from "../../api/adminApi";
import { formatCurrency } from "../../utils/formatCurrency";

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

function StatCard({ title, value, icon: Icon, helper }) {
  return (
    <div className="rounded-[1.5rem] border border-darb-gold/20 bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-darb-muted">{title}</p>
          <p className="mt-2 font-display text-3xl text-darb-green">{value}</p>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-darb-green text-darb-beige">
          <Icon size={22} />
        </div>
      </div>

      {helper && <p className="mt-4 text-xs leading-5 text-darb-muted">{helper}</p>}
    </div>
  );
}

function AdminDashboard() {
  const dashboardQuery = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: getAdminDashboard,
    retry: 1,
  });

  const dashboard = dashboardQuery.data?.data;
  const summary = dashboard?.summary || {
    totalRevenue: 0,
    totalOrders: 0,
    pendingOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
    totalProducts: 0,
    activeProducts: 0,
    placeholderProducts: 0,
    totalCategories: 0,
    waitlistCount: 0,
    activeCoupons: 0,
    activeOffers: 0,
    activeBundles: 0,
    totalCustomers: 0,
  };

  const recentOrders = dashboard?.recentOrders || [];
  const topProducts = dashboard?.topProducts || [];
  const categoryPerformance = dashboard?.categoryPerformance || [];
  const waitlistDemand = dashboard?.waitlistDemand || [];

  return (
    <section>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-darb-gold">
            Admin
          </p>
          <h1 className="mt-2 font-display text-4xl text-darb-green">
            Dashboard
          </h1>
          <p className="mt-3 max-w-2xl text-darb-muted">
            A clean overview of Darb orders, products, customers, waitlist, and
            store performance.
          </p>
        </div>

        <Link
          to="/admin/products"
          className="rounded-full bg-darb-green px-5 py-3 text-sm font-semibold text-darb-beige transition hover:bg-darb-black"
        >
          Manage Products
        </Link>
      </div>

      {dashboardQuery.isLoading && (
        <div className="rounded-[1.5rem] border border-darb-gold/20 bg-white p-8 shadow-soft">
          <p className="text-darb-muted">Loading dashboard analytics...</p>
        </div>
      )}

      {dashboardQuery.isError && (
        <div className="rounded-[1.5rem] border border-red-200 bg-red-50 p-8 shadow-soft">
          <h2 className="font-display text-3xl text-red-700">
            Could not load dashboard
          </h2>
          <p className="mt-3 leading-7 text-red-700">
            {dashboardQuery.error?.friendlyMessage ||
              "Dashboard analytics are unavailable right now."}
          </p>
        </div>
      )}

      {!dashboardQuery.isLoading && !dashboardQuery.isError && (
        <>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Total Revenue"
              value={formatCurrency(summary.totalRevenue)}
              icon={Wallet}
              helper="All non-cancelled order totals."
            />

            <StatCard
              title="Total Orders"
              value={summary.totalOrders}
              icon={ShoppingBag}
              helper={`${summary.pendingOrders} pending • ${summary.deliveredOrders} delivered`}
            />

            <StatCard
              title="Products"
              value={summary.totalProducts}
              icon={Package}
              helper={`${summary.activeProducts} active • ${summary.placeholderProducts} placeholders`}
            />

            <StatCard
              title="Customers"
              value={summary.totalCustomers}
              icon={Users}
              helper="Registered customer accounts."
            />

            <StatCard
              title="Waitlist"
              value={summary.waitlistCount}
              icon={Box}
              helper="Customers waiting for unavailable scents."
            />

            <StatCard
              title="Categories"
              value={summary.totalCategories}
              icon={BarChart3}
              helper="Men, Women, Unisex, Musk."
            />

            <StatCard
              title="Active Coupons"
              value={summary.activeCoupons}
              icon={TicketPercent}
              helper="Discount codes currently active."
            />

            <StatCard
              title="Active Offers / Bundles"
              value={`${summary.activeOffers} / ${summary.activeBundles}`}
              icon={Gift}
              helper="Automatic offers and bundle deals."
            />
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[1.5rem] border border-darb-gold/20 bg-white p-6 shadow-soft">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-3xl text-darb-green">
                    Recent Orders
                  </h2>
                  <p className="mt-1 text-sm text-darb-muted">
                    Latest customer purchases.
                  </p>
                </div>

                <Link
                  to="/admin/orders"
                  className="text-sm font-semibold text-darb-green"
                >
                  View all
                </Link>
              </div>

              {recentOrders.length === 0 ? (
                <div className="rounded-2xl bg-darb-cream/70 p-5 text-sm text-darb-muted">
                  No orders yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {recentOrders.map((order) => (
                    <div
                      key={order._id}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-darb-cream/70 p-4"
                    >
                      <div>
                        <p className="font-semibold text-darb-green">
                          {order.orderNumber}
                        </p>
                        <p className="mt-1 text-sm text-darb-muted">
                          {order.customerSnapshot?.name || "Customer"} •{" "}
                          {formatDateTime(order.createdAt)}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="font-semibold text-darb-black">
                          {formatCurrency(order.total)}
                        </p>
                        <p className="mt-1 text-xs capitalize text-darb-muted">
                          {formatStatus(order.orderStatus)} •{" "}
                          {formatStatus(order.paymentStatus)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-[1.5rem] border border-darb-gold/20 bg-white p-6 shadow-soft">
              <h2 className="font-display text-3xl text-darb-green">
                Top Products
              </h2>
              <p className="mt-1 text-sm text-darb-muted">
                Best sellers by quantity sold.
              </p>

              {topProducts.length === 0 ? (
                <div className="mt-5 rounded-2xl bg-darb-cream/70 p-5 text-sm text-darb-muted">
                  No product sales yet.
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {topProducts.map((product) => (
                    <div
                      key={product._id || product.slug}
                      className="flex items-center gap-4 rounded-2xl bg-darb-cream/70 p-3"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-darb-green">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
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
                          {product.name || "Product"}
                        </p>
                        <p className="mt-1 text-xs text-darb-muted">
                          {product.quantitySold} sold
                        </p>
                      </div>

                      <p className="text-sm font-semibold text-darb-black">
                        {formatCurrency(product.revenue)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-2">
            <div className="rounded-[1.5rem] border border-darb-gold/20 bg-white p-6 shadow-soft">
              <h2 className="font-display text-3xl text-darb-green">
                Category Performance
              </h2>
              <p className="mt-1 text-sm text-darb-muted">
                Revenue and quantity by category.
              </p>

              {categoryPerformance.length === 0 ? (
                <div className="mt-5 rounded-2xl bg-darb-cream/70 p-5 text-sm text-darb-muted">
                  No category sales yet.
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {categoryPerformance.map((category) => (
                    <div
                      key={category._id || category.categorySlug}
                      className="rounded-2xl bg-darb-cream/70 p-4"
                    >
                      <div className="flex justify-between gap-4">
                        <p className="font-semibold text-darb-green">
                          {category.categoryName || "Uncategorized"}
                        </p>
                        <p className="font-semibold text-darb-black">
                          {formatCurrency(category.revenue)}
                        </p>
                      </div>

                      <p className="mt-1 text-sm text-darb-muted">
                        {category.quantitySold} items sold
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-[1.5rem] border border-darb-gold/20 bg-white p-6 shadow-soft">
              <h2 className="font-display text-3xl text-darb-green">
                Waitlist Demand
              </h2>
              <p className="mt-1 text-sm text-darb-muted">
                Products customers are waiting for.
              </p>

              {waitlistDemand.length === 0 ? (
                <div className="mt-5 rounded-2xl bg-darb-cream/70 p-5 text-sm text-darb-muted">
                  No waitlist requests yet.
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {waitlistDemand.map((item) => (
                    <div
                      key={item._id || item.productSlug}
                      className="flex items-center gap-4 rounded-2xl bg-darb-cream/70 p-3"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-darb-green">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.productName}
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
                          {item.productName || "Product"}
                        </p>
                        <p className="mt-1 text-xs text-darb-muted">
                          {item.count} waitlist request
                          {item.count === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

export default AdminDashboard;