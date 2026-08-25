import api from "./axiosInstance";

export const getProducts = async (params = {}) => {
  const { data } = await api.get("/products", { params });
  return data;
};

export const getFeaturedProducts = async (params = {}) => {
  const { data } = await api.get("/products/featured", { params });
  return data;
};

export const getProductBySlug = async (slug) => {
  const { data } = await api.get(`/products/${slug}`);
  return data;
};