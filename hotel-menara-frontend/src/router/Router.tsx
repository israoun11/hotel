import { createContext, useCallback, useContext, useEffect, useMemo, useState, type AnchorHTMLAttributes, type MouseEvent, type ReactNode } from "react";

/**
 * Minimal History-API router (no extra dependency). Paths look like "/rooms/double-room?x=1".
 * Production hosting must serve index.html for unknown paths (see README, "Deployment").
 */
interface RouterValue {
  path: string;
  search: URLSearchParams;
  navigate: (to: string, options?: { replace?: boolean; keepScroll?: boolean }) => void;
}

const RouterContext = createContext<RouterValue | null>(null);

const readLocation = () => ({ path: window.location.pathname, search: window.location.search, hash: window.location.hash });

export function RouterProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState(readLocation);

  useEffect(() => {
    const onPop = () => setLocation(readLocation());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback<RouterValue["navigate"]>((to, options = {}) => {
    const url = new URL(to, window.location.origin);
    const next = `${url.pathname}${url.search}${url.hash}`;
    if (next !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
      if (options.replace) window.history.replaceState(null, "", next);
      else window.history.pushState(null, "", next);
    }
    setLocation(readLocation());
    if (!options.keepScroll && !url.hash) window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, []);

  // "#anchor" links: scroll once the target page has rendered (also on first load).
  useEffect(() => {
    if (!location.hash) return;
    const id = decodeURIComponent(location.hash.slice(1));
    const timer = window.setTimeout(() => document.getElementById(id)?.scrollIntoView(), 50);
    return () => window.clearTimeout(timer);
  }, [location]);

  const value = useMemo(
    () => ({ path: location.path, search: new URLSearchParams(location.search), navigate }),
    [location.path, location.search, navigate],
  );
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter(): RouterValue {
  const value = useContext(RouterContext);
  if (!value) throw new Error("useRouter must be used inside <RouterProvider>");
  return value;
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; replace?: boolean };

/** Internal link: same-tab clicks are handled by the router; ctrl/cmd/middle clicks keep the browser behaviour. */
export function Link({ to, replace, onClick, ...rest }: LinkProps) {
  const { navigate } = useRouter();
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(to, { replace });
  };
  return <a href={to} onClick={handleClick} {...rest} />;
}
