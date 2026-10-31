import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';

import apiClient from '../lib/api-client';
import { clearTokens, getAccessToken, setTokens } from '../lib/auth-tokens';

export type Role = 'guest' | 'user' | 'admin' | 'unknown';

export type CurrentUser = {
  id: string;
  fullName: string;
  email: string;
  role: 'USER' | 'ADMIN';
};

function roleFromUser(currentUser: CurrentUser): Role {
  return currentUser.role === 'ADMIN' ? 'admin' : 'user';
}

export type AuthPayload = { accessToken: string; refreshToken: string; user: CurrentUser };

interface AuthContextType {
  role: Role;
  initialized: boolean;
  roleError: string | null;
  username?: string;
  user?: CurrentUser;

  loginWithGoogleToken: (googleIdToken: string) => Promise<AuthPayload>;
  loginWithPassword: (email: string, password: string) => Promise<AuthPayload>;
  register: (email: string, password: string, fullName: string) => Promise<AuthPayload>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>('guest');
  const [roleError, setRoleError] = useState<string | null>(null);
  const [user, setUser] = useState<CurrentUser | undefined>(undefined);
  const [initialized, setInitialized] = useState(false);

  // Restore session from a previously stored access token
  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      const token = getAccessToken();
      if (!token) {
        if (!cancelled) setInitialized(true);
        return;
      }

      try {
        const response = await apiClient.get<CurrentUser>('/api/v1/users/me');
        if (cancelled) return;
        setRoleError(null);
        setUser(response.data);
        setRole(roleFromUser(response.data));
      } catch (error) {
        console.error('Failed to restore session:', error);
        if (cancelled) return;
        if (!getAccessToken()) {
          // The api-client interceptor already tried a refresh and cleared the
          // tokens, so this session is genuinely gone.
          setRole('guest');
        } else {
          // Tokens are still present; the backend just couldn't be reached.
          const message = error instanceof Error ? error.message : undefined;
          setRoleError(message ? `Không kết nối được API. ${message}` : 'Không kết nối được API.');
          setRole('unknown');
        }
      } finally {
        if (!cancelled) setInitialized(true);
      }
    };

    initialize();

    return () => {
      cancelled = true;
    };
  }, []);

  const applyAuthPayload = useCallback((payload: AuthPayload) => {
    setTokens(payload.accessToken, payload.refreshToken);
    setRoleError(null);
    setUser(payload.user);
    setRole(roleFromUser(payload.user));
  }, []);

  // Login with the Google ID token obtained from Google Identity Services
  const loginWithGoogleToken = useCallback(async (googleIdToken: string): Promise<AuthPayload> => {
    const response = await apiClient.post<AuthPayload>('/api/v1/public/auth/google', { idToken: googleIdToken });
    applyAuthPayload(response.data);
    return response.data;
  }, [applyAuthPayload]);

  const loginWithPassword = useCallback(async (email: string, password: string): Promise<AuthPayload> => {
    const response = await apiClient.post<AuthPayload>('/api/v1/public/auth/login', { email, password });
    applyAuthPayload(response.data);
    return response.data;
  }, [applyAuthPayload]);

  const register = useCallback(async (email: string, password: string, fullName: string): Promise<AuthPayload> => {
    const response = await apiClient.post<AuthPayload>('/api/v1/public/auth/register', { email, password, fullName });
    applyAuthPayload(response.data);
    return response.data;
  }, [applyAuthPayload]);

  const logout = useCallback(() => {
    clearTokens();
    setUser(undefined);
    setRoleError(null);
    setRole('guest');
  }, []);

  const username = user?.fullName ?? user?.email;

  return (
    <AuthContext.Provider value={{ role, initialized, roleError, username, user, loginWithGoogleToken, loginWithPassword, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
