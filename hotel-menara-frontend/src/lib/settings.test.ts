import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { HotelSettings } from "../api/types";
import { settingsDiff, toSettingsForm } from "./settings";

const settings = {
  hotelName: "Hotel Menara Hammamet",
  tagline: "",
  description: "",
  address: { street: "Rue de la Paix", city: "Hammamet", country: "Tunisia" },
  contact: { phone: "+216 72 226 999", email: "welcome@menarahammamet.com" },
  socialLinks: { facebook: "https://facebook.com/menara" },
  checkInTime: "14:00",
  checkOutTime: "12:00",
  currency: "TND",
  taxRatePercent: 7,
  touristTaxPerAdultPerNight: 3,
  maxStayNights: 30,
  cancellationPolicy: "",
  isBookingEnabled: true,
} as HotelSettings;

describe("Settings form → PUT /settings body", () => {
  it("sends nothing when nothing changed", () => {
    const form = toSettingsForm(settings);
    assert.deepEqual(settingsDiff(form, { ...form }), {});
  });

  it("sends only changed fields, nested where the backend expects them, with numbers as numbers", () => {
    const before = toSettingsForm(settings);
    const after = { ...before, city: "Hammamet Nord", taxRatePercent: "7,5", isBookingEnabled: false, email: "booking@menara.tn" };
    assert.deepEqual(settingsDiff(before, after), {
      address: { city: "Hammamet Nord" },
      contact: { email: "booking@menara.tn" },
      taxRatePercent: 7.5,
      isBookingEnabled: false,
    });
  });

  it("never sends an empty social link (rejected by the backend schema)", () => {
    const before = toSettingsForm(settings);
    assert.deepEqual(settingsDiff(before, { ...before, facebook: "" }), {});
    assert.deepEqual(settingsDiff(before, { ...before, instagram: "https://instagram.com/hotel_menara" }), { socialLinks: { instagram: "https://instagram.com/hotel_menara" } });
  });
});
