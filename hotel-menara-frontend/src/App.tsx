import type { ReactNode } from "react";
import { AdminApp } from "./admin/AdminApp";
import { AuthProvider } from "./auth/AuthContext";
import { SiteLayout } from "./components/SiteLayout";
import { HotelProvider } from "./context/HotelContext";
import { LanguageProvider } from "./i18n/LanguageContext";
import { matchPath } from "./lib/navigation";
import { BookingPage } from "./pages/Booking";
import { BookingManagePage } from "./pages/BookingManage";
import { ContactPage } from "./pages/Contact";
import { GalleryPage } from "./pages/Gallery";
import { HomePage } from "./pages/Home";
import { HotelPage } from "./pages/Hotel";
import { NotFoundPage } from "./pages/NotFound";
import { RoomDetailPage } from "./pages/RoomDetail";
import { RoomsPage } from "./pages/Rooms";
import { ServicesPage } from "./pages/Services";
import { SpaPage } from "./pages/Spa";
import { RouterProvider, useRouter } from "./router/Router";

/** Public pages. The home page draws the header over its full-screen photograph. */
const PUBLIC_ROUTES: Array<{ path: string; render: (params: Record<string, string>) => ReactNode; overlay?: boolean }> = [
  { path: "/", render: () => <HomePage />, overlay: true },
  { path: "/hotel", render: () => <HotelPage /> },
  { path: "/rooms", render: () => <RoomsPage /> },
  { path: "/rooms/:slug", render: (p) => <RoomDetailPage key={p.slug} slug={p.slug} /> },
  { path: "/services", render: () => <ServicesPage /> },
  { path: "/spa", render: () => <SpaPage /> },
  { path: "/gallery", render: () => <GalleryPage /> },
  { path: "/contact", render: () => <ContactPage /> },
  { path: "/booking", render: () => <BookingPage /> },
  { path: "/booking/manage", render: () => <BookingManagePage /> },
];

function Routes() {
  const { path } = useRouter();
  if (path === "/admin" || path.startsWith("/admin/")) return <AdminApp />;

  for (const route of PUBLIC_ROUTES) {
    const params = matchPath(route.path, path);
    if (params) return <SiteLayout overlayHeader={route.overlay}>{route.render(params)}</SiteLayout>;
  }
  return (
    <SiteLayout>
      <NotFoundPage />
    </SiteLayout>
  );
}

export function App() {
  return (
    <LanguageProvider>
      <RouterProvider>
        <HotelProvider>
          <AuthProvider>
            <Routes />
          </AuthProvider>
        </HotelProvider>
      </RouterProvider>
    </LanguageProvider>
  );
}
