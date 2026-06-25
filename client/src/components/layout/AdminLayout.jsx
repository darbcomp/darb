import { NavLink, Outlet } from "react-router-dom";

const adminLinks = [
  { label: "Dashboard", path: "/admin" },
  { label: "Products", path: "/admin/products" },
  { label: "Orders", path: "/admin/orders" },
  { label: "Offers", path: "/admin/offers" },
  { label: "Bundles", path: "/admin/bundles" },
  { label: "Coupons", path: "/admin/coupons" },
  { label: "Waitlist", path: "/admin/waitlist" },
  { label: "Analytics", path: "/admin/analytics" },
  { label: "Settings", path: "/admin/settings" },
];

function AdminLayout() {
  return (
    <div className="min-h-screen bg-[#f5efe4] text-darb-black">
      <aside className="fixed left-0 top-0 hidden h-screen w-64 border-r border-darb-gold/20 bg-darb-green p-5 text-darb-beige lg:block">
        <h1 className="font-display text-3xl">Darb Admin</h1>
        <p className="mt-1 text-xs text-darb-beige/60">Store Control Panel</p>

        <nav className="mt-8 space-y-2">
          {adminLinks.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              end={link.path === "/admin"}
              className={({ isActive }) =>
                `block rounded-xl px-4 py-3 text-sm transition ${
                  isActive
                    ? "bg-darb-gold text-darb-green"
                    : "text-darb-beige/75 hover:bg-darb-beige/10 hover:text-darb-beige"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="lg:ml-64">
        <div className="border-b border-darb-gold/20 bg-darb-cream px-5 py-4 lg:hidden">
          <h1 className="font-display text-2xl text-darb-green">Darb Admin</h1>
        </div>

        <div className="p-5 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default AdminLayout;