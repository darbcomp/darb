import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
  withCredentials: true,
});

let csrfToken =
  typeof sessionStorage !== "undefined"
    ? sessionStorage.getItem("darb_csrf_token") || ""
    : "";

api.interceptors.request.use((config) => {
  const method = String(config.method || "get").toLowerCase();
  if (["post", "put", "patch", "delete"].includes(method) && csrfToken) {
    config.headers["X-CSRF-Token"] = csrfToken;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    const nextCsrf = response.headers?.["x-csrf-token"] || "";
    if (nextCsrf) {
      csrfToken = nextCsrf;
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem("darb_csrf_token", nextCsrf);
      }
    }
    return response;
  },
  (error) => {
    const nextCsrf = error?.response?.headers?.["x-csrf-token"] || "";
    if (nextCsrf) {
      csrfToken = nextCsrf;
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem("darb_csrf_token", nextCsrf);
      }
    }

    const message =
      error?.response?.data?.message ||
      error?.message ||
      "Something went wrong";

    return Promise.reject({
      ...error,
      response: error?.response,
      friendlyMessage: message,
      isNetworkError: !error?.response,
    });
  }
);

export default api;
