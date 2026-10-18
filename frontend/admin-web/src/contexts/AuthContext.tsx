import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import apiClient from "../lib/api-client";
import { clearTokens, getAccessToken, setTokens } from "../lib/auth-tokens";

export type AdminUser = {
  id: string;
  fullName: string;
  email: string;
  role: "ADMIN" | "USER";
};

type AuthContextValue = {
  initialized: boolean;
  authenticated: boolean;
  user: AdminUser | null;
  authError: string | null;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<AdminUser>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [initialized, setInitialized] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const refreshUser = useCallback(async () => {
    try {
      const response = await apiClient.get<AdminUser>("/users/me");
      setUser(response.data);
      setAuthenticated(true);
      setAuthError(null);
      return response.data;
    } catch (error) {
      setAuthError("Không thể kiểm tra quyền admin. Hãy kiểm tra backend rồi thử lại.");
      throw error;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      const token = getAccessToken();
      if (!token) {
        if (!cancelled) setInitialized(true);
        return;
      }

      try {
        await refreshUser();
      } catch (error) {
        console.error("Không thể khởi tạo phiên quản trị:", error);
        if (!cancelled && !getAccessToken()) {
          // The api-client interceptor already tried a refresh and cleared
          // the tokens, so this session is genuinely gone.
          setAuthenticated(false);
          setAuthError(null);
        }
      } finally {
        if (!cancelled) setInitialized(true);
      }
    };

    void initialize();
    return () => {
      cancelled = true;
    };
  }, [refreshUser]);

  const loginWithPassword = useCallback(async (email: string, password: string) => {
    const response = await apiClient.post<{ accessToken: string; refreshToken: string; user: AdminUser }>(
      "/public/auth/login",
      { email, password }
    );
    setTokens(response.data.accessToken, response.data.refreshToken);
    setUser(response.data.user);
    setAuthenticated(true);
    setAuthError(null);
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    setAuthenticated(false);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ initialized, authenticated, user, authError, loginWithPassword, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth phải nằm bên trong AuthProvider");
  return context;
}
