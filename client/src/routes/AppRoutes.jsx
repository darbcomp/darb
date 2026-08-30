import {
  Routes,
  Route,
} from "react-router-dom";

import PublicLayout from "../components/layout/PublicLayout";
import AdminLayout from "../components/layout/AdminLayout";

import ProtectedRoute from "../components/common/ProtectedRoute";
import AdminRoute from "../components/common/AdminRoute";
import ScrollToTop from "../components/common/ScrollToTop";

import Home from "../pages/public/Home";
import Shop from "../pages/public/Shop";
import CategoryPage from "../pages/public/CategoryPage";
import ProductDetails from "../pages/public/ProductDetails";
import Cart from "../pages/public/Cart";
import Checkout from "../pages/public/Checkout";
import OrderSuccess from "../pages/public/OrderSuccess";

import Contact from "../pages/public/Contact";
import ShippingDelivery from "../pages/public/ShippingDelivery";
import ReturnsExchanges from "../pages/public/ReturnsExchanges";
import PrivacyPolicy from "../pages/public/PrivacyPolicy";
import TermsConditions from "../pages/public/TermsConditions";
import TrackOrder from "../pages/public/TrackOrder";

import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";

import Account from "../pages/account/Account";
import MyOrders from "../pages/account/MyOrders";

import AdminLogin from "../pages/admin/AdminLogin";
import AdminDashboard from "../pages/admin/AdminDashboard";
import AdminProducts from "../pages/admin/AdminProducts";
import AdminCategories from "../pages/admin/AdminCategories";
import AdminOrders from "../pages/admin/AdminOrders";
import AdminOffers from "../pages/admin/AdminOffers";
import AdminBundles from "../pages/admin/AdminBundles";
import AdminCoupons from "../pages/admin/AdminCoupons";
import AdminWaitlist from "../pages/admin/AdminWaitlist";
import AdminReviews from "../pages/admin/AdminReviews";
import AdminAnalytics from "../pages/admin/AdminAnalytics";
import AdminSettings from "../pages/admin/AdminSettings";

function AppRoutes() {
  return (
    <>
      <ScrollToTop />

      <Routes>
      <Route
        element={<PublicLayout />}
      >
        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/shop"
          element={<Shop />}
        />

        <Route
          path="/category/:slug"
          element={<CategoryPage />}
        />

        <Route
          path="/product/:slug"
          element={<ProductDetails />}
        />

        <Route
          path="/cart"
          element={<Cart />}
        />

        <Route
          path="/checkout"
          element={<Checkout />}
        />

        <Route
          path="/order-success"
          element={
            <OrderSuccess />
          }
        />

        <Route
          path="/track-order"
          element={
            <TrackOrder />
          }
        />

        <Route
          path="/contact"
          element={<Contact />}
        />

        <Route
          path="/shipping-delivery"
          element={
            <ShippingDelivery />
          }
        />

        <Route
          path="/returns-exchanges"
          element={
            <ReturnsExchanges />
          }
        />

        <Route
          path="/privacy-policy"
          element={
            <PrivacyPolicy />
          }
        />

        <Route
          path="/terms-conditions"
          element={
            <TermsConditions />
          }
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        <Route
          path="/account"
          element={
            <ProtectedRoute>
              <Account />
            </ProtectedRoute>
          }
        />

        <Route
          path="/account/orders"
          element={
            <ProtectedRoute>
              <MyOrders />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route
        path="/admin/login"
        element={<AdminLogin />}
      />

      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route
          index
          element={
            <AdminDashboard />
          }
        />

        <Route
          path="products"
          element={
            <AdminProducts />
          }
        />

        <Route
          path="categories"
          element={
            <AdminCategories />
          }
        />

        <Route
          path="orders"
          element={
            <AdminOrders />
          }
        />

        <Route
          path="offers"
          element={
            <AdminOffers />
          }
        />

        <Route
          path="bundles"
          element={
            <AdminBundles />
          }
        />

        <Route
          path="coupons"
          element={
            <AdminCoupons />
          }
        />

        <Route
          path="waitlist"
          element={
            <AdminWaitlist />
          }
        />

        <Route
          path="reviews"
          element={
            <AdminReviews />
          }
        />

        <Route
          path="analytics"
          element={
            <AdminAnalytics />
          }
        />

        <Route
          path="settings"
          element={
            <AdminSettings />
          }
        />
      </Route>
      </Routes>
    </>
  );
}

export default AppRoutes;
