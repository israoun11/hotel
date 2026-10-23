import { useState, type FormEvent } from "react";
import { api } from "../api";
import { BOOKING_STATUSES, type Booking, type BookingListQuery, type BookingStatus } from "../api/types";
import { LoadError, Loading, Notice } from "../components/Feedback";
import { SelectField, TextArea, TextField } from "../components/Fields";
import { useApi } from "../hooks/useApi";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useSubmit } from "../hooks/useSubmit";
import { useI18n } from "../i18n/LanguageContext";
import { errorMessage } from "../lib/errors";
import { formatDateTime, formatMoney, formatRange } from "../lib/format";
import { useRouter } from "../router/Router";
import { AdminHeader, ConfirmDialog, Modal, StatusBadge, useFlash } from "./ui";

type Action = Exclude<BookingStatus, "pending">;

/** Allowed transitions, as enforced by the backend (booking.service.js, ALLOWED_TRANSITIONS). */
export const NEXT_STATUSES: Record<BookingStatus, Action[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled"],
  cancelled: [],
  completed: [],
};

interface Filters {
  status: string;
  reference: string;
  email: string;
  checkInFrom: string;
  checkInTo: string;
}

const toQuery = (f: Filters, page: number): BookingListQuery => ({
  status: (f.status || undefined) as BookingStatus | undefined,
  reference: f.reference.trim() || undefined,
  email: f.email.trim() || undefined,
  checkInFrom: f.checkInFrom || undefined,
  checkInTo: f.checkInTo || undefined,
  page,
  limit: 20,
});

export function BookingsPage() {
  const { t, lang } = useI18n();
  const { search } = useRouter();
  const initial: Filters = { status: search.get("status") ?? "", reference: search.get("reference") ?? "", email: "", checkInFrom: "", checkInTo: "" };
  const [draft, setDraft] = useState<Filters>(initial);
  const [filters, setFilters] = useState<Filters>(initial);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [reason, setReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const { pending, run } = useSubmit();
  const { flash, node: flashNode } = useFlash();
  useDocumentTitle(t.admin.nav.bookings);

  const query = toQuery(filters, page);
  const list = useApi(`admin:bookings:${JSON.stringify(query)}`, () => api.admin.bookings(query), { cacheable: false });

  const applyFilters = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setFilters(draft);
  };

  const changeStatus = async (booking: Booking, status: Action) => {
    setActionError(null);
    await run(async () => {
      try {
        const updated = await api.admin.updateBookingStatus(booking.id, status, status === "cancelled" ? reason.trim() || undefined : undefined);
        setSelected(updated);
        setConfirmCancel(false);
        setReason("");
        flash(t.admin.bookings.updated);
        list.reload();
      } catch (error) {
        setConfirmCancel(false);
        setActionError(errorMessage(error, t));
      }
    });
  };

  const actionLabel: Record<Action, string> = {
    confirmed: t.admin.bookings.confirm,
    cancelled: t.admin.bookings.cancel,
    completed: t.admin.bookings.complete,
  };

  return (
    <>
      <AdminHeader title={t.admin.nav.bookings} />
      {flashNode}

      <form className="admin-filters" onSubmit={applyFilters} aria-label={t.admin.bookings.filters}>
        <SelectField label={t.admin.table.status} value={draft.status} onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}>
          <option value="">{t.admin.bookings.allStatuses}</option>
          {BOOKING_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t.booking.statuses[s]}
            </option>
          ))}
        </SelectField>
        <TextField label={t.admin.bookings.referenceFilter} value={draft.reference} onChange={(e) => setDraft((d) => ({ ...d, reference: e.target.value.toUpperCase() }))} maxLength={20} />
        <TextField label={t.admin.bookings.emailFilter} type="email" value={draft.email} onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))} />
        <TextField label={t.admin.bookings.fromFilter} type="date" value={draft.checkInFrom} onChange={(e) => setDraft((d) => ({ ...d, checkInFrom: e.target.value }))} />
        <TextField label={t.admin.bookings.toFilter} type="date" value={draft.checkInTo} onChange={(e) => setDraft((d) => ({ ...d, checkInTo: e.target.value }))} />
        <div className="admin-filters__actions">
          <button type="submit" className="admin-button admin-button--primary">
            {t.admin.bookings.apply}
          </button>
          <button
            type="button"
            className="admin-button admin-button--quiet"
            onClick={() => {
              const empty = { status: "", reference: "", email: "", checkInFrom: "", checkInTo: "" };
              setDraft(empty);
              setFilters(empty);
              setPage(1);
            }}
          >
            {t.admin.bookings.reset}
          </button>
        </div>
      </form>

      {list.loading && <Loading />}
      {list.error !== undefined && <LoadError error={list.error} onRetry={list.reload} />}
      {list.data && list.data.items.length === 0 && <p className="admin-empty">{t.admin.bookings.empty}</p>}
      {list.data && list.data.items.length > 0 && (
        <section className="admin-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">{t.admin.table.reference}</th>
                <th scope="col">{t.admin.table.guest}</th>
                <th scope="col">{t.admin.table.room}</th>
                <th scope="col">{t.admin.table.dates}</th>
                <th scope="col">{t.admin.table.total}</th>
                <th scope="col">{t.admin.table.status}</th>
                <th scope="col">
                  <span className="visually-hidden">{t.admin.table.actions}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {list.data.items.map((b) => (
                <tr key={b.id}>
                  <td data-label={t.admin.table.reference} className="mono">
                    {b.reference}
                  </td>
                  <td data-label={t.admin.table.guest}>
                    {b.guest.firstName} {b.guest.lastName}
                    <span className="admin-table__sub">{b.guest.email}</span>
                  </td>
                  <td data-label={t.admin.table.room}>{b.roomName}</td>
                  <td data-label={t.admin.table.dates}>{formatRange(b.checkIn, b.checkOut, lang)}</td>
                  <td data-label={t.admin.table.total}>{formatMoney(b.pricing.total, b.pricing.currency, lang)}</td>
                  <td data-label={t.admin.table.status}>
                    <StatusBadge status={b.status} label={t.booking.statuses[b.status]} />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="admin-button admin-button--small"
                      onClick={() => {
                        setSelected(b);
                        setActionError(null);
                        setReason("");
                      }}
                    >
                      {t.admin.bookings.details}
                      <span className="visually-hidden"> {b.reference}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="pager">
            <button type="button" className="admin-button admin-button--quiet" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              {t.admin.bookings.previous}
            </button>
            <p>{t.admin.bookings.page(list.data.meta.page, list.data.meta.totalPages, list.data.meta.total)}</p>
            <button type="button" className="admin-button admin-button--quiet" disabled={page >= list.data.meta.totalPages} onClick={() => setPage((p) => p + 1)}>
              {t.admin.bookings.next}
            </button>
          </div>
        </section>
      )}

      <Modal title={selected ? `${t.admin.bookings.details} ${selected.reference}` : ""} open={selected !== null && !confirmCancel} onClose={() => setSelected(null)}>
        {selected && (
          <div className="booking-detail">
            {actionError && <Notice tone="error">{actionError}</Notice>}
            <p>
              <StatusBadge status={selected.status} label={t.booking.statuses[selected.status]} />
            </p>
            <dl className="admin-dl">
              <dt>{t.admin.bookings.guest}</dt>
              <dd>
                {selected.guest.firstName} {selected.guest.lastName}
                <br />
                <a href={`mailto:${selected.guest.email}`}>{selected.guest.email}</a>
                <br />
                <a href={`tel:${selected.guest.phone.replace(/[^\d+]/g, "")}`}>{selected.guest.phone}</a>
              </dd>
              <dt>{t.admin.bookings.stay}</dt>
              <dd>
                {selected.roomName}
                <br />
                {formatRange(selected.checkIn, selected.checkOut, lang)}, {t.common.nights(selected.nights)}
                <br />
                {t.common.adults(selected.adults)}
                {selected.children > 0 && `, ${t.common.children(selected.children)}`}
              </dd>
              {selected.specialRequests && (
                <>
                  <dt>{t.admin.bookings.requests}</dt>
                  <dd className="pre">{selected.specialRequests}</dd>
                </>
              )}
              <dt>{t.admin.bookings.pricing}</dt>
              <dd>
                {formatMoney(selected.pricing.nightlyRate, selected.pricing.currency, lang)} × {selected.pricing.nights}
                <br />
                {t.booking.total}: <strong>{formatMoney(selected.pricing.total, selected.pricing.currency, lang)}</strong>
              </dd>
              {selected.cancellationReason && (
                <>
                  <dt>{t.admin.bookings.reason}</dt>
                  <dd>{selected.cancellationReason}</dd>
                </>
              )}
              <dt>{t.admin.table.created}</dt>
              <dd>{formatDateTime(selected.createdAt, lang)}</dd>
            </dl>
            <div className="booking-detail__actions">
              {NEXT_STATUSES[selected.status].length === 0 && <p className="admin-empty">{t.admin.bookings.noActions}</p>}
              {NEXT_STATUSES[selected.status].map((status) => (
                <button
                  key={status}
                  type="button"
                  className={`admin-button ${status === "cancelled" ? "admin-button--danger-quiet" : "admin-button--primary"}`}
                  disabled={pending}
                  onClick={() => (status === "cancelled" ? setConfirmCancel(true) : void changeStatus(selected, status))}
                >
                  {actionLabel[status]}
                </button>
              ))}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={selected !== null && confirmCancel}
        message={t.admin.bookings.confirmCancel}
        confirmLabel={t.admin.bookings.cancel}
        pending={pending}
        onCancel={() => setConfirmCancel(false)}
        onConfirm={() => selected && void changeStatus(selected, "cancelled")}
      >
        <TextArea label={t.admin.bookings.reason} hint={t.admin.bookings.reasonHint} optional rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
      </ConfirmDialog>
    </>
  );
}
