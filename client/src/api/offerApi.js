import api from "./axiosInstance";

export const getPublicOffers = async () => {
  const { data } = await api.get("/offers");
  return data;
};
