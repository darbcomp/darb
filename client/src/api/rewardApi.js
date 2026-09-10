import api from "./axiosInstance";
export const getMyRewards = async () => (await api.get("/rewards/mine")).data;
export const spinReward = async (grantId) => (await api.post("/rewards/spin", grantId ? { grantId } : {})).data;
export const claimGuestOrderSpin = async (phone) => (await api.post("/rewards/guest/order-spin", { phone })).data;
export const claimPolicyReward = async () => (await api.post("/rewards/policy")).data;
