const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const { changePasswordBody, loginBody } = require("../src/validation/auth.schemas");
const { availabilityQuery, createBookingBody, lookupBookingBody, updateBookingStatusBody } = require("../src/validation/booking.schemas");
const { createGalleryBody, createServiceBody } = require("../src/validation/catalog.schemas");
const { strongPassword } = require("../src/validation/common");
const { createContactBody } = require("../src/validation/contact.schemas");
const { createRoomBody, updateRoomBody } = require("../src/validation/room.schemas");
const { updateSettingsBody } = require("../src/validation/settings.schemas");

const guest = { firstName: "Demo", lastName: "Guest", email: "Demo.Guest@Example.com", phone: "+216 00 000 000" };
const bookingBase = { roomId: "64b7f0c2a1b2c3d4e5f60718", checkIn: "2030-06-10", checkOut: "2030-06-13", adults: 2, guest };
const roomBase = { name: "[DEMO] Room", type: "double", description: "A long enough description", capacity: 2, totalUnits: 3, pricePerNight: 99.5 };

describe("room schemas", () => {
  it("accepts a valid room and rejects unknown fields", () => {
    assert.equal(createRoomBody.safeParse(roomBase).success, true);
    assert.equal(createRoomBody.safeParse({ ...roomBase, isDemo: true }).success, false);
  });

  it("rejects bad values", () => {
    assert.equal(createRoomBody.safeParse({ ...roomBase, pricePerNight: -1 }).success, false);
    assert.equal(createRoomBody.safeParse({ ...roomBase, pricePerNight: 10.12345 }).success, false);
    assert.equal(createRoomBody.safeParse({ ...roomBase, type: "castle" }).success, false);
    assert.equal(createRoomBody.safeParse({ ...roomBase, totalUnits: 0 }).success, false);
    assert.equal(createRoomBody.safeParse({ ...roomBase, slug: "Not A Slug" }).success, false);
    assert.equal(createRoomBody.safeParse({ ...roomBase, images: ["not a url"] }).success, false);
  });

  it("requires at least one field to update", () => {
    assert.equal(updateRoomBody.safeParse({}).success, false);
    assert.equal(updateRoomBody.safeParse({ pricePerNight: 10 }).success, true);
  });
});

describe("booking schemas", () => {
  it("accepts a valid booking, lowercases the e-mail and defaults children to 0", () => {
    const parsed = createBookingBody.parse(bookingBase);
    assert.equal(parsed.guest.email, "demo.guest@example.com");
    assert.equal(parsed.children, 0);
  });

  it("never accepts a client supplied price", () => {
    assert.equal(createBookingBody.safeParse({ ...bookingBase, pricing: { total: 1 } }).success, false);
    assert.equal(createBookingBody.safeParse({ ...bookingBase, totalPrice: 1 }).success, false);
    assert.equal(createBookingBody.safeParse({ ...bookingBase, status: "confirmed" }).success, false);
  });

  it("validates dates", () => {
    assert.equal(createBookingBody.safeParse({ ...bookingBase, checkOut: "2030-06-10" }).success, false);
    assert.equal(createBookingBody.safeParse({ ...bookingBase, checkOut: "2030-06-01" }).success, false);
    assert.equal(createBookingBody.safeParse({ ...bookingBase, checkIn: "2030-02-31" }).success, false);
    assert.equal(createBookingBody.safeParse({ ...bookingBase, roomId: "abc" }).success, false);
    assert.equal(createBookingBody.safeParse({ ...bookingBase, adults: 0 }).success, false);
  });

  it("validates the guest", () => {
    assert.equal(createBookingBody.safeParse({ ...bookingBase, guest: { ...guest, email: "nope" } }).success, false);
    assert.equal(createBookingBody.safeParse({ ...bookingBase, guest: { ...guest, phone: "abc" } }).success, false);
  });

  it("coerces availability query strings", () => {
    const parsed = availabilityQuery.parse({ checkIn: "2030-06-10", checkOut: "2030-06-12", adults: "2" });
    assert.equal(parsed.adults, 2);
    assert.equal(parsed.children, 0);
    assert.equal(availabilityQuery.safeParse({ checkIn: "2030-06-12", checkOut: "2030-06-10" }).success, false);
    assert.equal(availabilityQuery.safeParse({}).success, false);
  });

  it("normalises booking lookups and status changes", () => {
    assert.equal(lookupBookingBody.parse({ reference: " men-abcd2345 ", email: "A@B.co" }).reference, "MEN-ABCD2345");
    assert.equal(lookupBookingBody.safeParse({ reference: "WRONG", email: "a@b.co" }).success, false);
    assert.equal(updateBookingStatusBody.safeParse({ status: "pending" }).success, false);
    assert.equal(updateBookingStatusBody.safeParse({ status: "cancelled", reason: "No show" }).success, true);
  });
});

describe("auth schemas", () => {
  it("rejects NoSQL-injection style payloads", () => {
    assert.equal(loginBody.safeParse({ email: { $gt: "" }, password: { $gt: "" } }).success, false);
    assert.equal(loginBody.safeParse({ email: "admin@example.com", password: "x" }).success, true);
  });

  it("enforces the password policy", () => {
    assert.equal(strongPassword.safeParse("Short1a").success, false);
    assert.equal(strongPassword.safeParse("alllowercase1234").success, false);
    assert.equal(strongPassword.safeParse("ALLUPPERCASE1234").success, false);
    assert.equal(strongPassword.safeParse("NoDigitsHereAtAll").success, false);
    assert.equal(strongPassword.safeParse("Correct-Horse-Battery-9").success, true);
    assert.equal(changePasswordBody.safeParse({ currentPassword: "Same-Password-123", newPassword: "Same-Password-123" }).success, false);
  });
});

describe("catalog, contact and settings schemas", () => {
  it("validates services and gallery items", () => {
    assert.equal(createServiceBody.safeParse({ name: "Spa", description: "Relaxation", category: "wellness" }).success, true);
    assert.equal(createServiceBody.safeParse({ name: "Spa", description: "Relaxation", category: "nope" }).success, false);
    assert.equal(createRoomBody.safeParse({ ...roomBase, images: ["data:text/html;base64,AAAA"] }).success, false);
    assert.equal(createGalleryBody.safeParse({ title: "Pool", imageUrl: "https://example.com/pool.jpg", category: "pool" }).success, true);
    assert.equal(createGalleryBody.safeParse({ title: "Pool", imageUrl: "javascript:alert(1)", category: "pool" }).success, false);
  });

  it("validates contact messages", () => {
    const valid = { name: "Demo Visitor", email: "v@example.com", subject: "Hello", message: "A long enough message." };
    assert.equal(createContactBody.safeParse(valid).success, true);
    assert.equal(createContactBody.safeParse({ ...valid, message: "short" }).success, false);
    assert.equal(createContactBody.safeParse({ ...valid, status: "read" }).success, false);
  });

  it("accepts partial nested settings only", () => {
    assert.equal(updateSettingsBody.safeParse({ contact: { email: "hotel@example.com" } }).success, true);
    assert.equal(updateSettingsBody.safeParse({ checkInTime: "25:00" }).success, false);
    assert.equal(updateSettingsBody.safeParse({ taxRatePercent: 150 }).success, false);
    assert.equal(updateSettingsBody.safeParse({ currency: "tnd" }).success, false);
    assert.equal(updateSettingsBody.safeParse({}).success, false);
    assert.equal(updateSettingsBody.safeParse({ key: "other" }).success, false);
  });
});
