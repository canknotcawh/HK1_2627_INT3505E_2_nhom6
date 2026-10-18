import axios from "axios";
import { clearTokens, getAccessToken, getRefreshToken, setAccessToken } from "./auth-tokens";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  refreshing ??= axios
    .post(`${import.meta.env.VITE_API_BASE_URL}/api/v1/public/auth/refresh`, { refreshToken })
    .then((response) => {
      const token = response.data.accessToken as string;
      setAccessToken(token);
      return token;
    })
    .catch(() => {
      clearTokens();
      return null;
    })
    .finally(() => {
      refreshing = null;
    });

  return refreshing;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    if (response?.status === 401 && !config.__isRetry) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        config.__isRetry = true;
        config.headers.Authorization = `Bearer ${newToken}`;
        return apiClient.request(config);
      }
      clearTokens();
      window.location.assign("/login");
    }
    return Promise.reject(error);
  }
);

export default apiClient;
