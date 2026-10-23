import { api } from "../api";
import { LoadError, Loading, Notice } from "../components/Feedback";
import { useApi } from "../hooks/useApi";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useI18n } from "../i18n/LanguageContext";
import { formatMoney, formatRange } from "../lib/format";
import { isPlaceholder } from "../lib/hotel";
import { Link } from "../router/Router";
import { AdminHeader, StatusBadge } from "./ui";

async function loadDashboard() {
  const [pending, confirmed, messages, latest, rooms, services, gallery, settings] = await Promise.all([
    api.admin.bookings({ status: "pending", limit: 1 }),
    api.admin.bookings({ status: "confirmed", limit: 1 }),
    api.admin.messages({ status: "new", limit: 1 }),
    api.admin.bookings({ limit: 5 }),
    api.admin.rooms(),
    api.admin.services(),
    api.admin.gallery(),
    api.settings(),
  ]);
  const hasDemo =
    rooms.some((r) => r.isDemo) || services.some((s) => s.isDemo) || gallery.some((g) => g.isDemo) || isPlaceholder(settings.tagline) || isPlaceholder(settings.contact?.email);
  return {
    pending: pending.meta.total,
    confirmed: confirmed.meta.total,
    newMessages: messages.meta.total,
    activeRooms: rooms.filter((r) => r.isActive).length,
    latest: latest.items,
    hasDemo,
  };
}

export function DashboardPage() {
  const { t, lang } = useI18n();
  const data = useApi("admin:dashboard", loadDashboard, { cacheable: false });
  useDocumentTitle(t.admin.nav.dashboard);

  return (
    <>
      <AdminHeader title={t.admin.nav.dashboard} />
      {data.loading && <Loading />}
      {data.error !== undefined && <LoadError error={data.error} onRetry={data.reload} />}
      {data.data && (
        <>
          {data.data.hasDemo && <Notice tone="warning">{t.admin.dashboard.demoWarning}</Notice>}
          <ul className="kpis">
            <li>
              <Link to="/admin/bookings?status=pending">
                <span className="kpis__value">{data.data.pending}</span>
                <span className="kpis__label">{t.admin.dashboard.pending}</span>
              </Link>
            </li>
            <li>
              <Link to="/admin/bookings?status=confirmed">
                <span className="kpis__value">{data.data.confirmed}</span>
                <span className="kpis__label">{t.admin.dashboard.upcoming}</span>
              </Link>
            </li>
            <li>
              <Link to="/admin/messages?status=new">
                <span className="kpis__value">{data.data.newMessages}</span>
                <span className="kpis__label">{t.admin.dashboard.newMessages}</span>
              </Link>
            </li>
            <li>
              <Link to="/admin/rooms">
                <span className="kpis__value">{data.data.activeRooms}</span>
                <span className="kpis__label">{t.admin.dashboard.rooms}</span>
              </Link>
            </li>
          </ul>

          <section className="admin-card">
            <div className="admin-card__head">
              <h2>{t.admin.dashboard.latest}</h2>
              <Link to="/admin/bookings">{t.admin.dashboard.seeAll}</Link>
            </div>
            {data.data.latest.length === 0 ? (
              <p className="admin-empty">{t.admin.dashboard.empty}</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th scope="col">{t.admin.table.reference}</th>
                    <th scope="col">{t.admin.table.guest}</th>
                    <th scope="col">{t.admin.table.dates}</th>
                    <th scope="col">{t.admin.table.total}</th>
                    <th scope="col">{t.admin.table.status}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.latest.map((b) => (
                    <tr key={b.id}>
                      <td data-label={t.admin.table.reference}>
                        <Link to={`/admin/bookings?reference=${b.reference}`} className="mono">
                          {b.reference}
                        </Link>
                      </td>
                      <td data-label={t.admin.table.guest}>
                        {b.guest.firstName} {b.guest.lastName}
                      </td>
                      <td data-label={t.admin.table.dates}>{formatRange(b.checkIn, b.checkOut, lang)}</td>
                      <td data-label={t.admin.table.total}>{formatMoney(b.pricing.total, b.pricing.currency, lang)}</td>
                      <td data-label={t.admin.table.status}>
                        <StatusBadge status={b.status} label={t.booking.statuses[b.status]} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </>
  );
}
