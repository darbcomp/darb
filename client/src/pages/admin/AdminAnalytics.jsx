import { useQuery } from "@tanstack/react-query";
import { BarChart3, Gift, ShoppingBag, TicketPercent, Wallet } from "lucide-react";
import { getAdminDashboard } from "../../api/adminApi";
import { formatCurrency } from "../../utils/formatCurrency";

const formatStatus = (value = "") => value.replaceAll("_", " ");

function SmallStat({ title, value, icon: Icon }) {
  return (
    <div className="rounded-[1.5rem] border border-darb-gold/20 bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-darb-muted">{title}</p>
          <p className="mt-2 font-display text-3xl text-darb-green">{value}</p>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-darb-green text-darb-beige">
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

function AdminAnalytics() {
  const analyticsQuery = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: getAdminDashboard,
    retry: 1,
  });

  const data = analyticsQuery.data?.data;
  const summary = data?.summary || {
    totalRevenue: 0,
    totalOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
    activeCoupons: 0,
    activeOffers: 0,
    activeBundles: 0,
  };

  const ordersByStatus = data?.ordersByStatus || [];
  const paymentByStatus = data?.paymentByStatus || [];
  const categoryPerformance = data?.categoryPerformance || [];
  const couponUsage = data?.couponUsage || [];
  const topProducts = data?.topProducts || [];

  return (
    <section className="admin-page admin-analytics">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-darb-gold">
          Admin
        </p>
        <h1 className="mt-2 font-display text-4xl text-darb-green">
          Analytics
        </h1>
        <p className="mt-3 max-w-2xl text-darb-muted">
          Track revenue, orders, coupons, categories, and product performance.
        </p>
      </div>

      {analyticsQuery.isLoading && (
        <div className="rounded-[1.5rem] border border-darb-gold/20 bg-white p-8 shadow-soft">
          <p className="text-darb-muted">Loading analytics...</p>
        </div>
      )}

      {analyticsQuery.isError && (
        <div className="rounded-[1.5rem] border border-red-200 bg-red-50 p-8 shadow-soft">
          <h2 className="font-display text-3xl text-red-700">
            Could not load analytics
          </h2>
          <p className="mt-3 leading-7 text-red-700">
            {analyticsQuery.error?.friendlyMessage ||
              "Analytics are unavailable right now."}
          </p>
        </div>
      )}

      {!analyticsQuery.isLoading && !analyticsQuery.isError && (
        <>
          <div className="grid gap-0 border-y border-darb-gold/25 md:grid-cols-2 xl:grid-cols-4">
            <SmallStat
              title="Revenue"
              value={formatCurrency(summary.totalRevenue)}
              icon={Wallet}
            />
            <SmallStat
              title="Orders"
              value={summary.totalOrders}
              icon={ShoppingBag}
            />
            <SmallStat
              title="Coupons"
              value={summary.activeCoupons}
              icon={TicketPercent}
            />
            <SmallStat
              title="Offers / Bundles"
              value={`${summary.activeOffers} / ${summary.activeBundles}`}
              icon={Gift}
            />
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-2">
            <div className="rounded-[1.5rem] border border-darb-gold/20 bg-white p-6 shadow-soft">
              <h2 className="font-display text-3xl text-darb-green">
                Orders by Status
              </h2>

              {ordersByStatus.length === 0 ? (
                <p className="mt-5 rounded-2xl bg-darb-cream/70 p-5 text-sm text-darb-muted">
                  No order status data yet.
                </p>
              ) : (
                <div className="mt-5 space-y-3">
                  {ordersByStatus.map((item) => (
                    <div key={item._id} className="rounded-2xl bg-darb-cream/70 p-4">
                      <div className="flex justify-between gap-4">
                        <p className="font-semibold capitalize text-darb-green">
                          {formatStatus(item._id)}
                        </p>
                        <p className="font-semibold text-darb-black">
                          {item.count}
                        </p>
                      </div>

                      <p className="mt-1 text-sm text-darb-muted">
                        Revenue: {formatCurrency(item.revenue)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-[1.5rem] border border-darb-gold/20 bg-white p-6 shadow-soft">
              <h2 className="font-display text-3xl text-darb-green">
                Payment by Status
              </h2>

              {paymentByStatus.length === 0 ? (
                <p className="mt-5 rounded-2xl bg-darb-cream/70 p-5 text-sm text-darb-muted">
                  No payment data yet.
                </p>
              ) : (
                <div className="mt-5 space-y-3">
                  {paymentByStatus.map((item) => (
                    <div key={item._id} className="rounded-2xl bg-darb-cream/70 p-4">
                      <div className="flex justify-between gap-4">
                        <p className="font-semibold capitalize text-darb-green">
                          {formatStatus(item._id)}
                        </p>
                        <p className="font-semibold text-darb-black">
                          {item.count}
                        </p>
                      </div>

                      <p className="mt-1 text-sm text-darb-muted">
                        Revenue: {formatCurrency(item.revenue)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-[1.5rem] border border-darb-gold/20 bg-white p-6 shadow-soft">
              <h2 className="font-display text-3xl text-darb-green">
                Category Performance
              </h2>

              {categoryPerformance.length === 0 ? (
                <p className="mt-5 rounded-2xl bg-darb-cream/70 p-5 text-sm text-darb-muted">
                  No category sales yet.
                </p>
              ) : (
                <div className="mt-5 space-y-3">
                  {categoryPerformance.map((item) => (
                    <div
                      key={item._id || item.categorySlug}
                      className="rounded-2xl bg-darb-cream/70 p-4"
                    >
                      <div className="flex justify-between gap-4">
                        <p className="font-semibold text-darb-green">
                          {item.categoryName || "Uncategorized"}
                        </p>
                        <p className="font-semibold text-darb-black">
                          {formatCurrency(item.revenue)}
                        </p>
                      </div>

                      <p className="mt-1 text-sm text-darb-muted">
                        {item.quantitySold} items sold
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-[1.5rem] border border-darb-gold/20 bg-white p-6 shadow-soft">
              <h2 className="font-display text-3xl text-darb-green">
                Coupon Usage
              </h2>

              {couponUsage.length === 0 ? (
                <p className="mt-5 rounded-2xl bg-darb-cream/70 p-5 text-sm text-darb-muted">
                  No coupon usage yet.
                </p>
              ) : (
                <div className="mt-5 space-y-3">
                  {couponUsage.map((item) => (
                    <div key={item._id} className="rounded-2xl bg-darb-cream/70 p-4">
                      <div className="flex justify-between gap-4">
                        <p className="font-semibold text-darb-green">
                          {item._id}
                        </p>
                        <p className="font-semibold text-darb-black">
                          {item.uses} uses
                        </p>
                      </div>

                      <p className="mt-1 text-sm text-darb-muted">
                        Revenue: {formatCurrency(item.revenue)} • Discount:{" "}
                        {formatCurrency(item.discountGiven)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 rounded-[1.5rem] border border-darb-gold/20 bg-white p-6 shadow-soft">
            <h2 className="font-display text-3xl text-darb-green">
              Product Performance
            </h2>

            {topProducts.length === 0 ? (
              <p className="mt-5 rounded-2xl bg-darb-cream/70 p-5 text-sm text-darb-muted">
                No product sales yet.
              </p>
            ) : (
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {topProducts.map((item) => (
                  <div
                    key={item._id || item.slug}
                    className="flex items-center gap-4 rounded-2xl bg-darb-cream/70 p-3"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-darb-green">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <BarChart3 size={18} className="text-darb-gold" />
                      )}
                    </div>

                    <div className="flex-1">
                      <p className="font-semibold text-darb-green">
                        {item.name || "Product"}
                      </p>
                      <p className="mt-1 text-xs text-darb-muted">
                        {item.quantitySold} sold
                      </p>
                    </div>

                    <p className="text-sm font-semibold text-darb-black">
                      {formatCurrency(item.revenue)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

export default AdminAnalytics;
