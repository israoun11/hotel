import type { HotelSettings, SettingsUpdate } from "../api/types";
import { toNumber, type SettingsFormInput } from "./validation";

export type SettingsForm = SettingsFormInput & { isBookingEnabled: boolean };

export const toSettingsForm = (s: HotelSettings): SettingsForm => ({
  hotelName: s.hotelName ?? "",
  tagline: s.tagline ?? "",
  description: s.description ?? "",
  street: s.address?.street ?? "",
  city: s.address?.city ?? "",
  country: s.address?.country ?? "",
  phone: s.contact?.phone ?? "",
  email: s.contact?.email ?? "",
  facebook: s.socialLinks?.facebook ?? "",
  instagram: s.socialLinks?.instagram ?? "",
  checkInTime: s.checkInTime ?? "14:00",
  checkOutTime: s.checkOutTime ?? "12:00",
  currency: s.currency ?? "TND",
  taxRatePercent: String(s.taxRatePercent ?? 0),
  touristTaxPerAdultPerNight: String(s.touristTaxPerAdultPerNight ?? 0),
  maxStayNights: String(s.maxStayNights ?? 30),
  cancellationPolicy: s.cancellationPolicy ?? "",
  isBookingEnabled: s.isBookingEnabled ?? true,
});

/**
 * Body for PUT /settings containing only what changed. The schema is strict and rejects empty social links,
 * so an unchanged or emptied link is left out.
 */
export function settingsDiff(before: SettingsForm, after: SettingsForm): SettingsUpdate {
  const body: SettingsUpdate = {};
  const changed = (key: keyof SettingsForm) => before[key] !== after[key];
  const trimmed = (key: keyof SettingsFormInput) => after[key].trim();

  if (changed("hotelName")) body.hotelName = trimmed("hotelName");
  if (changed("tagline")) body.tagline = trimmed("tagline");
  if (changed("description")) body.description = trimmed("description");
  if (changed("cancellationPolicy")) body.cancellationPolicy = trimmed("cancellationPolicy");
  if (changed("checkInTime")) body.checkInTime = after.checkInTime;
  if (changed("checkOutTime")) body.checkOutTime = after.checkOutTime;
  if (changed("currency")) body.currency = trimmed("currency");
  if (changed("taxRatePercent")) body.taxRatePercent = toNumber(after.taxRatePercent);
  if (changed("touristTaxPerAdultPerNight")) body.touristTaxPerAdultPerNight = toNumber(after.touristTaxPerAdultPerNight);
  if (changed("maxStayNights")) body.maxStayNights = Number(after.maxStayNights);
  if (changed("isBookingEnabled")) body.isBookingEnabled = after.isBookingEnabled;

  const address: NonNullable<SettingsUpdate["address"]> = {};
  if (changed("street")) address.street = trimmed("street");
  if (changed("city")) address.city = trimmed("city");
  if (changed("country")) address.country = trimmed("country");
  if (Object.keys(address).length) body.address = address;

  const contact: NonNullable<SettingsUpdate["contact"]> = {};
  if (changed("phone")) contact.phone = trimmed("phone");
  if (changed("email")) contact.email = trimmed("email");
  if (Object.keys(contact).length) body.contact = contact;

  const social: NonNullable<SettingsUpdate["socialLinks"]> = {};
  if (changed("facebook") && trimmed("facebook")) social.facebook = trimmed("facebook");
  if (changed("instagram") && trimmed("instagram")) social.instagram = trimmed("instagram");
  if (Object.keys(social).length) body.socialLinks = social;
  return body;
}
