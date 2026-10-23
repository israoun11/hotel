import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useI18n } from "../i18n/LanguageContext";
import { Link } from "../router/Router";

export function NotFoundPage() {
  const { t } = useI18n();
  useDocumentTitle(t.notFound.title);
  return (
    <section className="not-found">
      <h1 className="display-1">{t.notFound.title}</h1>
      <p className="lead">{t.notFound.text}</p>
      <Link to="/" className="button button--primary">
        {t.notFound.home}
      </Link>
    </section>
  );
}
