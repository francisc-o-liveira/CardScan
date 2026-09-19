"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { AuthUser } from "@cardscan/types";
import type { RegisterInput, LoginInput } from "@cardscan/validation";
import { api } from "@/services/api";
import { setAccessToken, setLogoutHandler } from "@/lib/api-client";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setLogoutHandler(() => {
      clearSession();
      router.push("/login");
    });
    return () => setLogoutHandler(null);
  }, [clearSession, router]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const session = await api.auth.refresh();
        if (cancelled) return;
        setAccessToken(session.tokens.accessToken);
        setUser(session.user);
      } catch {
        if (!cancelled) clearSession();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const session = await api.auth.login(input);
    setAccessToken(session.tokens.accessToken);
    setUser(session.user);
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const session = await api.auth.register(input);
    setAccessToken(session.tokens.accessToken);
    setUser(session.user);
  }, []);

  const logout = useCallback(async () => {
    await api.auth.logout().catch(() => undefined);
    clearSession();
    router.push("/login");
  }, [clearSession, router]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
