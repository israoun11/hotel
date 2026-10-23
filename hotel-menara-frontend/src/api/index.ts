import { sessionStore } from "../auth/session";
import { API_BASE_URL, API_TIMEOUT_MS } from "../config";
import { createClient } from "./client";
import { createEndpoints } from "./endpoints";

export const client = createClient({
  baseUrl: API_BASE_URL,
  timeoutMs: API_TIMEOUT_MS,
  getToken: () => sessionStore.get()?.token ?? null,
  // A 401 on an authenticated call means the token expired or was revoked (e.g. after a password change).
  onUnauthorized: () => sessionStore.clear("expired"),
});

export const api = createEndpoints(client);
