const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const jsonBody = (schema, required = true) => ({ required, content: { "application/json": { schema } } });
const idParam = (name = "id", description = "MongoDB ObjectId") => ({
  name,
  in: "path",
  required: true,
  description,
  schema: { type: "string", pattern: "^[a-f0-9]{24}$" },
});
const queryParam = (name, schema, description = "", required = false) => ({
  name,
  in: "query",
  required,
  description,
  schema,
});

const errorResponse = (description) => ({ description, content: { "application/json": { schema: ref("Error") } } });
const ok = (description, data) => ({
  description,
  content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean", example: true }, data, meta: { type: "object" } } } } },
});
const noContent = { description: "Deleted" };

const secured = [{ bearerAuth: [] }];
const e400 = errorResponse("Validation error");
const e401 = errorResponse("Missing or invalid token");
const e404 = errorResponse("Not found");
const e409 = errorResponse("Conflict");

const roomProps = {
  name: { type: "string", example: "[DEMO] Standard Room" },
  slug: { type: "string", example: "demo-standard-room" },
  type: { type: "string", enum: ["single", "double", "twin", "family", "suite"] },
  description: { type: "string" },
  capacity: { type: "integer", minimum: 1, maximum: 10, description: "Max guests (adults + children)" },
  totalUnits: { type: "integer", minimum: 1, description: "Number of identical rooms of this type" },
  pricePerNight: { type: "number", example: 100 },
  amenities: { type: "array", items: { type: "string" } },
  images: { type: "array", items: { type: "string", format: "uri" } },
  isActive: { type: "boolean" },
};

const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Hotel Menara Hammamet API",
    version: "1.0.0",
    description:
      "REST API for the Hotel Menara Hammamet website. All sample data is DEMO data. Admin endpoints need `Authorization: Bearer <token>` obtained from POST /auth/login.",
  },
  servers: [{ url: "/api/v1", description: "This server" }],
  tags: [
    { name: "System" }, { name: "Auth" }, { name: "Settings" }, { name: "Rooms" }, { name: "Services" },
    { name: "Gallery" }, { name: "Availability" }, { name: "Bookings" }, { name: "Contact" }, { name: "AI" },
  ],
  components: {
    securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } },
    schemas: {
      Error: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          error: {
            type: "object",
            properties: { code: { type: "string", example: "VALIDATION_ERROR" }, message: { type: "string" }, details: { type: "array", items: { type: "object" } } },
          },
        },
      },
      Room: { type: "object", properties: { id: { type: "string" }, ...roomProps, createdAt: { type: "string", format: "date-time" } } },
      RoomInput: { type: "object", required: ["name", "type", "description", "capacity", "totalUnits", "pricePerNight"], properties: roomProps },
      Service: {
        type: "object",
        properties: {
          id: { type: "string" }, name: { type: "string" }, description: { type: "string" },
          category: { type: "string", enum: ["dining", "wellness", "leisure", "transport", "business", "other"] },
          icon: { type: "string" }, order: { type: "integer" }, isActive: { type: "boolean" },
        },
      },
      ServiceInput: {
        type: "object", required: ["name", "description", "category"],
        properties: {
          name: { type: "string" }, description: { type: "string" },
          category: { type: "string", enum: ["dining", "wellness", "leisure", "transport", "business", "other"] },
          icon: { type: "string" }, order: { type: "integer" }, isActive: { type: "boolean" },
        },
      },
      GalleryItem: {
        type: "object",
        properties: {
          id: { type: "string" }, title: { type: "string" }, caption: { type: "string" }, imageUrl: { type: "string", format: "uri" },
          category: { type: "string", enum: ["rooms", "dining", "pool", "exterior", "events", "other"] },
          order: { type: "integer" }, isActive: { type: "boolean" },
        },
      },
      GalleryInput: {
        type: "object", required: ["title", "imageUrl", "category"],
        properties: {
          title: { type: "string" }, caption: { type: "string" }, imageUrl: { type: "string", format: "uri" },
          category: { type: "string", enum: ["rooms", "dining", "pool", "exterior", "events", "other"] },
          order: { type: "integer" }, isActive: { type: "boolean" },
        },
      },
      Settings: {
        type: "object",
        properties: {
          hotelName: { type: "string" }, tagline: { type: "string" }, description: { type: "string" },
          address: { type: "object", properties: { street: { type: "string" }, city: { type: "string" }, country: { type: "string" } } },
          contact: { type: "object", properties: { phone: { type: "string" }, email: { type: "string", format: "email" } } },
          socialLinks: { type: "object", properties: { facebook: { type: "string", format: "uri" }, instagram: { type: "string", format: "uri" } } },
          checkInTime: { type: "string", example: "14:00" }, checkOutTime: { type: "string", example: "12:00" },
          currency: { type: "string", example: "TND" }, taxRatePercent: { type: "number" },
          touristTaxPerAdultPerNight: { type: "number" }, maxStayNights: { type: "integer" },
          cancellationPolicy: { type: "string" }, isBookingEnabled: { type: "boolean" },
        },
      },
      LoginInput: { type: "object", required: ["email", "password"], properties: { email: { type: "string", format: "email" }, password: { type: "string" } } },
      LoginResult: {
        type: "object",
        properties: { token: { type: "string" }, tokenType: { type: "string", example: "Bearer" }, expiresInSeconds: { type: "integer" }, admin: { type: "object" } },
      },
      ChangePasswordInput: {
        type: "object", required: ["currentPassword", "newPassword"],
        properties: { currentPassword: { type: "string" }, newPassword: { type: "string", minLength: 12, description: "12+ chars with upper, lower and digit" } },
      },
      Pricing: {
        type: "object",
        properties: {
          currency: { type: "string" }, nightlyRate: { type: "number" }, nights: { type: "integer" }, subtotal: { type: "number" },
          taxRatePercent: { type: "number" }, taxAmount: { type: "number" }, touristTax: { type: "number" }, total: { type: "number" },
        },
      },
      AvailabilityResult: {
        type: "object",
        properties: {
          checkIn: { type: "string" }, checkOut: { type: "string" }, nights: { type: "integer" }, currency: { type: "string" },
          rooms: {
            type: "array",
            items: { type: "object", properties: { room: ref("Room"), available: { type: "boolean" }, remainingUnits: { type: "integer" }, pricing: ref("Pricing") } },
          },
        },
      },
      BookingInput: {
        type: "object", required: ["roomId", "checkIn", "checkOut", "adults", "guest"],
        description: "The total price is always computed by the server; any price sent by the client is rejected.",
        properties: {
          roomId: { type: "string" }, checkIn: { type: "string", format: "date", example: "2030-06-10" },
          checkOut: { type: "string", format: "date", example: "2030-06-13" },
          adults: { type: "integer", minimum: 1 }, children: { type: "integer", minimum: 0, default: 0 },
          guest: {
            type: "object", required: ["firstName", "lastName", "email", "phone"],
            properties: { firstName: { type: "string" }, lastName: { type: "string" }, email: { type: "string", format: "email" }, phone: { type: "string" } },
          },
          specialRequests: { type: "string", maxLength: 1000 },
        },
      },
      Booking: {
        type: "object",
        properties: {
          id: { type: "string" }, reference: { type: "string", example: "MEN-7K3P9Q2X" }, room: { type: "string" }, roomName: { type: "string" },
          guest: { type: "object" }, checkIn: { type: "string", format: "date-time" }, checkOut: { type: "string", format: "date-time" },
          nights: { type: "integer" }, adults: { type: "integer" }, children: { type: "integer" }, pricing: ref("Pricing"),
          status: { type: "string", enum: ["pending", "confirmed", "cancelled", "completed"] },
        },
      },
      BookingLookupInput: {
        type: "object", required: ["reference", "email"],
        properties: { reference: { type: "string", example: "MEN-7K3P9Q2X" }, email: { type: "string", format: "email" } },
      },
      BookingStatusInput: {
        type: "object", required: ["status"],
        properties: { status: { type: "string", enum: ["confirmed", "cancelled", "completed"] }, reason: { type: "string", maxLength: 300 } },
      },
      ContactInput: {
        type: "object", required: ["name", "email", "subject", "message"],
        properties: {
          name: { type: "string" }, email: { type: "string", format: "email" }, phone: { type: "string" },
          subject: { type: "string" }, message: { type: "string", minLength: 10, maxLength: 2000 },
        },
      },
      ContactMessage: {
        type: "object",
        properties: {
          id: { type: "string" }, name: { type: "string" }, email: { type: "string" }, phone: { type: "string" },
          subject: { type: "string" }, message: { type: "string" }, status: { type: "string", enum: ["new", "read", "archived"] },
        },
      },
      ContactStatusInput: { type: "object", required: ["status"], properties: { status: { type: "string", enum: ["new", "read", "archived"] } } },
      AssistantInput: {
        type: "object", required: ["message"],
        properties: {
          message: { type: "string", maxLength: 500 },
          history: { type: "array", maxItems: 6, items: { type: "object", properties: { role: { type: "string", enum: ["user", "assistant"] }, content: { type: "string" } } } },
        },
      },
    },
  },
  paths: {
    "/health": {
      get: { tags: ["System"], summary: "Health check", responses: { 200: ok("API and database are up", { type: "object" }), 503: errorResponse("Database disconnected") } },
    },

    "/auth/login": {
      post: {
        tags: ["Auth"], summary: "Administrator login",
        requestBody: jsonBody(ref("LoginInput")),
        responses: { 200: ok("JWT issued", ref("LoginResult")), 400: e400, 401: errorResponse("Invalid credentials"), 429: errorResponse("Rate limited") },
      },
    },
    "/auth/me": {
      get: { tags: ["Auth"], summary: "Current administrator", security: secured, responses: { 200: ok("Profile", { type: "object" }), 401: e401 } },
    },
    "/auth/change-password": {
      post: {
        tags: ["Auth"], summary: "Change password (invalidates existing tokens)", security: secured,
        requestBody: jsonBody(ref("ChangePasswordInput")),
        responses: { 200: ok("Password changed", { type: "object" }), 400: e400, 401: e401 },
      },
    },

    "/settings": {
      get: { tags: ["Settings"], summary: "Public hotel settings", responses: { 200: ok("Settings", ref("Settings")) } },
      put: {
        tags: ["Settings"], summary: "Update hotel settings (partial, admin)", security: secured,
        requestBody: jsonBody(ref("Settings")),
        responses: { 200: ok("Updated settings", ref("Settings")), 400: e400, 401: e401 },
      },
    },

    "/rooms": {
      get: {
        tags: ["Rooms"], summary: "List rooms",
        description: "Public visitors only see active rooms. An administrator token plus includeInactive=true also returns inactive rooms.",
        parameters: [
          queryParam("type", { type: "string", enum: ["single", "double", "twin", "family", "suite"] }),
          queryParam("capacity", { type: "integer" }, "Minimum number of guests"),
          queryParam("includeInactive", { type: "boolean" }, "Admin only"),
        ],
        responses: { 200: ok("Rooms", { type: "array", items: ref("Room") }), 400: e400 },
      },
      post: {
        tags: ["Rooms"], summary: "Create a room (admin)", security: secured,
        requestBody: jsonBody(ref("RoomInput")),
        responses: { 201: ok("Created", ref("Room")), 400: e400, 401: e401, 409: e409 },
      },
    },
    "/rooms/{idOrSlug}": {
      get: {
        tags: ["Rooms"], summary: "Get a room by id or slug",
        parameters: [idParam("idOrSlug", "Room id or slug")],
        responses: { 200: ok("Room", ref("Room")), 404: e404 },
      },
    },
    "/rooms/{id}": {
      patch: {
        tags: ["Rooms"], summary: "Update a room (admin)", security: secured, parameters: [idParam()],
        requestBody: jsonBody(ref("RoomInput")),
        responses: { 200: ok("Updated", ref("Room")), 400: e400, 401: e401, 404: e404 },
      },
      delete: {
        tags: ["Rooms"], summary: "Delete a room (admin). Refused while upcoming pending/confirmed bookings exist.", security: secured, parameters: [idParam()],
        responses: { 204: noContent, 401: e401, 404: e404, 409: e409 },
      },
    },

    "/services": {
      get: {
        tags: ["Services"], summary: "List hotel services",
        parameters: [queryParam("category", { type: "string" }), queryParam("includeInactive", { type: "boolean" }, "Admin only")],
        responses: { 200: ok("Services", { type: "array", items: ref("Service") }) },
      },
      post: {
        tags: ["Services"], summary: "Create a service (admin)", security: secured,
        requestBody: jsonBody(ref("ServiceInput")),
        responses: { 201: ok("Created", ref("Service")), 400: e400, 401: e401 },
      },
    },
    "/services/{id}": {
      patch: {
        tags: ["Services"], summary: "Update a service (admin)", security: secured, parameters: [idParam()],
        requestBody: jsonBody(ref("ServiceInput")),
        responses: { 200: ok("Updated", ref("Service")), 400: e400, 401: e401, 404: e404 },
      },
      delete: { tags: ["Services"], summary: "Delete a service (admin)", security: secured, parameters: [idParam()], responses: { 204: noContent, 401: e401, 404: e404 } },
    },

    "/gallery": {
      get: {
        tags: ["Gallery"], summary: "List gallery images",
        parameters: [queryParam("category", { type: "string" }), queryParam("includeInactive", { type: "boolean" }, "Admin only")],
        responses: { 200: ok("Gallery", { type: "array", items: ref("GalleryItem") }) },
      },
      post: {
        tags: ["Gallery"], summary: "Add a gallery image by URL (admin)", security: secured,
        requestBody: jsonBody(ref("GalleryInput")),
        responses: { 201: ok("Created", ref("GalleryItem")), 400: e400, 401: e401 },
      },
    },
    "/gallery/{id}": {
      patch: {
        tags: ["Gallery"], summary: "Update a gallery image (admin)", security: secured, parameters: [idParam()],
        requestBody: jsonBody(ref("GalleryInput")),
        responses: { 200: ok("Updated", ref("GalleryItem")), 400: e400, 401: e401, 404: e404 },
      },
      delete: { tags: ["Gallery"], summary: "Delete a gallery image (admin)", security: secured, parameters: [idParam()], responses: { 204: noContent, 401: e401, 404: e404 } },
    },

    "/availability": {
      get: {
        tags: ["Availability"], summary: "Search available rooms with server-side prices",
        parameters: [
          queryParam("checkIn", { type: "string", format: "date" }, "YYYY-MM-DD", true),
          queryParam("checkOut", { type: "string", format: "date" }, "YYYY-MM-DD (not included in the stay)", true),
          queryParam("adults", { type: "integer", default: 1 }),
          queryParam("children", { type: "integer", default: 0 }),
          queryParam("roomType", { type: "string", enum: ["single", "double", "twin", "family", "suite"] }),
          queryParam("roomId", { type: "string" }),
        ],
        responses: { 200: ok("Availability", ref("AvailabilityResult")), 400: e400 },
      },
    },

    "/bookings": {
      post: {
        tags: ["Bookings"], summary: "Create a booking (public, status pending)",
        requestBody: jsonBody(ref("BookingInput")),
        responses: {
          201: ok("Booking created", ref("Booking")), 400: e400, 404: e404,
          409: errorResponse("ROOM_UNAVAILABLE: no unit left for at least one night"),
          422: errorResponse("CAPACITY_EXCEEDED"),
        },
      },
      get: {
        tags: ["Bookings"], summary: "List bookings (admin)", security: secured,
        parameters: [
          queryParam("status", { type: "string", enum: ["pending", "confirmed", "cancelled", "completed"] }),
          queryParam("roomId", { type: "string" }), queryParam("reference", { type: "string" }), queryParam("email", { type: "string" }),
          queryParam("checkInFrom", { type: "string", format: "date" }), queryParam("checkInTo", { type: "string", format: "date" }),
          queryParam("page", { type: "integer", default: 1 }), queryParam("limit", { type: "integer", default: 20, maximum: 100 }),
        ],
        responses: { 200: ok("Bookings", { type: "array", items: ref("Booking") }), 400: e400, 401: e401 },
      },
    },
    "/bookings/lookup": {
      post: {
        tags: ["Bookings"], summary: "Guest looks up a booking with reference + e-mail",
        requestBody: jsonBody(ref("BookingLookupInput")),
        responses: { 200: ok("Booking", ref("Booking")), 400: e400, 404: e404 },
      },
    },
    "/bookings/{id}": {
      get: { tags: ["Bookings"], summary: "Get a booking (admin)", security: secured, parameters: [idParam()], responses: { 200: ok("Booking", ref("Booking")), 401: e401, 404: e404 } },
    },
    "/bookings/{id}/status": {
      patch: {
        tags: ["Bookings"], summary: "Confirm / cancel / complete a booking (admin). Cancelling frees the nights.", security: secured, parameters: [idParam()],
        requestBody: jsonBody(ref("BookingStatusInput")),
        responses: { 200: ok("Updated booking", ref("Booking")), 400: e400, 401: e401, 404: e404, 409: errorResponse("INVALID_STATUS_TRANSITION") },
      },
    },

    "/contact-messages": {
      post: {
        tags: ["Contact"], summary: "Send a contact message (public)",
        requestBody: jsonBody(ref("ContactInput")),
        responses: { 201: ok("Received", { type: "object" }), 400: e400 },
      },
      get: {
        tags: ["Contact"], summary: "List contact messages (admin)", security: secured,
        parameters: [
          queryParam("status", { type: "string", enum: ["new", "read", "archived"] }),
          queryParam("page", { type: "integer", default: 1 }), queryParam("limit", { type: "integer", default: 20 }),
        ],
        responses: { 200: ok("Messages", { type: "array", items: ref("ContactMessage") }), 401: e401 },
      },
    },
    "/contact-messages/{id}": {
      get: { tags: ["Contact"], summary: "Get a contact message (admin)", security: secured, parameters: [idParam()], responses: { 200: ok("Message", ref("ContactMessage")), 401: e401, 404: e404 } },
      patch: {
        tags: ["Contact"], summary: "Change message status (admin)", security: secured, parameters: [idParam()],
        requestBody: jsonBody(ref("ContactStatusInput")),
        responses: { 200: ok("Updated", ref("ContactMessage")), 400: e400, 401: e401, 404: e404 },
      },
      delete: { tags: ["Contact"], summary: "Delete a contact message (admin)", security: secured, parameters: [idParam()], responses: { 204: noContent, 401: e401, 404: e404 } },
    },

    "/ai/assistant": {
      post: {
        tags: ["AI"], summary: "Ask the AI concierge (optional feature)",
        description: "Answers 503 AI_DISABLED unless AI_ENABLED=true. Answers are grounded only in the hotel data stored in the database.",
        requestBody: jsonBody(ref("AssistantInput")),
        responses: { 200: ok("Answer", { type: "object", properties: { answer: { type: "string" } } }), 400: e400, 502: errorResponse("OpenAI unavailable"), 503: errorResponse("AI disabled") },
      },
    },
  },
};

module.exports = {
  openApiSpec,
};
