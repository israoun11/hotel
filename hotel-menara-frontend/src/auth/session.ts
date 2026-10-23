import type { Admin } from "../api/types";

/**
 * Administrator session. The backend issues a JWT (POST /auth/login) that is sent as
 * `Authorization: Bearer <token>`. It is kept in sessionStorage (cleared when the browser tab closes),
 * together with its expiry computed from `expiresInSeconds`.
 */
export interface Session {
  token: string;
  expiresAt: number;
  admin: Pick<Admin, "id" | "email" | "name">;
}

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const SESSION_KEY = "menara.admin.session";

function isSession(value: unknown): value is Session {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  const admin = v.admin as Record<string, unknown> | undefined;
  return (
    typeof v.token === "string" &&
    v.token.length > 0 &&
    typeof v.expiresAt === "number" &&
    typeof admin === "object" &&
    admin !== null &&
    typeof admin.email === "string"
  );
}

export type EndReason = "logout" | "expired";

export interface SessionStore {
  get(): Session | null;
  save(token: string, expiresInSeconds: number, admin: Session["admin"]): Session;
  /** Ends the session. `expired` = the backend rejected the token or it reached its expiry. */
  clear(reason?: EndReason): void;
  /** Why the last session ended (shown on the login page). */
  lastEndReason(): EndReason | null;
  subscribe(listener: (session: Session | null) => void): () => void;
}

export function createSessionStore(storage: KeyValueStorage | null, now: () => number = Date.now): SessionStore {
  let current: Session | null = null;
  let endReason: EndReason | null = null;
  const listeners = new Set<(session: Session | null) => void>();

  const safeRemove = () => {
    try {
      storage?.removeItem(SESSION_KEY);
    } catch {
      // Storage can be unavailable (private mode): the in-memory session still works.
    }
  };

  // Restore a still-valid session (with a one-minute safety margin).
  try {
    const raw = storage?.getItem(SESSION_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isSession(parsed) && parsed.expiresAt - 60_000 > now()) current = parsed;
      else safeRemove();
    }
  } catch {
    safeRemove();
  }

  const emit = () => listeners.forEach((listener) => listener(current));

  return {
    get() {
      if (current && current.expiresAt <= now()) {
        current = null;
        endReason = "expired";
        safeRemove();
        emit();
      }
      return current;
    },
    save(token, expiresInSeconds, admin) {
      endReason = null;
      current = { token, expiresAt: now() + expiresInSeconds * 1000, admin: { id: admin.id, email: admin.email, name: admin.name } };
      try {
        storage?.setItem(SESSION_KEY, JSON.stringify(current));
      } catch {
        // Keep the in-memory session.
      }
      emit();
      return current;
    },
    clear(reason = "logout") {
      const had = current !== null;
      if (had) endReason = reason;
      current = null;
      safeRemove();
      if (had) emit();
    },
    lastEndReason() {
      return endReason;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

function browserSessionStorage(): KeyValueStorage | null {
  try {
    return typeof window !== "undefined" ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

export const sessionStore = createSessionStore(browserSessionStorage());
