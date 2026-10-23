const { z } = require("zod");
const { BOOKING_STATUSES, ROOM_TYPES } = require("../constants");
const { parseISODate } = require("../utils/dates");
const { emailField, isoDate, objectId, paginationQuery, phoneField } = require("./common");

const checkOutAfterCheckIn = (value) => {
  const checkIn = parseISODate(value.checkIn);
  const checkOut = parseISODate(value.checkOut);
  return checkIn !== null && checkOut !== null && checkOut.getTime() > checkIn.getTime();
};
const checkOutMessage = { message: "checkOut must be after checkIn", path: ["checkOut"] };

const availabilityQuery = z
  .object({
    checkIn: isoDate,
    checkOut: isoDate,
    adults: z.coerce.number().int().min(1).max(10).default(1),
    children: z.coerce.number().int().min(0).max(10).default(0),
    roomType: z.enum(ROOM_TYPES).optional(),
    roomId: objectId.optional(),
  })
  .strict()
  .refine(checkOutAfterCheckIn, checkOutMessage);

const createBookingBody = z
  .object({
    roomId: objectId,
    checkIn: isoDate,
    checkOut: isoDate,
    adults: z.number().int().min(1).max(10),
    children: z.number().int().min(0).max(10).default(0),
    guest: z
      .object({
        firstName: z.string().trim().min(1).max(80),
        lastName: z.string().trim().min(1).max(80),
        email: emailField,
        phone: phoneField,
      })
      .strict(),
    specialRequests: z.string().trim().max(1000).optional(),
  })
  .strict()
  .refine(checkOutAfterCheckIn, checkOutMessage);

const lookupBookingBody = z
  .object({
    reference: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^MEN-[A-Z0-9]{8}$/, "must look like MEN-XXXXXXXX"),
    email: emailField,
  })
  .strict();

const updateBookingStatusBody = z
  .object({
    status: z.enum(["confirmed", "cancelled", "completed"]),
    reason: z.string().trim().min(1).max(300).optional(),
  })
  .strict();

const listBookingsQuery = z
  .object({
    status: z.enum(BOOKING_STATUSES).optional(),
    roomId: objectId.optional(),
    reference: z.string().trim().toUpperCase().max(20).optional(),
    email: emailField.optional(),
    checkInFrom: isoDate.optional(),
    checkInTo: isoDate.optional(),
    ...paginationQuery,
  })
  .strict();

module.exports = {
  availabilityQuery,
  createBookingBody,
  lookupBookingBody,
  updateBookingStatusBody,
  listBookingsQuery,
};
