import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";

function PublicLayout() {
  return (
    <div className="min-h-screen bg-darb-cream text-darb-black">
      <Navbar />
      <main>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export default PublicLayout;