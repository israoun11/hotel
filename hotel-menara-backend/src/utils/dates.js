const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Parses "YYYY-MM-DD" into a UTC-midnight Date. Returns null for invalid calendar dates. */
function parseISODate(value) {
  if (!ISO_DATE.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10) === value ? date : null;
}

function toISODate(date) {
  return date.toISOString().slice(0, 10);
}

/** "Today" in the hotel's timezone, as a UTC-midnight Date. */
function todayInTimezone(timeZone, now = new Date()) {
  const formatted = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const parsed = parseISODate(formatted);
  if (!parsed) throw new Error(`Could not compute today's date for timezone ${timeZone}`);
  return parsed;
}

function nightsBetween(checkIn, checkOut) {
  return Math.round((checkOut.getTime() - checkIn.getTime()) / DAY_MS);
}

/** The list of nights (dates) a stay occupies: check-in included, check-out excluded. */
function listNights(checkIn, nights) {
  return Array.from({ length: nights }, (_, index) => new Date(checkIn.getTime() + index * DAY_MS));
}

module.exports = {
  parseISODate,
  toISODate,
  todayInTimezone,
  nightsBetween,
  listNights,
};
