import { useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import { sessionStore } from "../auth/session";
import { Notice } from "../components/Feedback";
import { TextField } from "../components/Fields";
import { LanguageSwitch } from "../components/Header";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useSubmit } from "../hooks/useSubmit";
import { useI18n } from "../i18n/LanguageContext";
import { errorMessage } from "../lib/errors";
import { safeAdminReturn } from "../lib/navigation";
import { validateLogin, type Errors } from "../lib/validation";
import { Link, useRouter } from "../router/Router";

export function AdminLoginPage() {
  const { t } = useI18n();
  const { login } = useAuth();
  const { navigate, search } = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const { pending, run } = useSubmit();
  useDocumentTitle(t.admin.loginTitle);

  const reason = sessionStore.lastEndReason();
  const next = search.get("next");
  const target = safeAdminReturn(next);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found = validateLogin({ email, password }, t);
    setErrors(found);
    setFailure(null);
    if (Object.keys(found).length > 0) return;
    await run(async () => {
      try {
        await login(email.trim(), password);
        setPassword("");
        navigate(target, { replace: true });
      } catch (error) {
        setFailure(errorMessage(error, t));
      }
    });
  };

  return (
    <main className="admin-login" id="main">
      <div className="admin-login__panel">
        <Link to="/" className="admin-login__brand" aria-label={t.admin.backToSite}>
          <img src="/brand/logo-dark.png" alt="" width="110" height="70" />
        </Link>
        <h1 className="admin-login__title">{t.admin.loginTitle}</h1>
        <p className="admin-login__lead">{t.admin.loginLead}</p>
        {reason === "expired" && !failure && <Notice tone="warning">{t.admin.expired}</Notice>}
        {reason === "logout" && !failure && search.get("changed") !== "1" && <Notice>{t.admin.signedOut}</Notice>}
        {search.get("changed") === "1" && !failure && <Notice tone="success">{t.admin.account.done}</Notice>}
        {failure && <Notice tone="error">{failure}</Notice>}
        <form className="form" onSubmit={submit} noValidate>
          <TextField label={t.admin.email} type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} required />
          <div className="password-field">
            <TextField
              label={t.admin.password}
              type={show ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              required
            />
            <button type="button" className="password-field__toggle" onClick={() => setShow((v) => !v)} aria-pressed={show}>
              {show ? t.admin.hidePassword : t.admin.showPassword}
            </button>
          </div>
          <button type="submit" className="admin-button admin-button--primary admin-button--block" disabled={pending} aria-busy={pending}>
            {pending ? t.admin.signingIn : t.admin.signIn}
          </button>
        </form>
        <div className="admin-login__foot">
          <Link to="/">{t.admin.backToSite}</Link>
          <LanguageSwitch />
        </div>
      </div>
    </main>
  );
}
