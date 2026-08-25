import api from "./axiosInstance";

export const trackOrder =
  async (payload) => {
    const { data } =
      await api.post(
        "/orders/track",
        payload
      );

    return data;
  };