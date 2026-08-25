import api from "./axiosInstance";

export const createWaitlistRequest = async (payload) => {
  const { data } = await api.post("/waitlist", payload);
  return data;
};