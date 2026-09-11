import api from "./axiosInstance";

export const mirrorMarketingEvent = async (payload) => {
  const { data } = await api.post("/marketing/events", payload);
  return data;
};
