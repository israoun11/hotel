/** Shared enumerations. Kept free of dependencies so validation schemas and models can both import them. */
const ROOM_TYPES = ["single", "double", "twin", "family", "suite"];

const SERVICE_CATEGORIES = ["dining", "wellness", "leisure", "transport", "business", "other"];

const GALLERY_CATEGORIES = ["rooms", "dining", "pool", "exterior", "events", "other"];

const BOOKING_STATUSES = ["pending", "confirmed", "cancelled", "completed"];

const MESSAGE_STATUSES = ["new", "read", "archived"];

module.exports = {
  ROOM_TYPES,
  SERVICE_CATEGORIES,
  GALLERY_CATEGORIES,
  BOOKING_STATUSES,
  MESSAGE_STATUSES,
};
