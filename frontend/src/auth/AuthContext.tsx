import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { apiFetch, clearToken, getToken, setToken } from "../api/client";
import { AuthUser, Role } from "./types";

type LoginResult = {
  ok: boolean;
  error?: string;
  roles?: Role[];
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMe = async () => {
    try {
      const me = await apiFetch("/auth/me");
      setUser({ email: me.email, roles: me.roles });
    } catch {
      clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    loadMe();
  }, []);

  const login = async (email: string, password: string): Promise<LoginResult> => {
    try {
      const result = await apiFetch("/auth/login", {
        method: "POST",
        auth: false,
        body: JSON.stringify({ email, password }),
      });
      setToken(result.access_token);
      const me = await apiFetch("/auth/me");
      setUser({ email: me.email, roles: me.roles });
      return { ok: true, roles: me.roles };
    } catch (err) {
      clearToken();
      setUser(null);
      return { ok: false, error: (err as Error).message };
    }
  };

  const logout = () => {
    apiFetch("/auth/logout", { method: "POST" }).catch(() => undefined);
    clearToken();
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
};
