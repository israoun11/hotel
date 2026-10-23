import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "../api";
import { sessionStore, type Session } from "./session";

interface AuthValue {
  session: Session | null;
  /** POST /auth/login. Throws ApiError (e.g. INVALID_CREDENTIALS, RATE_LIMITED) on failure. */
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => sessionStore.get());

  useEffect(() => sessionStore.subscribe(setSession), []);

  // End the session exactly when the JWT expires.
  useEffect(() => {
    if (!session) return;
    const delay = Math.max(session.expiresAt - Date.now(), 0);
    const timer = window.setTimeout(() => sessionStore.get(), Math.min(delay + 500, 2_147_000_000));
    return () => window.clearTimeout(timer);
  }, [session]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.login(email, password);
    sessionStore.save(result.token, result.expiresInSeconds, result.admin);
  }, []);

  const logout = useCallback(() => sessionStore.clear("logout"), []);

  const value = useMemo(() => ({ session, login, logout }), [session, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>");
  return value;
}
