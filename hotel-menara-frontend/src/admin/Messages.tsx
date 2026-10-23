import { useState } from "react";
import { api } from "../api";
import { MESSAGE_STATUSES, type ContactMessage, type MessageStatus } from "../api/types";
import { LoadError, Loading, Notice } from "../components/Feedback";
import { useApi } from "../hooks/useApi";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useSubmit } from "../hooks/useSubmit";
import { useI18n } from "../i18n/LanguageContext";
import { errorMessage } from "../lib/errors";
import { formatDateTime } from "../lib/format";
import { useRouter } from "../router/Router";
import { AdminHeader, ConfirmDialog, StatusBadge, useFlash } from "./ui";

export function MessagesPage() {
  const { t, lang } = useI18n();
  const { search } = useRouter();
  const initial = search.get("status");
  const [status, setStatus] = useState<MessageStatus | "">(MESSAGE_STATUSES.includes(initial as MessageStatus) ? (initial as MessageStatus) : "");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ContactMessage | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const { pending, run } = useSubmit();
  const { flash, node: flashNode } = useFlash();
  useDocumentTitle(t.admin.nav.messages);

  const query = { status: status || undefined, page, limit: 20 };
  const list = useApi(`admin:messages:${JSON.stringify(query)}`, () => api.admin.messages(query), { cacheable: false });

  const update = async (message: ContactMessage, next: MessageStatus) => {
    setFailure(null);
    await run(async () => {
      try {
        await api.admin.updateMessage(message.id, next);
        flash(t.admin.messages.updated);
        list.reload();
      } catch (error) {
        setFailure(errorMessage(error, t));
      }
    });
  };

  const remove = async () => {
    if (!deleting) return;
    await run(async () => {
      try {
        await api.admin.deleteMessage(deleting.id);
        setDeleting(null);
        flash(t.admin.messages.deleted);
        list.reload();
      } catch (error) {
        setDeleting(null);
        setFailure(errorMessage(error, t));
      }
    });
  };

  const toggle = (message: ContactMessage) => {
    const opening = openId !== message.id;
    setOpenId(opening ? message.id : null);
    // Opening a new message marks it as read, like an inbox.
    if (opening && message.status === "new") void update(message, "read");
  };

  return (
    <>
      <AdminHeader title={t.admin.nav.messages} />
      {flashNode}
      <div className="filter-bar filter-bar--admin" role="group" aria-label={t.admin.table.status}>
        {(["", ...MESSAGE_STATUSES] as const).map((s) => (
          <button
            key={s || "all"}
            type="button"
            className="filter-bar__item"
            aria-pressed={status === s}
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
          >
            {s ? t.admin.messages.statuses[s] : t.admin.messages.allStatuses}
          </button>
        ))}
      </div>
      {failure && <Notice tone="error">{failure}</Notice>}
      {list.loading && <Loading />}
      {list.error !== undefined && <LoadError error={list.error} onRetry={list.reload} />}
      {list.data && list.data.items.length === 0 && <p className="admin-empty">{t.admin.messages.empty}</p>}
      {list.data && list.data.items.length > 0 && (
        <section className="admin-card">
          <ul className="inbox">
            {list.data.items.map((m) => (
              <li key={m.id} className={`inbox__item ${m.status === "new" ? "inbox__item--new" : ""}`}>
                <button type="button" className="inbox__summary" aria-expanded={openId === m.id} onClick={() => toggle(m)}>
                  <span className="inbox__from">{m.name}</span>
                  <span className="inbox__subject">{m.subject}</span>
                  <span className="inbox__date">{formatDateTime(m.createdAt, lang)}</span>
                  <StatusBadge status={m.status} label={t.admin.messages.statuses[m.status]} />
                </button>
                {openId === m.id && (
                  <div className="inbox__body">
                    <p className="inbox__contact">
                      <a href={`mailto:${m.email}`}>{m.email}</a>
                      {m.phone && <a href={`tel:${m.phone.replace(/[^\d+]/g, "")}`}>{m.phone}</a>}
                    </p>
                    <p className="pre">{m.message}</p>
                    <div className="inbox__actions">
                      <a className="admin-button admin-button--primary admin-button--small" href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`}>
                        {t.admin.messages.reply}
                      </a>
                      {m.status !== "archived" && (
                        <button type="button" className="admin-button admin-button--small" disabled={pending} onClick={() => void update(m, "archived")}>
                          {t.admin.messages.archive}
                        </button>
                      )}
                      {m.status !== "new" && (
                        <button type="button" className="admin-button admin-button--small admin-button--quiet" disabled={pending} onClick={() => void update(m, "new")}>
                          {t.admin.messages.markNew}
                        </button>
                      )}
                      <button type="button" className="admin-button admin-button--small admin-button--danger-quiet" disabled={pending} onClick={() => setDeleting(m)}>
                        {t.admin.messages.delete}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <div className="pager">
            <button type="button" className="admin-button admin-button--quiet" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              {t.admin.bookings.previous}
            </button>
            <p>
              {list.data.meta.page} / {list.data.meta.totalPages}
            </p>
            <button type="button" className="admin-button admin-button--quiet" disabled={page >= list.data.meta.totalPages} onClick={() => setPage((p) => p + 1)}>
              {t.admin.bookings.next}
            </button>
          </div>
        </section>
      )}
      <ConfirmDialog
        open={deleting !== null}
        message={t.admin.messages.confirmDelete}
        confirmLabel={pending ? t.admin.form.deleting : t.admin.form.delete}
        pending={pending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void remove()}
      />
    </>
  );
}
