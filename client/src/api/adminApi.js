import api from "./axiosInstance";

export const getAdminDashboard = async () => {
  const { data } = await api.get("/admin");
  return data;
};

export const getAdminProducts = async () => {
  const { data } = await api.get("/products/admin");
  return data;
};

export const getAdminOrders = async () => {
  const { data } = await api.get("/orders/admin");
  return data;
};