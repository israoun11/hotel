import type { ReactNode } from "react";
import { useI18n } from "../i18n/LanguageContext";
import { Footer } from "./Footer";
import { Header } from "./Header";

export function SiteLayout({ children, overlayHeader = false }: { children: ReactNode; overlayHeader?: boolean }) {
  const { t } = useI18n();
  return (
    <>
      <a href="#main" className="skip-link">
        {t.common.skipToContent}
      </a>
      <Header overlay={overlayHeader} />
      <main id="main" tabIndex={-1} className={overlayHeader ? "main main--overlay" : "main"}>
        {children}
      </main>
      <Footer />
    </>
  );
}
