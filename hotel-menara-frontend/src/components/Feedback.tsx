import type { ReactNode } from "react";
import { useI18n } from "../i18n/LanguageContext";
import { errorMessage } from "../lib/errors";

export function Notice({ tone = "info", children, title }: { tone?: "info" | "success" | "error" | "warning"; children: ReactNode; title?: string }) {
  return (
    <div className={`notice notice--${tone}`} role={tone === "error" ? "alert" : "status"}>
      {title && <p className="notice__title">{title}</p>}
      <div className="notice__body">{children}</div>
    </div>
  );
}

export function Loading({ label }: { label?: string }) {
  const { t } = useI18n();
  return (
    <div className="loading" role="status">
      <span className="loading__line" aria-hidden="true" />
      <span className="loading__label">{label ?? t.common.loading}</span>
    </div>
  );
}

/** Explains a failed request and offers to retry it. */
export function LoadError({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useI18n();
  return (
    <Notice tone="error" title={t.errors.loadFailed}>
      <p>{errorMessage(error, t)}</p>
      {onRetry && (
        <button type="button" className="button button--ghost button--small" onClick={onRetry}>
          {t.common.retry}
        </button>
      )}
    </Notice>
  );
}
