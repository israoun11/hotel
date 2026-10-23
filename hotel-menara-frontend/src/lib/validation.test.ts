import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { en } from "../i18n/en";
import { fr } from "../i18n/fr";
import { isStrongPassword, splitLines, validateContact, validateGuest, validateLookup, validatePasswordChange, validateRoom, validateSearch, validateSettings } from "./validation";

const opts = { today: "2026-10-22", maxStayNights: 30 };

describe("Booking search validation", () => {
  it("accepts a valid stay", () => {
    assert.deepEqual(validateSearch({ checkIn: "2026-10-22", checkOut: "2026-10-25", adults: 2, children: 1 }, fr, opts), {});
  });
  it("rejects past check-in, inverted dates and impossible dates", () => {
    assert.equal(validateSearch({ checkIn: "2026-10-21", checkOut: "2026-10-25", adults: 2, children: 0 }, fr, opts).checkIn, fr.validation.pastDate);
    assert.equal(validateSearch({ checkIn: "2026-11-05", checkOut: "2026-11-05", adults: 2, children: 0 }, fr, opts).checkOut, fr.validation.checkOutAfter);
    assert.equal(validateSearch({ checkIn: "2026-02-30", checkOut: "2026-03-02", adults: 2, children: 0 }, fr, opts).checkIn, fr.validation.date);
  });
  it("enforces the hotel's maximum stay and the guest limits (1-10 adults, 0-10 children)", () => {
    assert.equal(validateSearch({ checkIn: "2026-11-01", checkOut: "2026-12-15", adults: 2, children: 0 }, en, opts).checkOut, en.validation.maxStay(30));
    const errors = validateSearch({ checkIn: "2026-11-01", checkOut: "2026-11-02", adults: 0, children: 11 }, en, opts);
    assert.equal(errors.adults, en.validation.adults);
    assert.equal(errors.children, en.validation.children);
    assert.ok(validateSearch({ checkIn: "2026-11-01", checkOut: "2026-11-02", adults: Number.NaN, children: 0 }, en, opts).adults);
  });
});

describe("Guest details validation (same rules as the backend)", () => {
  const good = { firstName: "Amel", lastName: "Ben Salah", email: "amel@example.tn", phone: "+216 72 226 999", specialRequests: "" };
  it("accepts valid details", () => assert.deepEqual(validateGuest(good, fr), {}));
  it("requires names, a valid e-mail and phone", () => {
    const errors = validateGuest({ ...good, firstName: " ", email: "amel@", phone: "12" }, fr);
    assert.deepEqual(Object.keys(errors).sort(), ["email", "firstName", "phone"]);
  });
  it("limits special requests to 1000 characters", () => {
    assert.equal(validateGuest({ ...good, specialRequests: "x".repeat(1001) }, en).specialRequests, en.validation.maxLength(1000));
  });
});

describe("Other forms", () => {
  it("contact: minimum lengths of the backend, optional phone", () => {
    const errors = validateContact({ name: "A", email: "a@b.tn", phone: "", subject: "Hi", message: "short" }, fr);
    assert.deepEqual(Object.keys(errors).sort(), ["message", "name", "subject"]);
  });
  it("lookup: reference format MEN-XXXXXXXX (case-insensitive)", () => {
    assert.deepEqual(validateLookup({ reference: "men-ab12cd34", email: "a@b.tn" }, fr), {});
    assert.equal(validateLookup({ reference: "MEN-123", email: "a@b.tn" }, fr).reference, fr.validation.reference);
  });
  it("password: 12+ characters with lower, upper case and a digit, different from the current one", () => {
    assert.equal(isStrongPassword("Short1A"), false);
    assert.equal(isStrongPassword("alllowercase123"), false);
    assert.equal(isStrongPassword("GoodPassword2026"), true);
    assert.equal(validatePasswordChange({ current: "GoodPassword2026", next: "GoodPassword2026", confirm: "GoodPassword2026" }, en).next, en.validation.passwordSame);
    assert.equal(validatePasswordChange({ current: "x", next: "GoodPassword2026", confirm: "Other" }, en).confirm, en.validation.passwordMatch);
  });
  it("room: rejects non-http image URLs and prices with more than 3 decimals", () => {
    const room = { name: "Suite", slug: "", description: "A quiet suite with a view.", capacity: "2", totalUnits: "3", pricePerNight: "120.5", amenities: "", images: "" };
    assert.deepEqual(validateRoom(room, fr), {});
    assert.equal(validateRoom({ ...room, images: "javascript:alert(1)" }, fr).images, fr.validation.url);
    assert.equal(validateRoom({ ...room, pricePerNight: "1.2345" }, fr).pricePerNight, fr.validation.number);
    assert.equal(validateRoom({ ...room, slug: "Bad Slug" }, fr).slug, fr.validation.slug);
    assert.deepEqual(splitLines(" a \n\n b "), ["a", "b"]);
  });
  it("settings: times, currency and URLs", () => {
    const base = {
      hotelName: "Menara", tagline: "", description: "", street: "", city: "", country: "", phone: "", email: "a@b.tn",
      facebook: "", instagram: "", checkInTime: "14:00", checkOutTime: "12:00", currency: "TND", taxRatePercent: "0",
      touristTaxPerAdultPerNight: "0", maxStayNights: "30", cancellationPolicy: "",
    };
    assert.deepEqual(validateSettings(base, fr), {});
    const errors = validateSettings({ ...base, checkInTime: "25:00", currency: "tnd", facebook: "facebook.com/x", maxStayNights: "91" }, fr);
    assert.deepEqual(Object.keys(errors).sort(), ["checkInTime", "currency", "facebook", "maxStayNights"]);
  });
});
