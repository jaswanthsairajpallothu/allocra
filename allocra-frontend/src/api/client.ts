import axios, { AxiosInstance } from "axios";

const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  timeout: 15000,
});

export type GetTokenFn = () => Promise<string | null>;

export function setupInterceptors(getToken: GetTokenFn) {
  api.interceptors.request.use(async (config) => {
    try {
      const token = await getToken();
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch {
      // getToken failed — request continues unauthenticated
    }
    return config;
  });

  api.interceptors.response.use(
    (res) => res,
    (error) => {
      const detail = error?.response?.data?.detail;
      if (typeof detail === "object" && detail?.error === "plan_required") {
        window.dispatchEvent(
          new CustomEvent("allocra:plan_required", { detail })
        );
      }
      return Promise.reject(error);
    }
  );
}

export default api;
