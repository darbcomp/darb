import { Outlet } from "react-router-dom";

import Navbar from "./Navbar";
import Footer from "./Footer";
import MarketingPixels from "../marketing/MarketingPixels";
import RewardLauncher from "../rewards/RewardLauncher";
import AddedToCartPopup from "../cart/AddedToCartPopup";

function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-darb-cream text-darb-black">
      <MarketingPixels />
      <Navbar />

      <main className="flex-1">
        <Outlet />
      </main>

      <Footer />
      <RewardLauncher />
      <AddedToCartPopup />
    </div>
  );
}

export default PublicLayout;
