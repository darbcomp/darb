import api from "./axiosInstance";

export const createOrder = async (payload) => {
  const { data } = await api.post("/orders", payload);
  return data;
};

export const getMyOrders = async () => {
  const { data } = await api.get("/orders/mine");
  return data;
};

export const getMyOrderById = async (orderId) => {
  const { data } = await api.get(`/orders/mine/${orderId}`);
  return data;
};