import { useState, type ReactNode } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { useI18n } from "../i18n/LanguageContext";

export function AdminHeader({ title, actions }: { title: string; actions?: ReactNode }) {
  return (
    <div className="admin-header">
      <h1 className="admin-header__title">{title}</h1>
      {actions && <div className="admin-header__actions">{actions}</div>}
    </div>
  );
}

/** Side panel holding an edit form. Escape or the close button dismisses it. */
export function Modal({ title, open, onClose, children, wide = false }: { title: string; open: boolean; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const { t } = useI18n();
  const ref = useFocusTrap<HTMLDivElement>(open, onClose);
  if (!open) return null;
  return (
    <div className="modal" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} className={`modal__panel ${wide ? "modal__panel--wide" : ""}`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal__head">
          <h2 id="modal-title">{title}</h2>
          <button type="button" className="admin-button admin-button--quiet" onClick={onClose}>
            {t.common.close}
          </button>
        </div>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  );
}

/** Confirmation step for destructive actions, with the action's pending state. */
export function ConfirmDialog({
  open,
  message,
  confirmLabel,
  pending,
  onConfirm,
  onCancel,
  children,
}: {
  open: boolean;
  message: string;
  confirmLabel: string;
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}) {
  const { t } = useI18n();
  const ref = useFocusTrap<HTMLDivElement>(open, onCancel);
  if (!open) return null;
  return (
    <div className="modal modal--center">
      <div ref={ref} className="modal__panel modal__panel--small" role="alertdialog" aria-modal="true" aria-labelledby="confirm-text">
        <p id="confirm-text" className="confirm__text">
          {message}
        </p>
        {children}
        <div className="confirm__actions">
          <button type="button" className="admin-button admin-button--quiet" onClick={onCancel} data-autofocus disabled={pending}>
            {t.common.cancel}
          </button>
          <button type="button" className="admin-button admin-button--danger" onClick={onConfirm} disabled={pending} aria-busy={pending}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Transient success message announced to screen readers. */
export function useFlash() {
  const [message, setMessage] = useState<string | null>(null);
  const flash = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage((current) => (current === text ? null : current)), 4000);
  };
  const node = (
    <p className={`flash ${message ? "is-visible" : ""}`} role="status" aria-live="polite">
      {message}
    </p>
  );
  return { flash, node };
}

export function StatusBadge({ status, label }: { status: string; label: string }) {
  return <span className={`status status--${status}`}>{label}</span>;
}

export function DemoBadge() {
  const { t } = useI18n();
  return (
    <span className="tag" title={t.admin.form.demo}>
      {t.common.demoTag}
    </span>
  );
}
