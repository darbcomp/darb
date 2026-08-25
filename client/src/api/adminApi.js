import api from "./axiosInstance";

export const getAdminDashboard = async () => {
  const { data } = await api.get("/admin");
  return data;
};

export const getAdminProducts = async (params = {}) => {
  const { data } = await api.get("/products/admin", { params });
  return data;
};

export const getAdminProductById = async (productId) => {
  const { data } = await api.get(`/products/admin/${productId}`);
  return data;
};

export const createAdminProduct = async (payload) => {
  const { data } = await api.post("/products/admin", payload, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return data;
};

export const updateAdminProduct = async ({ productId, payload }) => {
  const { data } = await api.put(`/products/admin/${productId}`, payload, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return data;
};

export const deleteAdminProduct = async (productId) => {
  const { data } = await api.delete(`/products/admin/${productId}`);
  return data;
};

export const hardDeleteAdminProduct = async (productId) => {
  const { data } = await api.delete(`/products/admin/${productId}?hard=true`);
  return data;
};

export const deleteAdminProductImage = async ({ productId, payload }) => {
  const { data } = await api.delete(`/products/admin/${productId}/image`, {
    data: payload,
  });

  return data;
};

export const getAdminCategories = async () => {
  const { data } = await api.get("/categories/admin");
  return data;
};

export const getAdminCategoryById = async (categoryId) => {
  const { data } = await api.get(`/categories/admin/${categoryId}`);
  return data;
};

export const createAdminCategory = async (payload) => {
  const { data } = await api.post("/categories/admin", payload, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return data;
};

export const updateAdminCategory = async ({ categoryId, payload }) => {
  const { data } = await api.put(`/categories/admin/${categoryId}`, payload, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return data;
};

export const deleteAdminCategory = async (categoryId) => {
  const { data } = await api.delete(`/categories/admin/${categoryId}`);
  return data;
};

export const hardDeleteAdminCategory = async (categoryId) => {
  const { data } = await api.delete(`/categories/admin/${categoryId}?hard=true`);
  return data;
};

export const getAdminOrders = async (params = {}) => {
  const { data } = await api.get("/orders/admin", { params });
  return data;
};

export const getAdminOrderById = async (orderId) => {
  const { data } = await api.get(`/orders/admin/${orderId}`);
  return data;
};

export const updateAdminOrderStatus = async ({ orderId, payload }) => {
  const { data } = await api.patch(`/orders/admin/${orderId}/status`, payload);
  return data;
};

export const getAdminCoupons = async (params = {}) => {
  const { data } = await api.get("/coupons/admin", { params });
  return data;
};

export const getAdminCouponById = async (couponId) => {
  const { data } = await api.get(`/coupons/admin/${couponId}`);
  return data;
};

export const createAdminCoupon = async (payload) => {
  const { data } = await api.post("/coupons/admin", payload);
  return data;
};

export const updateAdminCoupon = async ({ couponId, payload }) => {
  const { data } = await api.put(`/coupons/admin/${couponId}`, payload);
  return data;
};

export const deleteAdminCoupon = async (couponId) => {
  const { data } = await api.delete(`/coupons/admin/${couponId}`);
  return data;
};

export const hardDeleteAdminCoupon = async (couponId) => {
  const { data } = await api.delete(`/coupons/admin/${couponId}?hard=true`);
  return data;
};

export const validateCoupon = async (payload) => {
  const { data } = await api.post("/coupons/validate", payload);
  return data;
};

export const getAdminOffers = async (params = {}) => {
  const { data } = await api.get("/offers/admin", { params });
  return data;
};

export const getAdminOfferById = async (offerId) => {
  const { data } = await api.get(`/offers/admin/${offerId}`);
  return data;
};

export const createAdminOffer = async (payload) => {
  const { data } = await api.post("/offers/admin", payload);
  return data;
};

export const updateAdminOffer = async ({ offerId, payload }) => {
  const { data } = await api.put(`/offers/admin/${offerId}`, payload);
  return data;
};

export const deleteAdminOffer = async (offerId) => {
  const { data } = await api.delete(`/offers/admin/${offerId}`);
  return data;
};

export const hardDeleteAdminOffer = async (offerId) => {
  const { data } = await api.delete(`/offers/admin/${offerId}?hard=true`);
  return data;
};

export const getAdminBundles = async (params = {}) => {
  const { data } = await api.get("/bundles/admin", { params });
  return data;
};

export const getAdminBundleById = async (bundleId) => {
  const { data } = await api.get(`/bundles/admin/${bundleId}`);
  return data;
};

export const createAdminBundle = async (payload) => {
  const { data } = await api.post("/bundles/admin", payload);
  return data;
};

export const updateAdminBundle = async ({ bundleId, payload }) => {
  const { data } = await api.put(`/bundles/admin/${bundleId}`, payload);
  return data;
};

export const deleteAdminBundle = async (bundleId) => {
  const { data } = await api.delete(`/bundles/admin/${bundleId}`);
  return data;
};

export const hardDeleteAdminBundle = async (bundleId) => {
  const { data } = await api.delete(`/bundles/admin/${bundleId}?hard=true`);
  return data;
};

export const getAdminWaitlist = async (params = {}) => {
  const { data } = await api.get("/waitlist/admin", { params });
  return data;
};

export const getAdminWaitlistRequestById = async (requestId) => {
  const { data } = await api.get(`/waitlist/admin/${requestId}`);
  return data;
};

export const updateAdminWaitlistRequest = async ({ requestId, payload }) => {
  const { data } = await api.patch(`/waitlist/admin/${requestId}`, payload);
  return data;
};

export const deleteAdminWaitlistRequest = async (requestId) => {
  const { data } = await api.delete(`/waitlist/admin/${requestId}`);
  return data;
};

export const hardDeleteAdminWaitlistRequest = async (requestId) => {
  const { data } = await api.delete(`/waitlist/admin/${requestId}?hard=true`);
  return data;
};

export const getAdminSettings = async () => {
  const { data } = await api.get("/settings/admin");
  return data;
};

export const updateAdminSettings = async (payload) => {
  const { data } = await api.put("/settings/admin", payload);
  return data;
};