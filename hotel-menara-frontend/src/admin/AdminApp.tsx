import { useEffect, useState, type ReactNode } from "react";
import { api } from "../api";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { LoadError, Loading } from "../components/Feedback";
import { LanguageSwitch } from "../components/Header";
import { useI18n } from "../i18n/LanguageContext";
import { isActivePath, matchPath } from "../lib/navigation";
import { Link, useRouter } from "../router/Router";
import { AccountPage } from "./Account";
import { BookingsPage } from "./Bookings";
import { DashboardPage } from "./Dashboard";
import { GalleryAdminPage } from "./GalleryAdmin";
import { AdminLoginPage } from "./Login";
import { MessagesPage } from "./Messages";
import { RoomsAdminPage } from "./RoomsAdmin";
import { ServicesAdminPage } from "./ServicesAdmin";
import { SettingsPage } from "./Settings";

function Redirect({ to }: { to: string }) {
  const { navigate } = useRouter();
  useEffect(() => navigate(to, { replace: true }), [navigate, to]);
  return null;
}

function AdminLayout({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { session, logout } = useAuth();
  const { path, navigate } = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => setMenuOpen(false), [path]);
  const items = [
    { to: "/admin", label: t.admin.nav.dashboard },
    { to: "/admin/bookings", label: t.admin.nav.bookings },
    { to: "/admin/rooms", label: t.admin.nav.rooms },
    { to: "/admin/services", label: t.admin.nav.services },
    { to: "/admin/gallery", label: t.admin.nav.gallery },
    { to: "/admin/messages", label: t.admin.nav.messages },
    { to: "/admin/settings", label: t.admin.nav.settings },
    { to: "/admin/account", label: t.admin.nav.account },
  ];
  return (
    <div className="admin">
      <a href="#admin-main" className="skip-link">
        {t.common.skipToContent}
      </a>
      <aside className={`admin-side ${menuOpen ? "is-open" : ""}`}>
        <div className="admin-side__top">
          <Link to="/admin" className="admin-side__brand">
            <img src="/brand/logo-light.png" alt="" width="70" height="44" />
            <span>{t.admin.title}</span>
          </Link>
          <button type="button" className="admin-side__toggle" aria-expanded={menuOpen} aria-controls="admin-nav" onClick={() => setMenuOpen((v) => !v)}>
            {menuOpen ? t.nav.closeMenu : t.nav.openMenu}
          </button>
        </div>
        <nav id="admin-nav" className="admin-side__nav" aria-label={t.admin.title}>
          <ul>
            {items.map((item) => (
              <li key={item.to}>
                <Link to={item.to} aria-current={(item.to === "/admin" ? path === "/admin" : isActivePath(path, item.to)) ? "page" : undefined}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="admin-side__foot">
          {session && <p className="admin-side__who">{t.admin.signedInAs(session.admin.name)}</p>}
          <LanguageSwitch className="admin-side__link" />
          <Link to="/" className="admin-side__link">
            {t.admin.backToSite}
          </Link>
          <button
            type="button"
            className="admin-side__link"
            onClick={() => {
              logout();
              navigate("/admin", { replace: true });
            }}
          >
            {t.admin.logout}
          </button>
        </div>
      </aside>
      <main id="admin-main" className="admin-main" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}

const ROUTES: Array<{ path: string; page: () => ReactNode }> = [
  { path: "/admin", page: () => <DashboardPage /> },
  { path: "/admin/bookings", page: () => <BookingsPage /> },
  { path: "/admin/rooms", page: () => <RoomsAdminPage /> },
  { path: "/admin/services", page: () => <ServicesAdminPage /> },
  { path: "/admin/gallery", page: () => <GalleryAdminPage /> },
  { path: "/admin/messages", page: () => <MessagesPage /> },
  { path: "/admin/settings", page: () => <SettingsPage /> },
  { path: "/admin/account", page: () => <AccountPage /> },
];

/** Administration area: separate layout, protected by the backend JWT. */
export function AdminApp() {
  const { t } = useI18n();
  const { session } = useAuth();
  const { path } = useRouter();
  const [verified, setVerified] = useState<"pending" | "ok" | unknown>("pending");
  const [attempt, setAttempt] = useState(0);
  const token = session?.token;

  // Check a restored token once with GET /auth/me (a 401 there ends the session automatically).
  useEffect(() => {
    if (!token) return;
    let active = true;
    setVerified("pending");
    api.me().then(
      () => active && setVerified("ok"),
      (error: unknown) => active && setVerified(error),
    );
    return () => {
      active = false;
    };
  }, [token, attempt]);

  // The sign-in form lives at /admin itself; /admin/login is kept as an alias.
  if (path === "/admin/login") return <Redirect to={`/admin${window.location.search}`} />;
  if (!session) return path === "/admin" ? <AdminLoginPage /> : <Redirect to={`/admin?next=${encodeURIComponent(path)}`} />;

  const route = ROUTES.find((r) => matchPath(r.path, path));
  let content: ReactNode;
  if (verified === "pending") content = <Loading label={t.admin.checking} />;
  else if (verified !== "ok" && !(verified instanceof ApiError && verified.status === 401))
    content = <LoadError error={verified} onRetry={() => setAttempt((a) => a + 1)} />;
  else content = route ? route.page() : <Redirect to="/admin" />;

  return <AdminLayout>{content}</AdminLayout>;
}
