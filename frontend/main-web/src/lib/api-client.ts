import axios from "axios";
import keycloak from "./keycloak";

const apiBaseUrl = new URL(
  import.meta.env.VITE_API_BASE_URL || `${window.location.protocol}//localhost:8080/api/v1`,
  window.location.origin,
);
if (["localhost", "127.0.0.1"].includes(apiBaseUrl.hostname)
    && !["localhost", "127.0.0.1"].includes(window.location.hostname)) {
  apiBaseUrl.hostname = window.location.hostname;
}

let resolvedBaseUrl = apiBaseUrl.toString().replace(/\/$/, "");
if (!resolvedBaseUrl.endsWith("/api/v1")) {
  resolvedBaseUrl += "/api/v1";
}

const apiClient = axios.create({
  baseURL: resolvedBaseUrl,
});

apiClient.interceptors.request.use((config) => {
  if (keycloak.token) {
    config.headers.Authorization = `Bearer ${keycloak.token}`;
  }
  return config;
});


apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      keycloak.login();
    }
    return Promise.reject(error);
  }
);

export default apiClient;
