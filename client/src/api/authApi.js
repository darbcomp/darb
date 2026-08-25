import api from "./axiosInstance";

export const loginCustomer = async (payload) => {
  const { data } = await api.post("/auth/login", payload);
  return data;
};

export const registerCustomer = async (payload) => {
  const { data } = await api.post("/auth/register", payload);
  return data;
};

export const loginAdmin = async (payload) => {
  const { data } = await api.post("/auth/admin/login", payload);
  return data;
};

export const getCurrentUser = async () => {
  const { data } = await api.get("/auth/me");
  return data;
};

export const getCurrentAdmin = async () => {
  const { data } = await api.get("/auth/admin/me");
  return data;
};

export const logoutCustomer = async () => {
  const { data } = await api.post("/auth/logout");
  return data;
};