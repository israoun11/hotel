import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { dictionaries, LANG_STORAGE_KEY, resolveInitialLang, type Dictionary, type Lang } from "./index";

interface LanguageValue {
  lang: Lang;
  t: Dictionary;
  setLang: (lang: Lang) => void;
}

const LanguageContext = createContext<LanguageValue | null>(null);

function readStoredLang(): string | null {
  try {
    return window.localStorage.getItem(LANG_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => resolveInitialLang(readStoredLang(), navigator.languages ?? [navigator.language]));

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      // The choice simply is not remembered (private mode).
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.querySelector('meta[name="description"]')?.setAttribute("content", dictionaries[lang].meta.description);
  }, [lang]);

  const value = useMemo(() => ({ lang, t: dictionaries[lang], setLang }), [lang, setLang]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n(): LanguageValue {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useI18n must be used inside <LanguageProvider>");
  return value;
}
