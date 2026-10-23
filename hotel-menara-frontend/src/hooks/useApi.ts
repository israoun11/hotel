import { useCallback, useEffect, useRef, useState } from "react";

/** Responses of public GET requests are kept for the whole visit, so moving between pages does not refetch them. */
const cache = new Map<string, unknown>();

export interface ApiState<T> {
  data: T | undefined;
  error: unknown;
  loading: boolean;
  reload: () => void;
}

/**
 * Loads data once per `key`. Pass `cacheable: false` for data that must always be fresh (admin screens).
 * A null key skips the request.
 */
export function useApi<T>(key: string | null, load: () => Promise<T>, options: { cacheable?: boolean } = {}): ApiState<T> {
  const cacheable = options.cacheable ?? true;
  const [state, setState] = useState<{ data: T | undefined; error: unknown; loading: boolean }>(() => ({
    data: key && cacheable ? (cache.get(key) as T | undefined) : undefined,
    error: undefined,
    loading: key !== null && !(cacheable && key && cache.has(key)),
  }));
  const [version, setVersion] = useState(0);
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    if (key === null) return;
    if (cacheable && version === 0 && cache.has(key)) {
      setState({ data: cache.get(key) as T, error: undefined, loading: false });
      return;
    }
    let active = true;
    setState((previous) => ({ data: previous.data, error: undefined, loading: true }));
    loadRef.current().then(
      (data) => {
        if (cacheable) cache.set(key, data);
        if (active) setState({ data, error: undefined, loading: false });
      },
      (error: unknown) => {
        if (active) setState({ data: undefined, error, loading: false });
      },
    );
    return () => {
      active = false;
    };
  }, [key, version, cacheable]);

  const reload = useCallback(() => {
    if (key) cache.delete(key);
    setVersion((v) => v + 1);
  }, [key]);

  return { ...state, reload };
}

/** Forget cached public data (used after an administrator changes content). */
export const clearApiCache = (): void => cache.clear();
