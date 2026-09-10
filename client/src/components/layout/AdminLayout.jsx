import {
  Outlet,
} from "react-router-dom";

import Navbar from "./Navbar";

function AdminLayout() {
  return (
    <div className="admin-workspace min-h-screen bg-darb-cream text-darb-black">
      <Navbar />

      <main>
        <div
          className="
            mx-auto
            w-full
            max-w-[1500px]
            px-5
            py-8

            sm:px-6
            sm:py-10

            lg:px-8
            lg:py-12
          "
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default AdminLayout;
