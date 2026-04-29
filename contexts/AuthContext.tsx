"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getAuthenticatedUser,
  login as loginRequest,
  logout as logoutRequest,
  type CbtCapabilities,
  type CbtUser,
  type LoginPayload,
} from "@/lib/auth";
import { CBT_TOKEN_COOKIE } from "@/lib/config";
import { deleteCookie, getCookie } from "@/lib/cookies";

interface AuthState {
  user: CbtUser | null;
  loading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  hasCapability: (capability?: keyof CbtCapabilities | null) => boolean;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CbtUser | null>(null);
  const [loading, setLoading] = useState(true);

  const hydrate = useCallback(async () => {
    const token = getCookie(CBT_TOKEN_COOKIE);
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const currentUser = await getAuthenticatedUser();
      setUser(currentUser);

      if (!currentUser) {
        deleteCookie(CBT_TOKEN_COOKIE);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const login = useCallback(async (payload: LoginPayload) => {
    const response = await loginRequest(payload);
    setUser(response.user);
  }, []);

  const logout = useCallback(async () => {
    await logoutRequest();
    setUser(null);
    setLoading(false);
  }, []);

  const refreshAuth = useCallback(async () => {
    await hydrate();
  }, [hydrate]);

  const hasCapability = useCallback(
    (capability?: keyof CbtCapabilities | null) => {
      if (!capability) {
        return true;
      }

      return Boolean(user?.capabilities?.[capability]);
    },
    [user],
  );

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      refreshAuth,
      hasCapability,
    }),
    [user, loading, login, logout, refreshAuth, hasCapability],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}