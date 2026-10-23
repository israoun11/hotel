import { useState, type FormEvent } from "react";
import { api } from "../api";
import { sessionStore } from "../auth/session";
import { LoadError, Loading, Notice } from "../components/Feedback";
import { TextField } from "../components/Fields";
import { useApi } from "../hooks/useApi";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useSubmit } from "../hooks/useSubmit";
import { useI18n } from "../i18n/LanguageContext";
import { errorMessage } from "../lib/errors";
import { formatDateTime } from "../lib/format";
import { validatePasswordChange, type Errors } from "../lib/validation";
import { useRouter } from "../router/Router";
import { AdminHeader } from "./ui";

export function AccountPage() {
  const { t, lang } = useI18n();
  const { navigate } = useRouter();
  const me = useApi("admin:me", api.me, { cacheable: false });
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const { pending, run } = useSubmit();
  useDocumentTitle(t.admin.nav.account);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found = validatePasswordChange(form, t);
    setErrors(found);
    setFailure(null);
    if (Object.keys(found).length > 0) return;
    await run(async () => {
      try {
        await api.changePassword(form.current, form.next);
        // The backend invalidates every token after a password change: sign in again.
        sessionStore.clear("logout");
        navigate("/admin?changed=1", { replace: true });
      } catch (error) {
        // A wrong current password answers 401 INVALID_CREDENTIALS on an authenticated call;
        // the session itself may still be valid, so show the message instead of signing out.
        setFailure(errorMessage(error, t));
      }
    });
  };

  return (
    <>
      <AdminHeader title={t.admin.nav.account} />
      <section className="admin-card">
        <h2>{t.admin.account.profile}</h2>
        {me.loading && <Loading />}
        {me.error !== undefined && <LoadError error={me.error} onRetry={me.reload} />}
        {me.data && (
          <dl className="admin-dl">
            <dt>{t.admin.rooms.name}</dt>
            <dd>{me.data.name}</dd>
            <dt>{t.admin.email}</dt>
            <dd>{me.data.email}</dd>
            {me.data.lastLoginAt && (
              <>
                <dt>{t.admin.account.lastLogin}</dt>
                <dd>{formatDateTime(me.data.lastLoginAt, lang)}</dd>
              </>
            )}
          </dl>
        )}
      </section>
      <section className="admin-card">
        <h2>{t.admin.account.title}</h2>
        <form className="form form--narrow" onSubmit={submit} noValidate>
          {failure && <Notice tone="error">{failure}</Notice>}
          <TextField label={t.admin.account.current} type="password" autoComplete="current-password" value={form.current} onChange={(e) => setForm((f) => ({ ...f, current: e.target.value }))} error={errors.current} required />
          <TextField label={t.admin.account.next} type="password" autoComplete="new-password" hint={t.validation.passwordRules} value={form.next} onChange={(e) => setForm((f) => ({ ...f, next: e.target.value }))} error={errors.next} required maxLength={72} />
          <TextField label={t.admin.account.confirm} type="password" autoComplete="new-password" value={form.confirm} onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))} error={errors.confirm} required maxLength={72} />
          <button type="submit" className="admin-button admin-button--primary" disabled={pending} aria-busy={pending}>
            {t.admin.account.submit}
          </button>
        </form>
      </section>
    </>
  );
}
