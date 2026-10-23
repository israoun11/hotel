const script = (lines) => ({ type: "text/javascript", exec: lines });

function buildItem(def) {
  const queryEntries = Object.entries(def.query ?? {});
  const queryString = queryEntries.length ? `?${queryEntries.map(([k, v]) => `${k}=${v}`).join("&")}` : "";
  const statusCodes = Array.isArray(def.expect) ? def.expect : [def.expect];
  const statusTest =
    statusCodes.length === 1
      ? `pm.test("Status is ${statusCodes[0]}", () => pm.response.to.have.status(${statusCodes[0]}));`
      : `pm.test("Status is one of ${statusCodes.join("/")}", () => pm.expect(${JSON.stringify(statusCodes)}).to.include(pm.response.code));`;

  const header = [];
  let auth;
  if (def.auth === "admin") {
    auth = { type: "bearer", bearer: [{ key: "token", value: "{{adminToken}}", type: "string" }] };
  } else if (def.auth === "invalid") {
    header.push({ key: "Authorization", value: "Bearer not.a.valid.token" });
  }
  if (def.body !== undefined || def.rawBody !== undefined) header.push({ key: "Content-Type", value: "application/json" });

  const request = {
    method: def.method,
    header,
    url: {
      raw: `{{baseUrl}}${def.path}${queryString}`,
      host: ["{{baseUrl}}"],
      path: def.path.split("/").filter((segment) => segment.length > 0),
      ...(queryEntries.length ? { query: queryEntries.map(([key, value]) => ({ key, value })) } : {}),
    },
    ...(auth ? { auth } : {}),
    ...(def.body !== undefined
      ? { body: { mode: "raw", raw: JSON.stringify(def.body, null, 2), options: { raw: { language: "json" } } } }
      : def.rawBody !== undefined
        ? { body: { mode: "raw", raw: def.rawBody, options: { raw: { language: "json" } } } }
        : {}),
    ...(def.description ? { description: def.description } : {}),
  };

  const events = [{ listen: "test", script: script([statusTest, ...(def.tests ?? [])]) }];
  if (def.pre) events.unshift({ listen: "prerequest", script: script(def.pre) });
  return { name: def.name, request, event: events };
}

const saveVar = (name, expression) => `pm.collectionVariables.set("${name}", ${expression});`;
const json = "const body = pm.response.json();";
const errorCode = (code) => `pm.test("Error code is ${code}", () => pm.expect(pm.response.json().error.code).to.eql("${code}"));`;

const guest = { firstName: "Demo", lastName: "Guest", email: "demo.guest@example.com", phone: "+216 00 000 000" };

const folders = [
  {
    name: "0. System",
    description: "Run first: checks that the API and the database are reachable.",
    requests: [
      { name: "Health check", method: "GET", path: "/health", expect: 200, tests: [json, 'pm.test("Database connected", () => pm.expect(body.data.database).to.eql("connected"));'] },
    ],
  },
  {
    name: "1. Public content",
    description: "No authentication needed.",
    requests: [
      {
        name: "Get hotel settings", method: "GET", path: "/settings", expect: 200,
        tests: [json, 'pm.test("Has a currency", () => pm.expect(body.data.currency).to.be.a("string"));', saveVar("originalTagline", "body.data.tagline")],
      },
      { name: "List rooms", method: "GET", path: "/rooms", expect: 200, tests: [json, 'pm.test("data is an array", () => pm.expect(body.data).to.be.an("array"));'] },
      { name: "List rooms (filter by type)", method: "GET", path: "/rooms", query: { type: "double" }, expect: 200, tests: [json, 'pm.test("Only double rooms", () => body.data.forEach(r => pm.expect(r.type).to.eql("double")));'] },
      { name: "List rooms (invalid type -> 400)", method: "GET", path: "/rooms", query: { type: "castle" }, expect: 400, tests: [errorCode("VALIDATION_ERROR")] },
      { name: "Get unknown room -> 404", method: "GET", path: "/rooms/{{missingSlug}}", expect: 404, tests: [errorCode("ROOM_NOT_FOUND")] },
      { name: "List services", method: "GET", path: "/services", expect: 200, tests: [json, 'pm.test("data is an array", () => pm.expect(body.data).to.be.an("array"));'] },
      { name: "List gallery", method: "GET", path: "/gallery", expect: 200, tests: [json, 'pm.test("data is an array", () => pm.expect(body.data).to.be.an("array"));'] },
    ],
  },
  {
    name: "2. Authentication",
    description: "Set adminEmail and adminPassword in the Postman environment first (administrator created with `npm run admin:create`).",
    requests: [
      { name: "Login with wrong password -> 401", method: "POST", path: "/auth/login", body: { email: "{{adminEmail}}", password: "Wrong-Password-123" }, expect: 401, tests: [errorCode("INVALID_CREDENTIALS")] },
      { name: "Login with invalid body -> 400", method: "POST", path: "/auth/login", body: { email: "not-an-email" }, expect: 400, tests: [errorCode("VALIDATION_ERROR")] },
      {
        name: "Login (administrator)", method: "POST", path: "/auth/login", body: { email: "{{adminEmail}}", password: "{{adminPassword}}" }, expect: 200,
        tests: [json, 'pm.test("Token returned", () => pm.expect(body.data.token).to.be.a("string"));', 'pm.test("Password hash never exposed", () => pm.expect(JSON.stringify(body)).to.not.include("passwordHash"));', saveVar("adminToken", "body.data.token")],
      },
      { name: "Current administrator", method: "GET", path: "/auth/me", auth: "admin", expect: 200, tests: [json, 'pm.test("E-mail matches", () => pm.expect(body.data.email).to.eql(pm.environment.get("adminEmail").toLowerCase()));'] },
      { name: "Current administrator without token -> 401", method: "GET", path: "/auth/me", expect: 401, tests: [errorCode("UNAUTHORIZED")] },
      {
        name: "Change password with wrong current password -> 401 (password unchanged)", method: "POST", path: "/auth/change-password", auth: "admin",
        body: { currentPassword: "Wrong-Password-123", newPassword: "Another-Strong-Pass-456" }, expect: 401, tests: [errorCode("INVALID_CREDENTIALS")],
      },
    ],
  },
  {
    name: "3. Room management (admin)",
    description: "Creates a temporary test room with ONE unit, used by the booking scenarios and deleted at the end.",
    requests: [
      {
        name: "Create room without token -> 401", method: "POST", path: "/rooms", expect: 401,
        body: { name: "No auth room", type: "double", description: "Should never be created", capacity: 2, totalUnits: 1, pricePerNight: 100 },
      },
      {
        name: "Create room with invalid data -> 400", method: "POST", path: "/rooms", auth: "admin", expect: 400,
        body: { name: "x", type: "double", description: "short", capacity: 0, totalUnits: 1, pricePerNight: -5 },
        tests: [errorCode("VALIDATION_ERROR"), json, 'pm.test("Lists the invalid fields", () => pm.expect(body.error.details.length).to.be.above(1));'],
      },
      {
        name: "Create room (1 unit, 100 per night)", method: "POST", path: "/rooms", auth: "admin", expect: 201,
        pre: ['pm.collectionVariables.set("testSlug", "postman-room-" + Date.now());'],
        body: { name: "[DEMO] Postman test room", slug: "{{testSlug}}", type: "double", description: "[DEMO] Temporary room created by the Postman collection.", capacity: 2, totalUnits: 1, pricePerNight: 100, amenities: ["[DEMO] Amenity"], images: ["https://example.com/demo/postman-room.jpg"] },
        tests: [json, 'pm.test("Room is active", () => pm.expect(body.data.isActive).to.eql(true));', saveVar("roomId", "body.data.id"), saveVar("roomSlug", "body.data.slug")],
      },
      {
        name: "Create room with an unknown field -> 400 (mass assignment blocked)", method: "POST", path: "/rooms", auth: "admin", expect: 400,
        body: { name: "[DEMO] Bad room", type: "double", description: "[DEMO] Contains an unknown field", capacity: 2, totalUnits: 1, pricePerNight: 100, isDemo: true },
        tests: [errorCode("VALIDATION_ERROR")],
      },
      { name: "Get room by slug", method: "GET", path: "/rooms/{{roomSlug}}", expect: 200, tests: [json, 'pm.test("Same room", () => pm.expect(body.data.id).to.eql(pm.collectionVariables.get("roomId")));'] },
      { name: "Get room by id", method: "GET", path: "/rooms/{{roomId}}", expect: 200 },
      { name: "Update room price", method: "PATCH", path: "/rooms/{{roomId}}", auth: "admin", body: { pricePerNight: 120 }, expect: 200, tests: [json, 'pm.test("Price updated", () => pm.expect(body.data.pricePerNight).to.eql(120));'] },
      { name: "Update room with invalid id -> 400", method: "PATCH", path: "/rooms/{{invalidId}}", auth: "admin", body: { pricePerNight: 130 }, expect: 400, tests: [errorCode("VALIDATION_ERROR")] },
      { name: "Update room with empty body -> 400", method: "PATCH", path: "/rooms/{{roomId}}", auth: "admin", body: {}, expect: 400 },
      { name: "List rooms including inactive (admin)", method: "GET", path: "/rooms", query: { includeInactive: "true" }, auth: "admin", expect: 200, tests: [json, 'pm.test("Test room present", () => pm.expect(body.data.map(r => r.id)).to.include(pm.collectionVariables.get("roomId")));'] },
    ],
  },
  {
    name: "4. Availability and bookings",
    description: "Dates are computed automatically (30 days from today, 3 nights). The test room has a single unit, so the second booking must fail.",
    requests: [
      {
        name: "Search availability", method: "GET", path: "/availability", expect: 200,
        query: { checkIn: "{{checkIn}}", checkOut: "{{checkOut}}", adults: "2", children: "0", roomId: "{{roomId}}" },
        tests: [json, 'pm.test("Room is available", () => { pm.expect(body.data.rooms[0].available).to.eql(true); pm.expect(body.data.rooms[0].remainingUnits).to.eql(1); });', 'pm.test("Server-side price: 3 nights x 120", () => { pm.expect(body.data.rooms[0].pricing.nights).to.eql(3); pm.expect(body.data.rooms[0].pricing.subtotal).to.eql(360); });'],
      },
      { name: "Search availability with checkOut before checkIn -> 400", method: "GET", path: "/availability", query: { checkIn: "{{checkOut}}", checkOut: "{{checkIn}}" }, expect: 400, tests: [errorCode("VALIDATION_ERROR")] },
      { name: "Search availability without dates -> 400", method: "GET", path: "/availability", expect: 400 },
      {
        name: "Create booking", method: "POST", path: "/bookings", expect: 201,
        body: { roomId: "{{roomId}}", checkIn: "{{checkIn}}", checkOut: "{{checkOut}}", adults: 2, children: 0, guest, specialRequests: "[DEMO] Postman test booking" },
        tests: [json, 'pm.test("Starts as pending", () => pm.expect(body.data.status).to.eql("pending"));', 'pm.test("Price computed by the server", () => { const p = body.data.pricing; pm.expect(p.subtotal).to.eql(p.nightlyRate * p.nights); pm.expect(p.total).to.eql(+(p.subtotal + p.taxAmount + p.touristTax).toFixed(3)); });', saveVar("bookingId", "body.data.id"), saveVar("bookingReference", "body.data.reference")],
      },
      {
        name: "Create booking with a client-supplied price -> 400", method: "POST", path: "/bookings", expect: 400,
        body: { roomId: "{{roomId}}", checkIn: "{{checkIn}}", checkOut: "{{checkOut}}", adults: 1, guest, pricing: { total: 1 } },
        tests: [errorCode("VALIDATION_ERROR")],
      },
      {
        name: "Create booking for the same dates -> 409 (double booking prevented)", method: "POST", path: "/bookings", expect: 409,
        body: { roomId: "{{roomId}}", checkIn: "{{checkIn}}", checkOut: "{{checkOut}}", adults: 1, guest: { ...guest, email: "other.guest@example.com" } },
        tests: [errorCode("ROOM_UNAVAILABLE")],
      },
      {
        name: "Create booking over room capacity -> 422", method: "POST", path: "/bookings", expect: 422,
        body: { roomId: "{{roomId}}", checkIn: "{{checkIn}}", checkOut: "{{checkOut}}", adults: 5, guest },
        tests: [errorCode("CAPACITY_EXCEEDED")],
      },
      {
        name: "Create booking in the past -> 400", method: "POST", path: "/bookings", expect: 400,
        body: { roomId: "{{roomId}}", checkIn: "2020-01-01", checkOut: "2020-01-03", adults: 1, guest },
        tests: [errorCode("INVALID_DATES")],
      },
      {
        name: "Search availability again (room now full)", method: "GET", path: "/availability", expect: 200,
        query: { checkIn: "{{checkIn}}", checkOut: "{{checkOut}}", adults: "2", roomId: "{{roomId}}" },
        tests: [json, 'pm.test("No unit left", () => { pm.expect(body.data.rooms[0].available).to.eql(false); pm.expect(body.data.rooms[0].remainingUnits).to.eql(0); });'],
      },
      { name: "Guest looks up the booking", method: "POST", path: "/bookings/lookup", body: { reference: "{{bookingReference}}", email: guest.email }, expect: 200, tests: [json, 'pm.test("Same booking", () => pm.expect(body.data.id).to.eql(pm.collectionVariables.get("bookingId")));'] },
      { name: "Look up with the wrong e-mail -> 404", method: "POST", path: "/bookings/lookup", body: { reference: "{{bookingReference}}", email: "wrong.person@example.com" }, expect: 404, tests: [errorCode("BOOKING_NOT_FOUND")] },
    ],
  },
  {
    name: "5. Contact messages (public)",
    description: "Public form submission.",
    requests: [
      {
        name: "Send a contact message", method: "POST", path: "/contact-messages", expect: 201,
        body: { name: "Demo Visitor", email: "demo.visitor@example.com", subject: "[DEMO] Question", message: "[DEMO] This is a test message sent from Postman." },
        tests: [json, saveVar("messageId", "body.data.id")],
      },
      { name: "Send an invalid contact message -> 400", method: "POST", path: "/contact-messages", body: { name: "A", email: "nope", subject: "", message: "short" }, expect: 400, tests: [errorCode("VALIDATION_ERROR")] },
      { name: "Send malformed JSON -> 400", method: "POST", path: "/contact-messages", rawBody: "{ \"name\": ", expect: 400, tests: [errorCode("INVALID_JSON")] },
    ],
  },
  {
    name: "6. Administrator operations",
    description: "Bookings, messages, settings, services, gallery, then cleanup of the test room.",
    requests: [
      { name: "List bookings (filtered by reference)", method: "GET", path: "/bookings", query: { reference: "{{bookingReference}}" }, auth: "admin", expect: 200, tests: [json, 'pm.test("Found the booking", () => pm.expect(body.data.length).to.eql(1));', 'pm.test("Pagination meta", () => pm.expect(body.meta.total).to.eql(1));'] },
      { name: "Get booking by id", method: "GET", path: "/bookings/{{bookingId}}", auth: "admin", expect: 200 },
      { name: "Confirm booking", method: "PATCH", path: "/bookings/{{bookingId}}/status", auth: "admin", body: { status: "confirmed" }, expect: 200, tests: [json, 'pm.test("Confirmed", () => pm.expect(body.data.status).to.eql("confirmed"));'] },
      { name: "Confirm again -> 409 (invalid transition)", method: "PATCH", path: "/bookings/{{bookingId}}/status", auth: "admin", body: { status: "confirmed" }, expect: 409, tests: [errorCode("INVALID_STATUS_TRANSITION")] },
      { name: "Delete room with an upcoming booking -> 409", method: "DELETE", path: "/rooms/{{roomId}}", auth: "admin", expect: 409, tests: [errorCode("ROOM_HAS_BOOKINGS")] },
      { name: "Cancel booking (frees the nights)", method: "PATCH", path: "/bookings/{{bookingId}}/status", auth: "admin", body: { status: "cancelled", reason: "[DEMO] Postman cleanup" }, expect: 200, tests: [json, 'pm.test("Cancelled", () => pm.expect(body.data.status).to.eql("cancelled"));'] },
      {
        name: "Search availability after cancellation (room free again)", method: "GET", path: "/availability", expect: 200,
        query: { checkIn: "{{checkIn}}", checkOut: "{{checkOut}}", adults: "2", roomId: "{{roomId}}" },
        tests: [json, 'pm.test("Available again", () => pm.expect(body.data.rooms[0].available).to.eql(true));'],
      },
      { name: "List contact messages", method: "GET", path: "/contact-messages", query: { status: "new" }, auth: "admin", expect: 200, tests: [json, 'pm.test("Contains our message", () => pm.expect(body.data.map(m => m.id)).to.include(pm.collectionVariables.get("messageId")));'] },
      { name: "Get contact message", method: "GET", path: "/contact-messages/{{messageId}}", auth: "admin", expect: 200 },
      { name: "Mark contact message as read", method: "PATCH", path: "/contact-messages/{{messageId}}", auth: "admin", body: { status: "read" }, expect: 200, tests: [json, 'pm.test("Read", () => pm.expect(body.data.status).to.eql("read"));'] },
      { name: "Delete contact message", method: "DELETE", path: "/contact-messages/{{messageId}}", auth: "admin", expect: 204 },
      { name: "Get deleted contact message -> 404", method: "GET", path: "/contact-messages/{{messageId}}", auth: "admin", expect: 404, tests: [errorCode("MESSAGE_NOT_FOUND")] },
      { name: "Update hotel settings (temporary tagline)", method: "PUT", path: "/settings", auth: "admin", body: { tagline: "[DEMO] Postman test tagline" }, expect: 200, tests: [json, 'pm.test("Updated", () => pm.expect(body.data.tagline).to.eql("[DEMO] Postman test tagline"));'] },
      { name: "Restore the original tagline", method: "PUT", path: "/settings", auth: "admin", body: { tagline: "{{originalTagline}}" }, expect: 200 },
      { name: "Update settings with invalid data -> 400", method: "PUT", path: "/settings", auth: "admin", body: { taxRatePercent: 500, checkInTime: "25:99" }, expect: 400, tests: [errorCode("VALIDATION_ERROR")] },
      {
        name: "Create service", method: "POST", path: "/services", auth: "admin", expect: 201,
        body: { name: "[DEMO] Postman service", description: "[DEMO] Temporary service", category: "other", order: 99 },
        tests: [json, saveVar("serviceId", "body.data.id")],
      },
      { name: "Update service", method: "PATCH", path: "/services/{{serviceId}}", auth: "admin", body: { isActive: false }, expect: 200, tests: [json, 'pm.test("Deactivated", () => pm.expect(body.data.isActive).to.eql(false));'] },
      { name: "Delete service", method: "DELETE", path: "/services/{{serviceId}}", auth: "admin", expect: 204 },
      {
        name: "Create gallery image", method: "POST", path: "/gallery", auth: "admin", expect: 201,
        body: { title: "[DEMO] Postman image", imageUrl: "https://example.com/demo/postman.jpg", category: "other", order: 99 },
        tests: [json, saveVar("galleryId", "body.data.id")],
      },
      { name: "Update gallery image", method: "PATCH", path: "/gallery/{{galleryId}}", auth: "admin", body: { caption: "[DEMO] Updated caption" }, expect: 200 },
      { name: "Delete gallery image", method: "DELETE", path: "/gallery/{{galleryId}}", auth: "admin", expect: 204 },
      { name: "Delete the test room (cleanup)", method: "DELETE", path: "/rooms/{{roomId}}", auth: "admin", expect: 204 },
      { name: "Get deleted room -> 404", method: "GET", path: "/rooms/{{roomSlug}}", expect: 404 },
    ],
  },
  {
    name: "7. Authorization failures",
    description: "Every protected endpoint must refuse missing or invalid tokens.",
    requests: [
      { name: "List bookings without token -> 401", method: "GET", path: "/bookings", expect: 401, tests: [errorCode("UNAUTHORIZED")] },
      { name: "Get booking without token -> 401", method: "GET", path: "/bookings/{{bookingId}}", expect: 401 },
      { name: "Change booking status without token -> 401", method: "PATCH", path: "/bookings/{{bookingId}}/status", body: { status: "confirmed" }, expect: 401 },
      { name: "Update room without token -> 401", method: "PATCH", path: "/rooms/{{roomId}}", body: { pricePerNight: 1 }, expect: 401 },
      { name: "Delete room without token -> 401", method: "DELETE", path: "/rooms/{{roomId}}", expect: 401 },
      { name: "Update settings without token -> 401", method: "PUT", path: "/settings", body: { tagline: "hacked" }, expect: 401 },
      { name: "Create service without token -> 401", method: "POST", path: "/services", body: { name: "x", description: "xxxxx", category: "other" }, expect: 401 },
      { name: "Update service without token -> 401", method: "PATCH", path: "/services/{{serviceId}}", body: { isActive: false }, expect: 401 },
      { name: "Delete service without token -> 401", method: "DELETE", path: "/services/{{serviceId}}", expect: 401 },
      { name: "Update gallery image without token -> 401", method: "PATCH", path: "/gallery/{{galleryId}}", body: { caption: "x" }, expect: 401 },
      { name: "Delete gallery image without token -> 401", method: "DELETE", path: "/gallery/{{galleryId}}", expect: 401 },
      { name: "Create gallery image with an invalid token -> 401", method: "POST", path: "/gallery", auth: "invalid", body: { title: "x", imageUrl: "https://example.com/x.jpg", category: "other" }, expect: 401, tests: [errorCode("INVALID_TOKEN")] },
      { name: "List contact messages with an invalid token -> 401", method: "GET", path: "/contact-messages", auth: "invalid", expect: 401, tests: [errorCode("INVALID_TOKEN")] },
      { name: "Get contact message without token -> 401", method: "GET", path: "/contact-messages/{{messageId}}", expect: 401 },
      { name: "Update contact message without token -> 401", method: "PATCH", path: "/contact-messages/{{messageId}}", body: { status: "read" }, expect: 401 },
      { name: "Delete contact message without token -> 401", method: "DELETE", path: "/contact-messages/{{messageId}}", expect: 401 },
      { name: "Change password without token -> 401", method: "POST", path: "/auth/change-password", body: { currentPassword: "x", newPassword: "Another-Strong-Pass-456" }, expect: 401 },
    ],
  },
  {
    name: "8. Optional AI assistant",
    description: "Returns 503 AI_DISABLED when AI_ENABLED=false (default), 200 when enabled. Both are valid outcomes.",
    requests: [
      { name: "Ask the AI concierge", method: "POST", path: "/ai/assistant", body: { message: "What time is check-in?" }, expect: [200, 503] },
      { name: "Ask the AI concierge with an empty message -> 400", method: "POST", path: "/ai/assistant", body: { message: "" }, expect: 400, tests: [errorCode("VALIDATION_ERROR")] },
    ],
  },
];

const COLLECTION_VARIABLES = {
  adminToken: "",
  roomId: "",
  roomSlug: "",
  testSlug: "",
  bookingId: "",
  bookingReference: "",
  messageId: "",
  serviceId: "",
  galleryId: "",
  originalTagline: "[DEMO] Replace this tagline",
  missingSlug: "room-that-does-not-exist",
  invalidId: "not-an-id",
  checkIn: "",
  checkOut: "",
};

const ENVIRONMENT_VARIABLES = ["baseUrl", "adminEmail", "adminPassword"];

function buildCollection() {
  return {
    info: {
      name: "Hotel Menara Hammamet API",
      description:
        "Run the folders in order (right-click the collection > Run). Needs the Postman environment 'Hotel Menara - Local' with adminEmail and adminPassword filled in. All data is DEMO data; the test room is deleted at the end of folder 6.",
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    event: [
      {
        listen: "prerequest",
        script: script([
          "// Stay dates: 30 days from today, 3 nights (always in the future).",
          "const fmt = (d) => d.toISOString().slice(0, 10);",
          "const start = new Date();",
          "start.setUTCDate(start.getUTCDate() + 30);",
          'pm.collectionVariables.set("checkIn", fmt(start));',
          "start.setUTCDate(start.getUTCDate() + 3);",
          'pm.collectionVariables.set("checkOut", fmt(start));',
        ]),
      },
    ],
    variable: Object.entries(COLLECTION_VARIABLES).map(([key, value]) => ({ key, value, type: "string" })),
    item: folders.map((folder) => ({ name: folder.name, description: folder.description, item: folder.requests.map(buildItem) })),
  };
}

function buildEnvironment() {
  return {
    name: "Hotel Menara - Local",
    values: [
      { key: "baseUrl", value: "http://localhost:4000/api/v1", type: "default", enabled: true },
      { key: "adminEmail", value: "", type: "default", enabled: true },
      { key: "adminPassword", value: "", type: "secret", enabled: true },
    ],
    _postman_variable_scope: "environment",
  };
}

module.exports = {
  COLLECTION_VARIABLES,
  ENVIRONMENT_VARIABLES,
  buildCollection,
  buildEnvironment,
};
