import api from "./axiosInstance";

export const getPublicSettings = async () => {
  const { data } = await api.get("/settings/public");
  return data;
};