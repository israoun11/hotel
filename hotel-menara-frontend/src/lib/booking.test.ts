import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createClient } from "../api/client";
import { createEndpoints } from "../api/endpoints";
import type { AvailabilityResult, AvailabilityRoom } from "../api/types";
import { fail, mockFetch } from "../test/fetchMock";
import { bookingRequest, submitBooking } from "./booking";
import { createSubmitGuard } from "./submission";

const selected = { room: { id: "a".repeat(24) }, available: true, remainingUnits: 3 } as AvailabilityRoom;
const result = { checkIn: "2026-11-02", checkOut: "2026-11-05", adults: 2, children: 1, nights: 3, currency: "TND", rooms: [selected] } as AvailabilityResult;
const guest = { firstName: " Amel ", lastName: "Ben Salah", email: "amel@example.tn ", phone: "+216 72 226 999", specialRequests: "  " };

const endpoints = (...answers: Parameters<typeof mockFetch>) => {
  const fetch = mockFetch(...answers);
  return { api: createEndpoints(createClient({ baseUrl: "http://api.test/api/v1", fetchImpl: fetch.impl })), calls: fetch.calls };
};

describe("Reservation submission", () => {
  it("builds the strict POST /bookings body from the chosen availability result (trimmed, no empty requests, no price)", () => {
    assert.deepEqual(bookingRequest(result, selected, guest), {
      roomId: "a".repeat(24),
      checkIn: "2026-11-02",
      checkOut: "2026-11-05",
      adults: 2,
      children: 1,
      guest: { firstName: "Amel", lastName: "Ben Salah", email: "amel@example.tn", phone: "+216 72 226 999" },
    });
  });

  it("only reports 'booked' with the booking returned by the backend (201)", async () => {
    const { api } = endpoints({ status: 201, body: { success: true, data: { reference: "MEN-AB12CD34", status: "pending" } } });
    const outcome = await submitBooking(api.createBooking, bookingRequest(result, selected, guest));
    assert.equal(outcome.kind, "booked");
    assert.equal(outcome.kind === "booked" && outcome.booking.reference, "MEN-AB12CD34");
  });

  it("never reports a booking when the backend fails", async () => {
    for (const answer of [fail(500, "INTERNAL_ERROR"), fail(503, "BOOKING_DISABLED"), new TypeError("offline")]) {
      const { api } = endpoints(answer);
      const outcome = await submitBooking(api.createBooking, bookingRequest(result, selected, guest));
      assert.notEqual(outcome.kind, "booked");
    }
  });

  it("classifies room and date problems so the page can refresh availability or go back to the dates", async () => {
    const room = await submitBooking(endpoints(fail(409, "ROOM_UNAVAILABLE")).api.createBooking, bookingRequest(result, selected, guest));
    assert.equal(room.kind, "room");
    const capacity = await submitBooking(endpoints(fail(422, "CAPACITY_EXCEEDED")).api.createBooking, bookingRequest(result, selected, guest));
    assert.equal(capacity.kind, "room");
    const dates = await submitBooking(endpoints(fail(400, "INVALID_DATES")).api.createBooking, bookingRequest(result, selected, guest));
    assert.equal(dates.kind, "dates");
  });

  it("maps backend field errors (guest.email) onto the form fields", async () => {
    const { api } = endpoints(fail(400, "VALIDATION_ERROR", "Request validation failed", [{ path: "guest.email", message: "must be a valid e-mail address" }]));
    const outcome = await submitBooking(api.createBooking, bookingRequest(result, selected, guest));
    assert.equal(outcome.kind, "error");
    assert.deepEqual(outcome.kind === "error" && outcome.fieldErrors, { email: "must be a valid e-mail address" });
  });

  it("a double submission sends a single request", async () => {
    const { api, calls } = endpoints({ status: 201, body: { success: true, data: { reference: "MEN-AB12CD34" } } });
    const guard = createSubmitGuard();
    const send = () => guard.run(() => submitBooking(api.createBooking, bookingRequest(result, selected, guest)));
    const [first, second] = await Promise.all([send(), send()]);
    assert.equal(calls.length, 1);
    assert.equal(first?.kind, "booked");
    assert.equal(second, undefined);
    assert.equal(guard.running, false);
    await send();
    assert.equal(calls.length, 2, "a new submission is allowed once the first one has finished");
  });
});
