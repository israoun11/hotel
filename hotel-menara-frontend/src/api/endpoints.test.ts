import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mockFetch, ok } from "../test/fetchMock";
import { createClient } from "./client";
import { createEndpoints } from "./endpoints";

const setup = (...answers: Parameters<typeof mockFetch>) => {
  const fetch = mockFetch(...answers);
  const api = createEndpoints(createClient({ baseUrl: "http://api.test/api/v1", fetchImpl: fetch.impl, getToken: () => "tok" }));
  return { api, calls: fetch.calls };
};

describe("Endpoints follow the backend routes", () => {
  it("GET /availability with the stay as query parameters", async () => {
    const { api, calls } = setup(ok({ rooms: [] }));
    await api.availability({ checkIn: "2026-11-02", checkOut: "2026-11-05", adults: 2, children: 1 });
    assert.equal(calls[0].url, "http://api.test/api/v1/availability?checkIn=2026-11-02&checkOut=2026-11-05&adults=2&children=1");
  });

  it("POST /bookings sends only the fields the strict schema accepts (no price)", async () => {
    const { api, calls } = setup({ status: 201, body: { success: true, data: { reference: "MEN-ABCDEFGH" } } });
    const booking = await api.createBooking({
      roomId: "a".repeat(24),
      checkIn: "2026-11-02",
      checkOut: "2026-11-05",
      adults: 2,
      children: 0,
      guest: { firstName: "A", lastName: "B", email: "a@b.tn", phone: "+216 72 226 999" },
    });
    assert.equal(booking.reference, "MEN-ABCDEFGH");
    assert.equal(calls[0].method, "POST");
    assert.deepEqual(Object.keys(calls[0].body as object).sort(), ["adults", "checkIn", "checkOut", "children", "guest", "roomId"]);
  });

  it("POST /auth/login with e-mail and password", async () => {
    const { api, calls } = setup(ok({ token: "t", tokenType: "Bearer", expiresInSeconds: 60, admin: { id: "1", email: "a@b.tn", name: "A" } }));
    const result = await api.login("a@b.tn", "secret");
    assert.equal(result.token, "t");
    assert.equal(calls[0].url, "http://api.test/api/v1/auth/login");
    assert.deepEqual(calls[0].body, { email: "a@b.tn", password: "secret" });
    assert.equal(calls[0].headers.Authorization, undefined);
  });

  it("admin lists are authenticated, include inactive items and expose pagination", async () => {
    const { api, calls } = setup(ok([], { page: 2, limit: 20, total: 41, totalPages: 3 }));
    const page = await api.admin.bookings({ status: "pending", page: 2 });
    assert.deepEqual(page.meta, { page: 2, limit: 20, total: 41, totalPages: 3 });
    assert.equal(calls[0].url, "http://api.test/api/v1/bookings?status=pending&page=2&limit=20");
    assert.equal(calls[0].headers.Authorization, "Bearer tok");
  });

  it("PATCH /bookings/:id/status only sends a reason when there is one", async () => {
    const { api, calls } = setup(ok({}));
    await api.admin.updateBookingStatus("b".repeat(24), "confirmed");
    await api.admin.updateBookingStatus("b".repeat(24), "cancelled", "Client request");
    assert.deepEqual(calls[0].body, { status: "confirmed" });
    assert.deepEqual(calls[1].body, { status: "cancelled", reason: "Client request" });
    assert.equal(calls[1].method, "PATCH");
    assert.ok(calls[1].url.endsWith(`/bookings/${"b".repeat(24)}/status`));
  });

  it("GET /rooms?includeInactive=true for the admin room list", async () => {
    const { api, calls } = setup(ok([]));
    await api.admin.rooms();
    assert.ok(calls[0].url.endsWith("/rooms?includeInactive=true"));
  });
});
