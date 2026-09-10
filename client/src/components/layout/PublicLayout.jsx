import { Outlet } from "react-router-dom";

import Navbar from "./Navbar";
import Footer from "./Footer";
import MarketingPixels from "../marketing/MarketingPixels";

function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-darb-cream text-darb-black">
      <MarketingPixels />
      <Navbar />

      <main className="flex-1">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}

export default PublicLayout;
