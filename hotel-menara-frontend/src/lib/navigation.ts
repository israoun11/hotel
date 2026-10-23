/** Whether a navigation link should be shown as the current page. "/" only matches exactly. */
export function isActivePath(current: string, href: string): boolean {
  if (href === "/") return current === "/";
  return current === href || current.startsWith(`${href}/`);
}

/** Keyboard focus trap for dialogs and the mobile menu: index of the element to focus after Tab / Shift+Tab. */
export function nextFocusIndex(currentIndex: number, count: number, backwards: boolean): number {
  if (count === 0) return -1;
  if (currentIndex < 0) return backwards ? count - 1 : 0;
  return backwards ? (currentIndex - 1 + count) % count : (currentIndex + 1) % count;
}

/** Matches "/rooms/:slug" style patterns. Returns the parameters, or null when the path does not match. */
export function matchPath(pattern: string, path: string): Record<string, string> | null {
  const a = pattern.split("/").filter(Boolean);
  const b = path.split("/").filter(Boolean);
  if (a.length !== b.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < a.length; i += 1) {
    if (a[i].startsWith(":")) {
      try {
        params[a[i].slice(1)] = decodeURIComponent(b[i]);
      } catch {
        return null;
      }
    } else if (a[i] !== b[i]) return null;
  }
  return params;
}

/** Where to go after signing in: only an internal admin page is accepted (never another site). */
export function safeAdminReturn(next: string | null): string {
  return next && /^\/admin(\/[a-z-]+)?$/.test(next) && next !== "/admin/login" ? next : "/admin";
}
