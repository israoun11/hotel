const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

/** The backend decides what "today" is in the hotel's timezone (HOTEL_TIMEZONE, default Africa/Tunis). */
export const HOTEL_TIMEZONE = "Africa/Tunis";

/** Parses "YYYY-MM-DD" as a UTC date, like the backend (src/utils/dates.js). Returns null for invalid dates. */
export function parseISODate(value: string): Date | null {
  if (!ISO_DATE.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10) === value ? date : null;
}

export function todayISO(now: Date = new Date(), timeZone = HOTEL_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function addDays(iso: string, days: number): string {
  const date = parseISODate(iso);
  if (!date) return iso;
  return new Date(date.getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  const a = parseISODate(checkIn);
  const b = parseISODate(checkOut);
  if (!a || !b) return 0;
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

/** Booking dates come back from the API as full ISO timestamps at UTC midnight. */
export const toISODay = (value: string): string => value.slice(0, 10);
