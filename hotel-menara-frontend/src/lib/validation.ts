/**
 * Client-side validation mirroring the backend Zod schemas (hotel-menara-backend/src/validation/*.js),
 * so that guests see clear messages before anything is sent. The backend still validates everything.
 */
import type { Dictionary } from "../i18n";
import { nightsBetween, parseISODate } from "./dates";

export type Errors = Record<string, string>;

// Same pattern as Zod's `.email()` used by the backend.
const EMAIL = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9-]*\.)+[A-Z]{2,}$/i;
// Same pattern as `phoneField` in src/validation/common.js.
const PHONE = /^\+?[0-9\s().-]{6,20}$/;
const REFERENCE = /^MEN-[A-Z0-9]{8}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export const isEmail = (value: string): boolean => value.trim().length <= 254 && EMAIL.test(value.trim());
export const isPhone = (value: string): boolean => PHONE.test(value.trim());
export const isHttpUrl = (value: string): boolean => {
  if (!/^https?:\/\//i.test(value) || value.length > 500) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

function text(errors: Errors, field: string, value: string, t: Dictionary, min: number, max: number, required = true) {
  const v = value.trim();
  if (!v) {
    if (required) errors[field] = t.validation.required;
    return;
  }
  if (v.length < min) errors[field] = t.validation.minLength(min);
  else if (v.length > max) errors[field] = t.validation.maxLength(max);
}

function integer(errors: Errors, field: string, value: string | number, t: Dictionary, min: number, max: number) {
  const raw = String(value).trim();
  if (raw === "") {
    errors[field] = t.validation.required;
    return;
  }
  const n = Number(raw);
  if (!Number.isInteger(n)) errors[field] = t.validation.integer;
  else if (n < min || n > max) errors[field] = t.validation.range(min, max);
}

function decimal(errors: Errors, field: string, value: string | number, t: Dictionary, min: number, max: number) {
  const raw = String(value).trim().replace(",", ".");
  if (raw === "") {
    errors[field] = t.validation.required;
    return;
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) errors[field] = t.validation.number;
  else if (n < min || n > max) errors[field] = t.validation.range(min, max);
}

// ---- Booking ---------------------------------------------------------------

export interface SearchInput {
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
}

export function validateSearch(input: SearchInput, t: Dictionary, options: { today: string; maxStayNights: number }): Errors {
  const errors: Errors = {};
  const checkIn = parseISODate(input.checkIn);
  const checkOut = parseISODate(input.checkOut);
  if (!input.checkIn) errors.checkIn = t.validation.required;
  else if (!checkIn) errors.checkIn = t.validation.date;
  else if (input.checkIn < options.today) errors.checkIn = t.validation.pastDate;

  if (!input.checkOut) errors.checkOut = t.validation.required;
  else if (!checkOut) errors.checkOut = t.validation.date;
  else if (checkIn && nightsBetween(input.checkIn, input.checkOut) < 1) errors.checkOut = t.validation.checkOutAfter;
  else if (checkIn && nightsBetween(input.checkIn, input.checkOut) > options.maxStayNights) errors.checkOut = t.validation.maxStay(options.maxStayNights);

  if (!Number.isInteger(input.adults) || input.adults < 1 || input.adults > 10) errors.adults = t.validation.adults;
  if (!Number.isInteger(input.children) || input.children < 0 || input.children > 10) errors.children = t.validation.children;
  return errors;
}

export interface GuestInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialRequests: string;
}

export function validateGuest(input: GuestInput, t: Dictionary): Errors {
  const errors: Errors = {};
  text(errors, "firstName", input.firstName, t, 1, 80);
  text(errors, "lastName", input.lastName, t, 1, 80);
  if (!input.email.trim()) errors.email = t.validation.required;
  else if (!isEmail(input.email)) errors.email = t.validation.email;
  if (!input.phone.trim()) errors.phone = t.validation.required;
  else if (!isPhone(input.phone)) errors.phone = t.validation.phone;
  text(errors, "specialRequests", input.specialRequests, t, 0, 1000, false);
  return errors;
}

export function validateLookup(input: { reference: string; email: string }, t: Dictionary): Errors {
  const errors: Errors = {};
  const reference = input.reference.trim().toUpperCase();
  if (!reference) errors.reference = t.validation.required;
  else if (!REFERENCE.test(reference)) errors.reference = t.validation.reference;
  if (!input.email.trim()) errors.email = t.validation.required;
  else if (!isEmail(input.email)) errors.email = t.validation.email;
  return errors;
}

// ---- Contact ---------------------------------------------------------------

export interface ContactInput {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

export function validateContact(input: ContactInput, t: Dictionary): Errors {
  const errors: Errors = {};
  text(errors, "name", input.name, t, 2, 100);
  if (!input.email.trim()) errors.email = t.validation.required;
  else if (!isEmail(input.email)) errors.email = t.validation.email;
  if (input.phone.trim() && !isPhone(input.phone)) errors.phone = t.validation.phone;
  text(errors, "subject", input.subject, t, 3, 150);
  text(errors, "message", input.message, t, 10, 2000);
  return errors;
}

// ---- Administration --------------------------------------------------------

export function validateLogin(input: { email: string; password: string }, t: Dictionary): Errors {
  const errors: Errors = {};
  if (!input.email.trim()) errors.email = t.validation.required;
  else if (!isEmail(input.email)) errors.email = t.validation.email;
  if (!input.password) errors.password = t.validation.required;
  return errors;
}

/** Same rules as `strongPassword` in the backend. */
export const isStrongPassword = (value: string): boolean =>
  value.length >= 12 && value.length <= 72 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /[0-9]/.test(value);

export function validatePasswordChange(input: { current: string; next: string; confirm: string }, t: Dictionary): Errors {
  const errors: Errors = {};
  if (!input.current) errors.current = t.validation.required;
  if (!input.next) errors.next = t.validation.required;
  else if (!isStrongPassword(input.next)) errors.next = t.validation.passwordRules;
  else if (input.next === input.current) errors.next = t.validation.passwordSame;
  if (input.confirm !== input.next) errors.confirm = t.validation.passwordMatch;
  return errors;
}

export interface RoomFormInput {
  name: string;
  slug: string;
  description: string;
  capacity: string;
  totalUnits: string;
  pricePerNight: string;
  amenities: string;
  images: string;
}

export const splitLines = (value: string): string[] =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

export function validateRoom(input: RoomFormInput, t: Dictionary): Errors {
  const errors: Errors = {};
  text(errors, "name", input.name, t, 2, 100);
  if (input.slug.trim() && (!SLUG.test(input.slug.trim().toLowerCase()) || input.slug.trim().length > 120)) errors.slug = t.validation.slug;
  text(errors, "description", input.description, t, 10, 2000);
  integer(errors, "capacity", input.capacity, t, 1, 10);
  integer(errors, "totalUnits", input.totalUnits, t, 1, 500);
  decimal(errors, "pricePerNight", input.pricePerNight, t, 0, 1_000_000);
  const price = toNumber(input.pricePerNight);
  if (!errors.pricePerNight && Math.round(price * 1000) / 1000 !== price) errors.pricePerNight = t.validation.number;
  const amenities = splitLines(input.amenities);
  if (amenities.length > 30) errors.amenities = t.validation.range(0, 30);
  else if (amenities.some((a) => a.length > 60)) errors.amenities = t.validation.maxLength(60);
  const images = splitLines(input.images);
  if (images.length > 20) errors.images = t.validation.range(0, 20);
  else if (images.some((url) => !isHttpUrl(url))) errors.images = t.validation.url;
  return errors;
}

export function validateService(input: { name: string; description: string; icon: string; order: string }, t: Dictionary): Errors {
  const errors: Errors = {};
  text(errors, "name", input.name, t, 2, 100);
  text(errors, "description", input.description, t, 5, 1000);
  text(errors, "icon", input.icon, t, 1, 40, false);
  integer(errors, "order", input.order, t, 0, 10000);
  return errors;
}

export function validateGalleryItem(input: { title: string; caption: string; imageUrl: string; order: string }, t: Dictionary): Errors {
  const errors: Errors = {};
  text(errors, "title", input.title, t, 2, 120);
  text(errors, "caption", input.caption, t, 0, 300, false);
  if (!input.imageUrl.trim()) errors.imageUrl = t.validation.required;
  else if (!isHttpUrl(input.imageUrl.trim())) errors.imageUrl = t.validation.url;
  integer(errors, "order", input.order, t, 0, 10000);
  return errors;
}

export interface SettingsFormInput {
  hotelName: string;
  tagline: string;
  description: string;
  street: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  facebook: string;
  instagram: string;
  checkInTime: string;
  checkOutTime: string;
  currency: string;
  taxRatePercent: string;
  touristTaxPerAdultPerNight: string;
  maxStayNights: string;
  cancellationPolicy: string;
}

export function validateSettings(input: SettingsFormInput, t: Dictionary): Errors {
  const errors: Errors = {};
  text(errors, "hotelName", input.hotelName, t, 2, 120);
  text(errors, "tagline", input.tagline, t, 0, 200, false);
  text(errors, "description", input.description, t, 0, 3000, false);
  text(errors, "street", input.street, t, 0, 200, false);
  text(errors, "city", input.city, t, 0, 100, false);
  text(errors, "country", input.country, t, 0, 100, false);
  text(errors, "phone", input.phone, t, 0, 30, false);
  if (!input.email.trim()) errors.email = t.validation.required;
  else if (!isEmail(input.email)) errors.email = t.validation.email;
  if (input.facebook.trim() && !isHttpUrl(input.facebook.trim())) errors.facebook = t.validation.url;
  if (input.instagram.trim() && !isHttpUrl(input.instagram.trim())) errors.instagram = t.validation.url;
  if (!TIME.test(input.checkInTime)) errors.checkInTime = t.validation.time;
  if (!TIME.test(input.checkOutTime)) errors.checkOutTime = t.validation.time;
  if (!/^[A-Z]{3}$/.test(input.currency.trim())) errors.currency = t.validation.currency;
  decimal(errors, "taxRatePercent", input.taxRatePercent, t, 0, 100);
  decimal(errors, "touristTaxPerAdultPerNight", input.touristTaxPerAdultPerNight, t, 0, 1000);
  integer(errors, "maxStayNights", input.maxStayNights, t, 1, 90);
  text(errors, "cancellationPolicy", input.cancellationPolicy, t, 0, 3000, false);
  return errors;
}

export const toNumber = (value: string): number => Number(value.trim().replace(",", "."));
