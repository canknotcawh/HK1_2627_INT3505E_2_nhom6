import axios from "axios";
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "./auth-tokens";

const apiBaseUrl = new URL(
  import.meta.env.VITE_API_BASE_URL || `${window.location.protocol}//localhost:8080`,
  window.location.origin,
);
if (["localhost", "127.0.0.1"].includes(apiBaseUrl.hostname)
    && !["localhost", "127.0.0.1"].includes(window.location.hostname)) {
  apiBaseUrl.hostname = window.location.hostname;
}

// API calls below already include /api/v1. Accept either the backend origin
// or a configured URL that already ends in /api/v1 without duplicating it.
apiBaseUrl.pathname = apiBaseUrl.pathname
  .replace(/\/+$/, "")
  .replace(/\/api\/v1$/i, "");
apiBaseUrl.search = "";
apiBaseUrl.hash = "";

const apiClient = axios.create({
  baseURL: apiBaseUrl.toString().replace(/\/$/, ""),
});

apiClient.interceptors.request.use((config) => {
  // Public auth endpoints must work even when the browser has an expired or
  // stale token left from a previous session.
  const token = isAuthEndpoint(config.url) ? null : getAccessToken();
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
    .post(`${apiClient.defaults.baseURL}/api/v1/public/auth/refresh`, { refreshToken })
    .then((response) => {
      const token = response.data.accessToken as string;
      const nextRefreshToken = (response.data.refreshToken as string | undefined) ?? refreshToken;
      setTokens(token, nextRefreshToken);
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

function isAuthEndpoint(url?: string): boolean {
  return !!url && url.includes("/api/v1/public/auth/");
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    if (response?.status === 401 && !config.__isRetry && !isAuthEndpoint(config.url)) {
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
