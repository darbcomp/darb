import api from "./axiosInstance";
export const getPublicBundles = async () => (await api.get("/bundles")).data;
