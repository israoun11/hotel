import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { GalleryItem, HotelService, HotelSettings, Room } from "../api/types";
import { OFFICIAL } from "../content/hotel";
import { PHOTOS } from "../content/photos";
import { en } from "../i18n/en";
import { fr } from "../i18n/fr";
import { buildGallery, isDemoRoom, isPlaceholder, isUsableImageUrl, publicRooms, publicServices, resolveHotel, roomView } from "./hotel";

const demoSettings = {
  hotelName: "Hotel Menara Hammamet",
  tagline: "[DEMO] Replace this tagline",
  address: { street: "[DEMO] Street address", city: "Hammamet", country: "Tunisia" },
  contact: { phone: "+000 00 000 000", email: "demo@example.com" },
  cancellationPolicy: "[DEMO] Replace with the real cancellation policy.",
  currency: "TND",
  maxStayNights: 30,
  isBookingEnabled: true,
  checkInTime: "14:00",
  checkOutTime: "12:00",
} as unknown as HotelSettings;

describe("Backend demo data is never shown as real hotel information", () => {
  it("detects placeholders", () => {
    assert.equal(isPlaceholder("[DEMO] Spa"), true);
    assert.equal(isPlaceholder("+000 00 000 000"), true);
    assert.equal(isPlaceholder(""), true);
    assert.equal(isPlaceholder("Lina Spa"), false);
  });

  it("only real http(s) image URLs are used", () => {
    assert.equal(isUsableImageUrl("https://example.com/demo/pool.jpg"), false);
    assert.equal(isUsableImageUrl("javascript:alert(1)"), false);
    assert.equal(isUsableImageUrl("https://cdn.menarahammamet.com/pool.jpg"), true);
  });

  it("falls back to the official contact details while the settings are demo values", () => {
    const hotel = resolveHotel(demoSettings, "fr");
    assert.equal(hotel.phone, OFFICIAL.phone);
    assert.equal(hotel.email, OFFICIAL.email);
    assert.equal(hotel.street, OFFICIAL.street);
    assert.equal(hotel.cancellationPolicy, undefined);
    assert.equal(hotel.city, "Hammamet");
    assert.equal(hotel.country, "Tunisie", "the backend default country is localized");
    assert.equal(resolveHotel(demoSettings, "en").country, "Tunisia");
  });

  it("uses real backend settings once the hotel has entered them", () => {
    const hotel = resolveHotel({ ...demoSettings, contact: { phone: "+216 72 000 000", email: "booking@menara.tn" }, cancellationPolicy: "Free until 48 h." }, "en");
    assert.equal(hotel.phone, "+216 72 000 000");
    assert.equal(hotel.cancellationPolicy, "Free until 48 h.");
  });

  it("never offers demo rooms or hidden rooms to guests", () => {
    const base = { slug: "x", type: "double", description: "d", capacity: 2, pricePerNight: 90, amenities: [], images: [], isActive: true } as unknown as Room;
    const rooms = [
      { ...base, id: "demo-flag", name: "Double", isDemo: true },
      { ...base, id: "demo-name", name: "[DEMO] Double Room" },
      { ...base, id: "hidden", name: "Suite", isActive: false },
      { ...base, id: "real", name: "Chambre double", isDemo: false },
    ] as Room[];
    assert.deepEqual(publicRooms(rooms).map((r) => r.id), ["real"]);
    assert.equal(isDemoRoom(rooms[1]), true);
  });

  it("fills empty or placeholder fields of a genuine room with the official room facts and photos", () => {
    const room = { id: "r1", name: "Chambre double", slug: "chambre-double", type: "double", description: "[DEMO] Placeholder", capacity: 2, pricePerNight: 90, amenities: [], images: ["https://example.com/demo/double.jpg"], isActive: true } as unknown as Room;
    const view = roomView(room, 0, fr);
    assert.equal(view.name, "Chambre double");
    assert.equal(view.description, fr.rooms.genericDescription);
    assert.deepEqual(view.amenities, fr.rooms.features);
    assert.equal(view.photos[0].id, PHOTOS.rooms[0].id);
    assert.equal(roomView(room, 0, en).typeLabel, "Double room");
  });

  it("keeps a real room exactly as the backend describes it", () => {
    const room = { id: "r2", name: "Suite Jasmin", slug: "suite-jasmin", type: "suite", description: "Suite with sea view.", capacity: 3, pricePerNight: 300, amenities: ["Terrace"], images: ["https://cdn.hotel.tn/suite.jpg"], isActive: true, isDemo: false } as Room;
    const view = roomView(room, 0, fr);
    assert.equal(view.name, "Suite Jasmin");
    assert.deepEqual(view.amenities, ["Terrace"]);
    assert.deepEqual(view.photos[0].sources, ["https://cdn.hotel.tn/suite.jpg"]);
  });

  it("hides demo services and demo gallery items", () => {
    const services = [
      { id: "1", name: "[DEMO] Spa", description: "[DEMO] x", isActive: true, isDemo: true },
      { id: "2", name: "Navette", description: "Sur demande", isActive: true, isDemo: false },
      { id: "3", name: "Old", description: "Hidden", isActive: false },
    ] as HotelService[];
    assert.deepEqual(publicServices(services).map((s) => s.id), ["2"]);
    const gallery = [
      { id: "g1", title: "[DEMO] Pool", imageUrl: "https://example.com/demo/pool.jpg", category: "pool", isActive: true, isDemo: true },
      { id: "g2", title: "Piscine", imageUrl: "https://cdn.hotel.tn/pool.jpg", category: "pool", isActive: true },
    ] as GalleryItem[];
    const entries = buildGallery(gallery, fr);
    assert.equal(entries[0].key, "g2");
    assert.equal(entries.filter((e) => e.key.startsWith("g")).length, 1);
    assert.equal(entries.length, 1 + PHOTOS.hotel.length + PHOTOS.rooms.length + PHOTOS.spa.length);
  });
});
