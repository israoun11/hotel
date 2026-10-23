import type { FieldIssue } from "./types";

/**
 * Error thrown by every failed API call. `code` is the backend's machine-readable code
 * (e.g. "ROOM_UNAVAILABLE"), or one of the client codes below when no backend answer was usable.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: FieldIssue[];

  constructor(status: number, code: string, message: string, details: FieldIssue[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** Codes produced by the client itself (status 0 = no HTTP response). */
export const CLIENT_ERROR = {
  network: "NETWORK_ERROR",
  timeout: "TIMEOUT",
  invalidResponse: "INVALID_RESPONSE",
  aborted: "ABORTED",
} as const;

const SESSION_ENDED_CODES = new Set(["INVALID_TOKEN", "UNAUTHORIZED"]);

export interface ApiResult<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export type Query = Record<string, string | number | boolean | undefined>;

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  query?: Query;
  body?: unknown;
  /** Send the administrator token (Authorization: Bearer ...). */
  auth?: boolean;
  signal?: AbortSignal;
}

export interface ClientConfig {
  baseUrl: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  /** Returns the current administrator token, if any. */
  getToken?: () => string | null;
  /** Called when an authenticated request is rejected with HTTP 401 (expired or revoked token). */
  onUnauthorized?: () => void;
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

function toIssues(value: unknown): FieldIssue[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) =>
    isObject(item) && typeof item.path === "string" && typeof item.message === "string" ? [{ path: item.path, message: item.message }] : [],
  );
}

export function buildQuery(query?: Query): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : "";
}

export interface ApiClient {
  request<T>(path: string, options?: RequestOptions): Promise<ApiResult<T>>;
}

/** Small fetch wrapper that understands the backend envelope `{ success, data, meta }` / `{ success, error }`. */
export function createClient(config: ClientConfig): ApiClient {
  const baseUrl = config.baseUrl.replace(/\/+$/, "");
  const timeoutMs = config.timeoutMs ?? 15000;

  async function request<T>(path: string, options: RequestOptions = {}): Promise<ApiResult<T>> {
    const fetchImpl = config.fetchImpl ?? fetch;
    const headers: Record<string, string> = { Accept: "application/json" };
    if (options.body !== undefined) headers["Content-Type"] = "application/json";
    if (options.auth) {
      const token = config.getToken?.();
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    const onAbort = () => controller.abort();
    options.signal?.addEventListener("abort", onAbort);

    let response: Response;
    try {
      response = await fetchImpl(`${baseUrl}${path}${buildQuery(options.query)}`, {
        method: options.method ?? "GET",
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: controller.signal,
      });
    } catch {
      if (timedOut) throw new ApiError(0, CLIENT_ERROR.timeout, "The server did not answer in time");
      if (options.signal?.aborted) throw new ApiError(0, CLIENT_ERROR.aborted, "Request cancelled");
      throw new ApiError(0, CLIENT_ERROR.network, "The server could not be reached");
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", onAbort);
    }

    if (response.status === 204) return { data: undefined as T };

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new ApiError(response.status, CLIENT_ERROR.invalidResponse, "The server sent an unreadable answer");
    }

    if (!response.ok || !isObject(payload) || payload.success !== true) {
      const error = isObject(payload) && isObject(payload.error) ? payload.error : {};
      const code = typeof error.code === "string" ? error.code : response.ok ? CLIENT_ERROR.invalidResponse : `HTTP_${response.status}`;
      const message = typeof error.message === "string" ? error.message : `Request failed with status ${response.status}`;
      // INVALID_TOKEN / UNAUTHORIZED = the session is no longer valid. (A wrong *current* password on
      // POST /auth/change-password is also a 401, INVALID_CREDENTIALS, but the session stays valid.)
      if (response.status === 401 && options.auth && SESSION_ENDED_CODES.has(code)) config.onUnauthorized?.();
      throw new ApiError(response.ok ? 502 : response.status, code, message, toIssues(error.details));
    }

    if (!("data" in payload)) throw new ApiError(response.status, CLIENT_ERROR.invalidResponse, "The server answer has no data");
    return { data: payload.data as T, meta: isObject(payload.meta) ? payload.meta : undefined };
  }

  return { request };
}
