import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fail, mockFetch, ok } from "../test/fetchMock";
import { ApiError, buildQuery, createClient } from "./client";

const BASE = "http://api.test/api/v1";

describe("API client: response handling", () => {
  it("unwraps the success envelope and keeps meta", async () => {
    const fetch = mockFetch(ok([{ id: "1" }], { count: 1 }));
    const client = createClient({ baseUrl: `${BASE}/`, fetchImpl: fetch.impl });
    const result = await client.request<Array<{ id: string }>>("/rooms");
    assert.deepEqual(result.data, [{ id: "1" }]);
    assert.deepEqual(result.meta, { count: 1 });
    assert.equal(fetch.calls[0].url, `${BASE}/rooms`);
    assert.equal(fetch.calls[0].method, "GET");
  });

  it("sends JSON bodies with the right headers", async () => {
    const fetch = mockFetch({ status: 201, body: { success: true, data: { id: "x" } } });
    const client = createClient({ baseUrl: BASE, fetchImpl: fetch.impl });
    await client.request("/contact-messages", { method: "POST", body: { name: "A" } });
    assert.equal(fetch.calls[0].headers["Content-Type"], "application/json");
    assert.deepEqual(fetch.calls[0].body, { name: "A" });
  });

  it("treats 204 No Content as success without a body", async () => {
    const fetch = mockFetch({ status: 204 });
    const client = createClient({ baseUrl: BASE, fetchImpl: fetch.impl });
    const result = await client.request("/rooms/abc", { method: "DELETE", auth: true });
    assert.equal(result.data, undefined);
  });

  it("builds query strings and skips empty values", () => {
    assert.equal(buildQuery({ checkIn: "2026-11-01", adults: 2, roomType: undefined, email: "" }), "?checkIn=2026-11-01&adults=2");
    assert.equal(buildQuery(undefined), "");
  });
});

describe("API client: error handling", () => {
  it("turns the error envelope into an ApiError with code, status and field details", async () => {
    const fetch = mockFetch(fail(400, "VALIDATION_ERROR", "Request validation failed", [{ path: "guest.email", message: "must be a valid e-mail address" }, { bad: true }]));
    const client = createClient({ baseUrl: BASE, fetchImpl: fetch.impl });
    await assert.rejects(client.request("/bookings", { method: "POST", body: {} }), (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 400);
      assert.equal(error.code, "VALIDATION_ERROR");
      assert.deepEqual(error.details, [{ path: "guest.email", message: "must be a valid e-mail address" }]);
      return true;
    });
  });

  it("reports a network failure as NETWORK_ERROR", async () => {
    const client = createClient({ baseUrl: BASE, fetchImpl: mockFetch(new TypeError("Failed to fetch")).impl });
    await assert.rejects(client.request("/rooms"), { code: "NETWORK_ERROR", status: 0 });
  });

  it("aborts slow requests with TIMEOUT", async () => {
    const client = createClient({ baseUrl: BASE, fetchImpl: mockFetch("hang").impl, timeoutMs: 20 });
    await assert.rejects(client.request("/rooms"), { code: "TIMEOUT" });
  });

  it("rejects unreadable answers with INVALID_RESPONSE", async () => {
    const client = createClient({ baseUrl: BASE, fetchImpl: mockFetch({ status: 200, raw: "<html>proxy</html>" }).impl });
    await assert.rejects(client.request("/rooms"), { code: "INVALID_RESPONSE" });
  });

  it("uses HTTP_<status> when an error has no envelope", async () => {
    const client = createClient({ baseUrl: BASE, fetchImpl: mockFetch({ status: 502, body: { nope: 1 } }).impl });
    await assert.rejects(client.request("/rooms"), { code: "HTTP_502", status: 502 });
  });
});

describe("API client: authentication", () => {
  it("adds the Bearer token only to authenticated requests", async () => {
    const fetch = mockFetch(ok({}));
    const client = createClient({ baseUrl: BASE, fetchImpl: fetch.impl, getToken: () => "jwt-123" });
    await client.request("/rooms");
    await client.request("/bookings", { auth: true });
    assert.equal(fetch.calls[0].headers.Authorization, undefined);
    assert.equal(fetch.calls[1].headers.Authorization, "Bearer jwt-123");
  });

  it("ends the session when the backend rejects the token (INVALID_TOKEN)", async () => {
    let ended = 0;
    const client = createClient({ baseUrl: BASE, fetchImpl: mockFetch(fail(401, "INVALID_TOKEN")).impl, getToken: () => "old", onUnauthorized: () => ended++ });
    await assert.rejects(client.request("/bookings", { auth: true }), { code: "INVALID_TOKEN" });
    assert.equal(ended, 1);
  });

  it("keeps the session on a wrong current password (401 INVALID_CREDENTIALS)", async () => {
    let ended = 0;
    const client = createClient({ baseUrl: BASE, fetchImpl: mockFetch(fail(401, "INVALID_CREDENTIALS")).impl, getToken: () => "t", onUnauthorized: () => ended++ });
    await assert.rejects(client.request("/auth/change-password", { method: "POST", body: {}, auth: true }), { code: "INVALID_CREDENTIALS" });
    assert.equal(ended, 0);
  });
});
