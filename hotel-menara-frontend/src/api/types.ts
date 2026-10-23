/**
 * Types of the existing hotel-menara-backend API (/api/v1).
 * Written from the backend source: src/models/*.js (Mongoose schemas, `id` instead of `_id`),
 * src/validation/*.js (Zod request schemas, unknown fields are rejected) and src/controllers/*.js.
 */

export const ROOM_TYPES = ["single", "double", "twin", "family", "suite"] as const;
export type RoomType = (typeof ROOM_TYPES)[number];

export const SERVICE_CATEGORIES = ["dining", "wellness", "leisure", "transport", "business", "other"] as const;
export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

export const GALLERY_CATEGORIES = ["rooms", "dining", "pool", "exterior", "events", "other"] as const;
export type GalleryCategory = (typeof GALLERY_CATEGORIES)[number];

export const BOOKING_STATUSES = ["pending", "confirmed", "cancelled", "completed"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const MESSAGE_STATUSES = ["new", "read", "archived"] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

/** Success envelope: `{ success: true, data, meta? }`. */
export interface SuccessEnvelope<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

/** One entry of `error.details` for VALIDATION_ERROR responses. */
export interface FieldIssue {
  path: string;
  message: string;
}

/** Error envelope: `{ success: false, error: { code, message, details? } }`. */
export interface ErrorEnvelope {
  success: false;
  error: { code: string; message: string; details?: unknown };
}

/** `meta` of the paginated admin lists (bookings, contact messages). */
export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Timestamps {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface HotelSettings extends Timestamps {
  key: string;
  hotelName: string;
  tagline: string;
  description: string;
  address: { street?: string; city?: string; country?: string };
  contact: { phone?: string; email?: string };
  socialLinks?: { facebook?: string; instagram?: string };
  checkInTime: string;
  checkOutTime: string;
  currency: string;
  taxRatePercent: number;
  touristTaxPerAdultPerNight: number;
  maxStayNights: number;
  cancellationPolicy: string;
  isBookingEnabled: boolean;
}

/** Body of PUT /settings (every field optional, at least one required). */
export interface SettingsUpdate {
  hotelName?: string;
  tagline?: string;
  description?: string;
  address?: { street?: string; city?: string; country?: string };
  contact?: { phone?: string; email?: string };
  socialLinks?: { facebook?: string; instagram?: string };
  checkInTime?: string;
  checkOutTime?: string;
  currency?: string;
  taxRatePercent?: number;
  touristTaxPerAdultPerNight?: number;
  maxStayNights?: number;
  cancellationPolicy?: string;
  isBookingEnabled?: boolean;
}

/** A room record is a room TYPE with `totalUnits` identical rooms. */
export interface Room extends Timestamps {
  name: string;
  slug: string;
  type: RoomType;
  description: string;
  capacity: number;
  totalUnits: number;
  pricePerNight: number;
  amenities: string[];
  images: string[];
  isActive: boolean;
  isDemo?: boolean;
}

export interface RoomInput {
  name: string;
  slug?: string;
  type: RoomType;
  description: string;
  capacity: number;
  totalUnits: number;
  pricePerNight: number;
  amenities?: string[];
  images?: string[];
  isActive?: boolean;
}

export interface HotelService extends Timestamps {
  name: string;
  description: string;
  category: ServiceCategory;
  icon?: string;
  order: number;
  isActive: boolean;
  isDemo?: boolean;
}

export interface ServiceInput {
  name: string;
  description: string;
  category: ServiceCategory;
  icon?: string;
  order?: number;
  isActive?: boolean;
}

export interface GalleryItem extends Timestamps {
  title: string;
  caption?: string;
  imageUrl: string;
  category: GalleryCategory;
  order: number;
  isActive: boolean;
  isDemo?: boolean;
}

export interface GalleryInput {
  title: string;
  caption?: string;
  imageUrl: string;
  category: GalleryCategory;
  order?: number;
  isActive?: boolean;
}

/** Price breakdown computed by the server (never by the client). */
export interface Pricing {
  currency: string;
  nightlyRate: number;
  nights: number;
  subtotal: number;
  taxRatePercent: number;
  taxAmount: number;
  touristTax: number;
  total: number;
}

export interface AvailabilityQuery {
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  roomType?: RoomType;
  roomId?: string;
}

export interface AvailabilityRoom {
  room: Room;
  available: boolean;
  remainingUnits: number;
  pricing: Pricing;
}

export interface AvailabilityResult {
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  currency: string;
  rooms: AvailabilityRoom[];
}

export interface GuestDetails {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

/** Body of POST /bookings. No price field: the backend rejects unknown fields. */
export interface BookingRequest {
  roomId: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  guest: GuestDetails;
  specialRequests?: string;
}

export interface Booking extends Timestamps {
  reference: string;
  /** ObjectId of the room (not populated by the backend). */
  room: string;
  roomName: string;
  guest: GuestDetails;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  specialRequests?: string;
  pricing: Pricing;
  status: BookingStatus;
  cancellationReason?: string;
  statusChangedAt?: string;
}

export interface BookingListQuery {
  status?: BookingStatus;
  reference?: string;
  email?: string;
  checkInFrom?: string;
  checkInTo?: string;
  page?: number;
  limit?: number;
}

export interface ContactRequest {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

export interface ContactMessage extends Timestamps {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status: MessageStatus;
}

export interface Admin extends Timestamps {
  email: string;
  name: string;
  role: "admin";
  isActive: boolean;
  tokenVersion: number;
  lastLoginAt?: string;
}

export interface LoginResponse {
  token: string;
  tokenType: "Bearer";
  expiresInSeconds: number;
  admin: Admin;
}

export interface Health {
  status: "ok" | "degraded";
  database: "connected" | "disconnected";
  environment: string;
  aiEnabled: boolean;
  emailEnabled: boolean;
  uptimeSeconds: number;
}
