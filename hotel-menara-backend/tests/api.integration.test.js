/**
 * End-to-end API tests against a REAL MongoDB database.
 * They run only when MONGODB_URI_TEST is set (a database whose name ends with "_test": it is wiped).
 * Without it, this whole file is reported as "skipped".
 */
const assert = require("node:assert/strict");
const { after, before, describe, it } = require("node:test");

const enabled = Boolean(process.env.MONGODB_URI_TEST);
const ADMIN_EMAIL = "admin.test@example.com";
const ADMIN_PASSWORD = "Test-Admin-Password-123";

const isoDaysFromNow = (days) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
const guest = { firstName: "Demo", lastName: "Guest", email: "demo.guest@example.com", phone: "+216 00 000 000" };

describe("API integration (MongoDB test database)", { skip: enabled ? false : "MONGODB_URI_TEST is not set" }, () => {
  let app;
  let request;
  let token = "";
  let roomId = "";
  let disconnect;
  const checkIn = isoDaysFromNow(40);
  const checkOut = isoDaysFromNow(43);

  before(async () => {
    // Loaded lazily so that this file can be skipped without installing/connecting anything.
    request = require("supertest");
    const mongoose = require("mongoose");
    const bcrypt = require("bcryptjs");
    const { createApp } = require("../src/app");
    const db = require("../src/config/db");
    const { Admin } = require("../src/models/Admin");

    const dbName = await db.connectDb();
    assert.ok(dbName.endsWith("_test"), `Refusing to wipe database "${dbName}": its name must end with _test`);
    await mongoose.connection.dropDatabase();
    await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
    await Admin.create({ email: ADMIN_EMAIL, name: "Test Admin", passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 10) });
    app = createApp();
    disconnect = db.disconnectDb;
  });

  after(async () => {
    if (disconnect) await disconnect();
  });

  const auth = () => ({ Authorization: `Bearer ${token}` });
  const roomPayload = { name: "[DEMO] Integration room", type: "double", description: "[DEMO] Room for integration tests", capacity: 2, totalUnits: 1, pricePerNight: 100 };
  const bookingPayload = () => ({ roomId, checkIn, checkOut, adults: 2, guest });

  it("answers the health check", async () => {
    const res = await request(app).get("/api/v1/health");
    assert.equal(res.status, 200);
    assert.equal(res.body.data.database, "connected");
  });

  it("returns a JSON 404 for unknown routes", async () => {
    const res = await request(app).get("/api/v1/nope");
    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, "NOT_FOUND");
  });

  it("rejects wrong credentials and logs the administrator in", async () => {
    const bad = await request(app).post("/api/v1/auth/login").send({ email: ADMIN_EMAIL, password: "Wrong-Password-123" });
    assert.equal(bad.status, 401);
    const good = await request(app).post("/api/v1/auth/login").send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    assert.equal(good.status, 200);
    assert.ok(good.body.data.token);
    assert.equal(JSON.stringify(good.body).includes("passwordHash"), false);
    token = good.body.data.token;
  });

  it("protects admin endpoints", async () => {
    assert.equal((await request(app).post("/api/v1/rooms").send(roomPayload)).status, 401);
    assert.equal((await request(app).get("/api/v1/bookings").set("Authorization", "Bearer bad.token.value")).status, 401);
    assert.equal((await request(app).get("/api/v1/auth/me").set(auth())).status, 200);
  });

  it("manages rooms", async () => {
    const invalid = await request(app).post("/api/v1/rooms").set(auth()).send({ ...roomPayload, pricePerNight: -1 });
    assert.equal(invalid.status, 400);
    const created = await request(app).post("/api/v1/rooms").set(auth()).send(roomPayload);
    assert.equal(created.status, 201);
    roomId = created.body.data.id;
    const duplicate = await request(app).post("/api/v1/rooms").set(auth()).send(roomPayload);
    assert.equal(duplicate.status, 409);
    const bySlug = await request(app).get(`/api/v1/rooms/${created.body.data.slug}`);
    assert.equal(bySlug.status, 200);
  });

  it("computes prices on the server and refuses client prices", async () => {
    const search = await request(app).get("/api/v1/availability").query({ checkIn, checkOut, adults: 2, roomId });
    assert.equal(search.status, 200);
    assert.equal(search.body.data.rooms[0].pricing.subtotal, 300);
    const forged = await request(app).post("/api/v1/bookings").send({ ...bookingPayload(), pricing: { total: 1 } });
    assert.equal(forged.status, 400);
  });

  it("prevents double bookings, even with simultaneous requests", async () => {
    const results = await Promise.all(
      Array.from({ length: 6 }, (_, index) => request(app).post("/api/v1/bookings").send({ ...bookingPayload(), guest: { ...guest, email: `guest${index}@example.com` } })),
    );
    const statuses = results.map((res) => res.status).sort();
    assert.deepEqual(statuses, [201, 409, 409, 409, 409, 409]);
    const winner = results.find((res) => res.status === 201);
    assert.ok(winner);
    assert.equal(winner.body.data.status, "pending");
    assert.equal(winner.body.data.pricing.total, 300);

    const full = await request(app).get("/api/v1/availability").query({ checkIn, checkOut, adults: 2, roomId });
    assert.equal(full.body.data.rooms[0].available, false);
  });

  it("frees the room when the booking is cancelled, and lets it be booked again", async () => {
    const list = await request(app).get("/api/v1/bookings").set(auth()).query({ roomId });
    assert.equal(list.status, 200);
    assert.equal(list.body.meta.total, 1);
    const booking = list.body.data[0];

    const lookup = await request(app).post("/api/v1/bookings/lookup").send({ reference: booking.reference, email: booking.guest.email });
    assert.equal(lookup.status, 200);
    const wrongEmail = await request(app).post("/api/v1/bookings/lookup").send({ reference: booking.reference, email: "someone.else@example.com" });
    assert.equal(wrongEmail.status, 404);

    const blocked = await request(app).delete(`/api/v1/rooms/${roomId}`).set(auth());
    assert.equal(blocked.status, 409);

    const cancelled = await request(app).patch(`/api/v1/bookings/${booking.id}/status`).set(auth()).send({ status: "cancelled", reason: "test" });
    assert.equal(cancelled.status, 200);
    const again = await request(app).patch(`/api/v1/bookings/${booking.id}/status`).set(auth()).send({ status: "confirmed" });
    assert.equal(again.status, 409);

    const free = await request(app).get("/api/v1/availability").query({ checkIn, checkOut, adults: 2, roomId });
    assert.equal(free.body.data.rooms[0].available, true);
    const rebooked = await request(app).post("/api/v1/bookings").send(bookingPayload());
    assert.equal(rebooked.status, 201);
  });

  it("validates capacity and dates", async () => {
    assert.equal((await request(app).post("/api/v1/bookings").send({ ...bookingPayload(), adults: 5 })).status, 422);
    assert.equal((await request(app).post("/api/v1/bookings").send({ ...bookingPayload(), checkIn: "2020-01-01", checkOut: "2020-01-03" })).status, 400);
  });

  it("stores and lists contact messages", async () => {
    const created = await request(app).post("/api/v1/contact-messages").send({ name: "Demo Visitor", email: "v@example.com", subject: "Hello", message: "A long enough message." });
    assert.equal(created.status, 201);
    assert.equal((await request(app).get("/api/v1/contact-messages")).status, 401);
    const list = await request(app).get("/api/v1/contact-messages").set(auth());
    assert.equal(list.status, 200);
    assert.equal(list.body.meta.total, 1);
  });

  it("answers 503 for the AI assistant when it is disabled", async () => {
    const res = await request(app).post("/api/v1/ai/assistant").send({ message: "What time is check-in?" });
    assert.equal(res.status, 503);
    assert.equal(res.body.error.code, "AI_DISABLED");
  });

  it("invalidates old tokens after a password change", async () => {
    const changed = await request(app).post("/api/v1/auth/change-password").set(auth()).send({ currentPassword: ADMIN_PASSWORD, newPassword: "Brand-New-Password-456" });
    assert.equal(changed.status, 200);
    assert.equal((await request(app).get("/api/v1/auth/me").set(auth())).status, 401);
  });
});
