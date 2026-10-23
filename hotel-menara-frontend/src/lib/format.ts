import type { Lang } from "../i18n";
import { parseISODate, toISODay } from "./dates";

const locale = (lang: Lang) => (lang === "fr" ? "fr-FR" : "en-GB");

export function formatMoney(amount: number, currency: string, lang: Lang): string {
  try {
    return new Intl.NumberFormat(locale(lang), { style: "currency", currency, maximumFractionDigits: 3 }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

/** "12 nov. 2026" style date for a YYYY-MM-DD value (or an ISO timestamp). */
export function formatDay(value: string, lang: Lang, withWeekday = false): string {
  const date = parseISODate(toISODay(value));
  if (!date) return value;
  return new Intl.DateTimeFormat(locale(lang), {
    timeZone: "UTC",
    weekday: withWeekday ? "short" : undefined,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatRange(checkIn: string, checkOut: string, lang: Lang): string {
  return `${formatDay(checkIn, lang)} – ${formatDay(checkOut, lang)}`;
}

export function formatDateTime(value: string, lang: Lang): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale(lang), { dateStyle: "medium", timeStyle: "short" }).format(date);
}
