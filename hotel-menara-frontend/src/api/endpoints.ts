import type { ApiClient } from "./client";
import type {
  AvailabilityQuery,
  AvailabilityResult,
  Booking,
  BookingListQuery,
  BookingRequest,
  BookingStatus,
  ContactMessage,
  ContactRequest,
  GalleryInput,
  GalleryItem,
  Health,
  HotelService,
  HotelSettings,
  LoginResponse,
  Admin,
  MessageStatus,
  PageMeta,
  Room,
  RoomInput,
  ServiceInput,
  SettingsUpdate,
} from "./types";

export interface Page<T> {
  items: T[];
  meta: PageMeta;
}

function toPageMeta(meta: Record<string, unknown> | undefined, fallbackLimit: number): PageMeta {
  const num = (value: unknown, fallback: number) => (typeof value === "number" && Number.isFinite(value) ? value : fallback);
  return {
    page: num(meta?.page, 1),
    limit: num(meta?.limit, fallbackLimit),
    total: num(meta?.total, 0),
    totalPages: num(meta?.totalPages, 1),
  };
}

/**
 * Every endpoint of the existing backend used by this frontend, with the exact path, method and body.
 * See hotel-menara-backend/src/routes/*.js.
 */
export function createEndpoints(client: ApiClient) {
  const get = async <T>(path: string, query?: Record<string, string | number | boolean | undefined>, auth = false) =>
    (await client.request<T>(path, { query, auth })).data;

  return {
    // ---- Public ----------------------------------------------------------
    health: () => get<Health>("/health"),
    settings: () => get<HotelSettings>("/settings"),
    rooms: () => get<Room[]>("/rooms"),
    room: (idOrSlug: string) => get<Room>(`/rooms/${encodeURIComponent(idOrSlug)}`),
    services: () => get<HotelService[]>("/services"),
    gallery: () => get<GalleryItem[]>("/gallery"),
    availability: (query: AvailabilityQuery) =>
      get<AvailabilityResult>("/availability", {
        checkIn: query.checkIn,
        checkOut: query.checkOut,
        adults: query.adults,
        children: query.children,
        roomType: query.roomType,
        roomId: query.roomId,
      }),
    createBooking: async (body: BookingRequest) => (await client.request<Booking>("/bookings", { method: "POST", body })).data,
    lookupBooking: async (reference: string, email: string) =>
      (await client.request<Booking>("/bookings/lookup", { method: "POST", body: { reference, email } })).data,
    sendContactMessage: async (body: ContactRequest) =>
      (await client.request<{ id: string; message: string }>("/contact-messages", { method: "POST", body })).data,

    // ---- Authentication --------------------------------------------------
    login: async (email: string, password: string) =>
      (await client.request<LoginResponse>("/auth/login", { method: "POST", body: { email, password } })).data,
    me: () => get<Admin>("/auth/me", undefined, true),
    changePassword: async (currentPassword: string, newPassword: string) =>
      (await client.request<{ message: string }>("/auth/change-password", { method: "POST", body: { currentPassword, newPassword }, auth: true }))
        .data,

    // ---- Administration (Authorization: Bearer <token>) ------------------
    admin: {
      updateSettings: async (body: SettingsUpdate) =>
        (await client.request<HotelSettings>("/settings", { method: "PUT", body, auth: true })).data,

      rooms: () => get<Room[]>("/rooms", { includeInactive: true }, true),
      createRoom: async (body: RoomInput) => (await client.request<Room>("/rooms", { method: "POST", body, auth: true })).data,
      updateRoom: async (id: string, body: Partial<RoomInput>) =>
        (await client.request<Room>(`/rooms/${id}`, { method: "PATCH", body, auth: true })).data,
      deleteRoom: async (id: string) => {
        await client.request<void>(`/rooms/${id}`, { method: "DELETE", auth: true });
      },

      services: () => get<HotelService[]>("/services", { includeInactive: true }, true),
      createService: async (body: ServiceInput) =>
        (await client.request<HotelService>("/services", { method: "POST", body, auth: true })).data,
      updateService: async (id: string, body: Partial<ServiceInput>) =>
        (await client.request<HotelService>(`/services/${id}`, { method: "PATCH", body, auth: true })).data,
      deleteService: async (id: string) => {
        await client.request<void>(`/services/${id}`, { method: "DELETE", auth: true });
      },

      gallery: () => get<GalleryItem[]>("/gallery", { includeInactive: true }, true),
      createGalleryItem: async (body: GalleryInput) =>
        (await client.request<GalleryItem>("/gallery", { method: "POST", body, auth: true })).data,
      updateGalleryItem: async (id: string, body: Partial<GalleryInput>) =>
        (await client.request<GalleryItem>(`/gallery/${id}`, { method: "PATCH", body, auth: true })).data,
      deleteGalleryItem: async (id: string) => {
        await client.request<void>(`/gallery/${id}`, { method: "DELETE", auth: true });
      },

      bookings: async (query: BookingListQuery = {}): Promise<Page<Booking>> => {
        const limit = query.limit ?? 20;
        const result = await client.request<Booking[]>("/bookings", { query: { ...query, limit }, auth: true });
        return { items: result.data, meta: toPageMeta(result.meta, limit) };
      },
      booking: (id: string) => get<Booking>(`/bookings/${id}`, undefined, true),
      updateBookingStatus: async (id: string, status: Exclude<BookingStatus, "pending">, reason?: string) =>
        (
          await client.request<Booking>(`/bookings/${id}/status`, {
            method: "PATCH",
            body: reason ? { status, reason } : { status },
            auth: true,
          })
        ).data,

      messages: async (query: { status?: MessageStatus; page?: number; limit?: number } = {}): Promise<Page<ContactMessage>> => {
        const limit = query.limit ?? 20;
        const result = await client.request<ContactMessage[]>("/contact-messages", { query: { ...query, limit }, auth: true });
        return { items: result.data, meta: toPageMeta(result.meta, limit) };
      },
      updateMessage: async (id: string, status: MessageStatus) =>
        (await client.request<ContactMessage>(`/contact-messages/${id}`, { method: "PATCH", body: { status }, auth: true })).data,
      deleteMessage: async (id: string) => {
        await client.request<void>(`/contact-messages/${id}`, { method: "DELETE", auth: true });
      },
    },
  };
}

export type Endpoints = ReturnType<typeof createEndpoints>;
