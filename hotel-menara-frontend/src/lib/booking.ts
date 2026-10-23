import { ApiError } from "../api/client";
import type { AvailabilityResult, AvailabilityRoom, Booking, BookingRequest } from "../api/types";
import type { GuestInput } from "./validation";
import { fieldErrorsFrom } from "./errors";

/** Backend paths of VALIDATION_ERROR details → booking form fields. */
export const GUEST_FIELD_ALIASES = {
  "guest.firstName": "firstName",
  "guest.lastName": "lastName",
  "guest.email": "email",
  "guest.phone": "phone",
};

/** The exact body of POST /bookings. Dates and guests come from the availability answer the guest chose from. */
export function bookingRequest(result: AvailabilityResult, selected: AvailabilityRoom, guest: GuestInput): BookingRequest {
  return {
    roomId: selected.room.id,
    checkIn: result.checkIn,
    checkOut: result.checkOut,
    adults: result.adults,
    children: result.children,
    guest: { firstName: guest.firstName.trim(), lastName: guest.lastName.trim(), email: guest.email.trim(), phone: guest.phone.trim() },
    ...(guest.specialRequests.trim() ? { specialRequests: guest.specialRequests.trim() } : {}),
  };
}

export type SubmitOutcome =
  /** Only produced by a successful (201) backend answer. */
  | { kind: "booked"; booking: Booking }
  /** The room cannot be booked as requested any more: refresh availability. */
  | { kind: "room"; error: unknown }
  /** The dates were refused: go back to the dates step. */
  | { kind: "dates"; error: unknown }
  /** Anything else: stay on the form, keep what the guest typed. */
  | { kind: "error"; error: unknown; fieldErrors: Record<string, string> };

const ROOM_ERRORS = new Set(["ROOM_UNAVAILABLE", "CAPACITY_EXCEEDED", "ROOM_NOT_FOUND"]);
const DATE_ERRORS = new Set(["INVALID_DATES", "STAY_TOO_LONG"]);

export async function submitBooking(create: (body: BookingRequest) => Promise<Booking>, body: BookingRequest): Promise<SubmitOutcome> {
  try {
    return { kind: "booked", booking: await create(body) };
  } catch (error) {
    const code = error instanceof ApiError ? error.code : "";
    if (ROOM_ERRORS.has(code)) return { kind: "room", error };
    if (DATE_ERRORS.has(code)) return { kind: "dates", error };
    return { kind: "error", error, fieldErrors: fieldErrorsFrom(error, GUEST_FIELD_ALIASES) };
  }
}
