import { en } from "./en";
import { fr } from "./fr";
import type { Dictionary, Lang } from "./types";

export const dictionaries: Record<Lang, Dictionary> = { fr, en };
export const LANG_STORAGE_KEY = "menara.lang";

/** Stored choice first, then the browser languages, French by default (the hotel's main language). */
export function resolveInitialLang(stored: string | null, browserLanguages: readonly string[] = []): Lang {
  if (stored === "fr" || stored === "en") return stored;
  for (const language of browserLanguages) {
    const base = language.toLowerCase().slice(0, 2);
    if (base === "fr") return "fr";
    if (base === "en") return "en";
  }
  return "fr";
}

export type { Dictionary, Lang } from "./types";
