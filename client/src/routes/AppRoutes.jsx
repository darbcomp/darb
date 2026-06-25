import { Routes, Route } from "react-router-dom";

import PublicLayout from "../components/layout/PublicLayout";
import AdminLayout from "../components/layout/AdminLayout";

import Home from "../pages/public/Home";
import Shop from "../pages/public/Shop";
import CategoryPage from "../pages/public/CategoryPage";
import ProductDetails from "../pages/public/ProductDetails";
import Cart from "../pages/public/Cart";
import Checkout from "../pages/public/Checkout";

import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";

import MyOrders from "../pages/account/MyOrders";

import AdminLogin from "../pages/admin/AdminLogin";
import AdminDashboard from "../pages/admin/AdminDashboard";
import AdminProducts from "../pages/admin/AdminProducts";
import AdminOrders from "../pages/admin/AdminOrders";
import AdminOffers from "../pages/admin/AdminOffers";
import AdminBundles from "../pages/admin/AdminBundles";
import AdminCoupons from "../pages/admin/AdminCoupons";
import AdminWaitlist from "../pages/admin/AdminWaitlist";
import AdminAnalytics from "../pages/admin/AdminAnalytics";
import AdminSettings from "../pages/admin/AdminSettings";

function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/category/:slug" element={<CategoryPage />} />
        <Route path="/product/:slug" element={<ProductDetails />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/account/orders" element={<MyOrders />} />
      </Route>

      <Route path="/admin/login" element={<AdminLogin />} />

      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="offers" element={<AdminOffers />} />
        <Route path="bundles" element={<AdminBundles />} />
        <Route path="coupons" element={<AdminCoupons />} />
        <Route path="waitlist" element={<AdminWaitlist />} />
        <Route path="analytics" element={<AdminAnalytics />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;