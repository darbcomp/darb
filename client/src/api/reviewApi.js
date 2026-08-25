import api from "./axiosInstance";

export const getPublicReviews = async (
  params = {}
) => {
  const { data } = await api.get(
    "/reviews",
    {
      params,
    }
  );

  return data;
};

export const getReviewEligibility =
  async () => {
    const { data } = await api.get(
      "/reviews/eligibility"
    );

    return data;
  };

export const getMyReview =
  async () => {
    const { data } = await api.get(
      "/reviews/mine"
    );

    return data;
  };

export const createCustomerReview =
  async (payload) => {
    const { data } = await api.post(
      "/reviews",
      payload
    );

    return data;
  };