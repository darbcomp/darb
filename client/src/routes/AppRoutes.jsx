import {
  Routes,
  Route,
} from "react-router-dom";
import { lazy, Suspense } from "react";

import PublicLayout from "../components/layout/PublicLayout";

import ProtectedRoute from "../components/common/ProtectedRoute";
import AdminRoute from "../components/common/AdminRoute";
import ScrollToTop from "../components/common/ScrollToTop";

const Home = lazy(() => import("../pages/public/Home"));
const Shop = lazy(() => import("../pages/public/Shop"));
const CategoryPage = lazy(() => import("../pages/public/CategoryPage"));
const ProductDetails = lazy(() => import("../pages/public/ProductDetails"));
const Cart = lazy(() => import("../pages/public/Cart"));
const Checkout = lazy(() => import("../pages/public/Checkout"));
const OrderSuccess = lazy(() => import("../pages/public/OrderSuccess"));
const Contact = lazy(() => import("../pages/public/Contact"));
const ShippingDelivery = lazy(() => import("../pages/public/ShippingDelivery"));
const ReturnsExchanges = lazy(() => import("../pages/public/ReturnsExchanges"));
const PrivacyPolicy = lazy(() => import("../pages/public/PrivacyPolicy"));
const TermsConditions = lazy(() => import("../pages/public/TermsConditions"));
const TrackOrder = lazy(() => import("../pages/public/TrackOrder"));
const Login = lazy(() => import("../pages/auth/Login"));
const Register = lazy(() => import("../pages/auth/Register"));
const Account = lazy(() => import("../pages/account/Account"));
const MyOrders = lazy(() => import("../pages/account/MyOrders"));
const AdminLayout = lazy(() => import("../components/layout/AdminLayout"));
const AdminLogin = lazy(() => import("../pages/admin/AdminLogin"));
const AdminDashboard = lazy(() => import("../pages/admin/AdminDashboard"));
const AdminProducts = lazy(() => import("../pages/admin/AdminProducts"));
const AdminCategories = lazy(() => import("../pages/admin/AdminCategories"));
const AdminOrders = lazy(() => import("../pages/admin/AdminOrders"));
const AdminOffers = lazy(() => import("../pages/admin/AdminOffers"));
const AdminBundles = lazy(() => import("../pages/admin/AdminBundles"));
const AdminCoupons = lazy(() => import("../pages/admin/AdminCoupons"));
const AdminWaitlist = lazy(() => import("../pages/admin/AdminWaitlist"));
const AdminReviews = lazy(() => import("../pages/admin/AdminReviews"));
const AdminAnalytics = lazy(() => import("../pages/admin/AdminAnalytics"));
const AdminSettings = lazy(() => import("../pages/admin/AdminSettings"));

function AppRoutes() {
  return (
    <>
      <ScrollToTop />

      <Suspense fallback={<div className="grid min-h-[55vh] place-items-center bg-darb-cream" role="status"><span className="font-display text-2xl text-darb-green">Following the path…</span></div>}>
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
      </Suspense>
    </>
  );
}

export default AppRoutes;
