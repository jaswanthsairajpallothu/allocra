import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export function setupInterceptors(getToken: () => Promise<string | null>) {
  api.interceptors.request.use(async (config) => {
    const token = await getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
  api.interceptors.response.use(
    (r) => r,
    (error) => {
      const msg = error.response?.data?.detail;
      if (typeof msg === 'object' && msg?.error === 'plan_required') {
        window.dispatchEvent(new CustomEvent('allocra:plan_required', { detail: msg }));
      }
      return Promise.reject(error);
    }
  );
}

export default api;
