import type { GalleryCategory, GalleryItem, HotelService, HotelSettings, Room } from "../api/types";
import { OFFICIAL } from "../content/hotel";
import { ALL_PHOTOS, PHOTOS, type Photo } from "../content/photos";
import type { Dictionary, Lang } from "../i18n";

/**
 * The backend ships DEMO placeholder data ("[DEMO]" prefix, example.com URLs, "+000 00 000 000", demo@example.com)
 * until the hotel replaces it. These helpers make sure placeholders are never presented to guests as real information.
 */
const PLACEHOLDERS = new Set(["+000 00 000 000", "demo@example.com"]);

export function isPlaceholder(value: string | undefined | null): boolean {
  if (!value || value.trim() === "") return true;
  const v = value.trim();
  return v.startsWith("[DEMO]") || PLACEHOLDERS.has(v);
}

const real = (value: string | undefined | null): string | undefined => (isPlaceholder(value) ? undefined : value?.trim());

/** example.com hosts never serve real pictures; only http(s) URLs are accepted. */
export function isUsableImageUrl(url: string | undefined | null): url is string {
  if (!url) return false;
  try {
    const { protocol, hostname } = new URL(url);
    return (protocol === "http:" || protocol === "https:") && !/(^|\.)example\.(com|org|net)$/i.test(hostname);
  } catch {
    return false;
  }
}

export interface HotelInfo {
  name: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  facebook: string;
  instagram: string;
  mapUrl: string;
  /** Only present when the backend holds a real (non-demo) value. */
  cancellationPolicy?: string;
  checkInTime?: string;
  checkOutTime?: string;
  currency: string;
  maxStayNights: number;
  isBookingEnabled: boolean;
}

/** Hotel information: real backend settings first, otherwise the facts published on the official website. */
export function resolveHotel(settings: HotelSettings | undefined, lang: Lang): HotelInfo {
  const country = real(settings?.address?.country);
  return {
    name: real(settings?.hotelName) ?? OFFICIAL.name,
    street: real(settings?.address?.street) ?? OFFICIAL.street,
    postalCode: OFFICIAL.postalCode,
    city: real(settings?.address?.city) ?? OFFICIAL.city,
    // "Tunisia" (the backend default) is shown in the visitor's language; any other country is shown as entered.
    country: !country || /^tunisi[ae]$/i.test(country) ? OFFICIAL.country[lang] : country,
    phone: real(settings?.contact?.phone) ?? OFFICIAL.phone,
    email: real(settings?.contact?.email) ?? OFFICIAL.email,
    facebook: real(settings?.socialLinks?.facebook) ?? OFFICIAL.facebook,
    instagram: real(settings?.socialLinks?.instagram) ?? OFFICIAL.instagram,
    mapUrl: OFFICIAL.mapUrl,
    cancellationPolicy: real(settings?.cancellationPolicy),
    checkInTime: settings?.checkInTime,
    checkOutTime: settings?.checkOutTime,
    currency: settings?.currency ?? "TND",
    maxStayNights: settings?.maxStayNights ?? 30,
    isBookingEnabled: settings?.isBookingEnabled ?? true,
  };
}

export const telHref = (phone: string): string => `tel:${phone.replace(/[^\d+]/g, "")}`;

// ---- Rooms -----------------------------------------------------------------

export interface RoomView {
  room: Room;
  name: string;
  typeLabel: string;
  description: string;
  amenities: string[];
  /** The room's own photos when they are real, otherwise the official room photos of the hotel. */
  photos: Photo[];
}

/** Records seeded by the backend as DEMO data (flag or "[DEMO]" name). They are never shown to guests. */
export const isDemoRoom = (room: Room): boolean => room.isDemo === true || isPlaceholder(room.name);

/** Rooms that can be presented to guests: active and genuine (not backend demo data). */
export const publicRooms = <T extends Room>(rooms: T[]): T[] => rooms.filter((room) => room.isActive && !isDemoRoom(room));

const urlPhoto = (url: string, index: number, group: Photo["group"] = "rooms"): Photo => ({ id: `api-${index}-${url}`, group, sources: [url] });

/**
 * How a genuine backend room is presented. Empty or placeholder fields fall back to the facts the official website
 * gives for every room (balcony, TV, private bathroom…) and to the official room photos.
 */
export function roomView(room: Room, index: number, t: Dictionary): RoomView {
  const ownImages = room.images.filter(isUsableImageUrl);
  const officialPhotos = PHOTOS.rooms.map((_, i) => PHOTOS.rooms[(index + i) % PHOTOS.rooms.length]);
  const amenities = room.amenities.filter((item) => !isPlaceholder(item));
  return {
    room,
    name: room.name.trim() || t.rooms.types[room.type],
    typeLabel: t.rooms.types[room.type],
    description: isPlaceholder(room.description) ? t.rooms.genericDescription : room.description,
    amenities: amenities.length > 0 ? amenities : t.rooms.features,
    photos: ownImages.length > 0 ? ownImages.map((url, i) => urlPhoto(url, i)) : officialPhotos,
  };
}

// ---- Services --------------------------------------------------------------

/** Backend services worth showing to guests (active, not demo placeholders). */
export const publicServices = (services: HotelService[]): HotelService[] =>
  services.filter((s) => s.isActive && s.isDemo !== true && !isPlaceholder(s.name) && !isPlaceholder(s.description));

// ---- Gallery ---------------------------------------------------------------

export type GalleryFilter = GalleryCategory | "spa" | "hotel";

export interface GalleryEntry {
  key: string;
  photo: Photo;
  title: string;
  caption?: string;
  category: GalleryFilter;
}

/** Official photos plus the real photos added in the backend gallery (demo items and example.com URLs are skipped). */
export function buildGallery(items: GalleryItem[], t: Dictionary): GalleryEntry[] {
  const fromApi: GalleryEntry[] = items
    .filter((item) => item.isActive && item.isDemo !== true && isUsableImageUrl(item.imageUrl) && !isPlaceholder(item.title))
    .map((item, index) => ({
      key: item.id,
      photo: urlPhoto(item.imageUrl, index, "hotel"),
      title: item.title,
      caption: item.caption && !isPlaceholder(item.caption) ? item.caption : undefined,
      category: item.category,
    }));
  const official: GalleryEntry[] = ALL_PHOTOS.map((photo) => ({
    key: photo.id,
    photo,
    title: photo.group === "rooms" ? t.gallery.roomPhoto : photo.group === "spa" ? t.gallery.spaPhoto : t.gallery.hotelPhoto,
    category: photo.group === "rooms" ? "rooms" : photo.group === "spa" ? "spa" : "hotel",
  }));
  return [...fromApi, ...official];
}
