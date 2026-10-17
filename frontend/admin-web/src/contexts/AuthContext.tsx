import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import apiClient from "../lib/api-client";
import keycloak from "../lib/keycloak";

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
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<AdminUser>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
let initialization: Promise<boolean> | undefined;

function initKeycloak() {
  initialization ??= keycloak.init({
    // Do not silently reuse main-web's realm SSO session. Admin sign-in must
    // explicitly authenticate so a user account from another app is not
    // accidentally carried into this client.
    pkceMethod: "S256",
  });
  return initialization;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [initialized, setInitialized] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const refreshUser = useCallback(async () => {
    try {
      const response = await apiClient.get<AdminUser>("/users/me");
      setUser(response.data);
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
      try {
        const isAuthenticated = await initKeycloak();
        if (cancelled) return;

        setAuthenticated(isAuthenticated);
        if (isAuthenticated) {
          await refreshUser();
        }
      } catch (error) {
        console.error("Không thể khởi tạo phiên quản trị:", error);
        if (!cancelled) {
          setAuthenticated(Boolean(keycloak.authenticated));
          setAuthError("Không thể kiểm tra quyền admin. Hãy kiểm tra backend và đăng nhập lại.");
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

  const login = useCallback(async () => {
    await keycloak.login({
      redirectUri: `${window.location.origin}/login`,
      prompt: "login",
    });
  }, []);

  const logout = useCallback(async () => {
    await keycloak.logout({ redirectUri: `${window.location.origin}/login` });
    setAuthenticated(false);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ initialized, authenticated, user, authError, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth phải nằm bên trong AuthProvider");
  return context;
}
