import { useEffect } from "react";
import { useI18n } from "../i18n/LanguageContext";

export function useDocumentTitle(title?: string): void {
  const { t } = useI18n();
  useEffect(() => {
    document.title = title ? `${title} | ${t.meta.siteTitle}` : `${t.meta.siteTitle} | ${t.home.heroLine}`;
  }, [title, t]);
}
