import api from "./axiosInstance";
export const getMyRewards = async () => (await api.get("/rewards/mine")).data;
export const spinReward = async () => (await api.post("/rewards/spin")).data;
export const claimPolicyReward = async () => (await api.post("/rewards/policy")).data;
