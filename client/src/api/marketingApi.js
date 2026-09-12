import api from "./axiosInstance";

export const mirrorMarketingEvent = async (payload) => {
  const { data } = await api.post("/marketing/events", payload);
  return data;
};

export const unsubscribeFromMarketing = async (token) => {
  const { data } = await api.post("/marketing/unsubscribe", { token });
  return data;
};
