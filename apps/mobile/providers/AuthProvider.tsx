import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { AuthUser } from "@cardscan/types";
import type { RegisterInput, LoginInput } from "@cardscan/validation";
import { api } from "@/services/api";
import { setAccessToken } from "@/lib/api-client";
import {
  setStoredRefreshToken,
  clearStoredRefreshToken,
  getStoredRefreshToken,
} from "@/utils/secureStorage";

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

  const clearSession = useCallback(async () => {
    setAccessToken(null);
    setUser(null);
    await clearStoredRefreshToken();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const storedRefreshToken = await getStoredRefreshToken();
        if (!storedRefreshToken) {
          setIsLoading(false);
          return;
        }
        const session = await api.auth.refresh();
        setAccessToken(session.tokens.accessToken);
        if (session.tokens.refreshToken) {
          await setStoredRefreshToken(session.tokens.refreshToken);
        }
        setUser(session.user);
      } catch {
        await clearSession();
      } finally {
        setIsLoading(false);
      }
    })();
  }, [clearSession]);

  const login = useCallback(async (input: LoginInput) => {
    const session = await api.auth.login(input);
    setAccessToken(session.tokens.accessToken);
    if (session.tokens.refreshToken) {
      await setStoredRefreshToken(session.tokens.refreshToken);
    }
    setUser(session.user);
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const session = await api.auth.register(input);
    setAccessToken(session.tokens.accessToken);
    if (session.tokens.refreshToken) {
      await setStoredRefreshToken(session.tokens.refreshToken);
    }
    setUser(session.user);
  }, []);

  const logout = useCallback(async () => {
    await api.auth.logout().catch(() => undefined);
    await clearSession();
  }, [clearSession]);

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
