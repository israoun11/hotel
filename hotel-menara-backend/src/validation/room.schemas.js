const { z } = require("zod");
const { ROOM_TYPES } = require("../constants");
const { atLeastOneField, atLeastOneFieldMessage, booleanQuery, httpUrl } = require("./common");

const price = z
  .number()
  .min(0)
  .max(1_000_000)
  .refine((value) => Math.round(value * 1000) / 1000 === value, "at most 3 decimal places");

const roomFields = z
  .object({
    name: z.string().trim().min(2).max(100),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .max(120)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "use lowercase letters, digits and hyphens"),
    type: z.enum(ROOM_TYPES),
    description: z.string().trim().min(10).max(2000),
    capacity: z.number().int().min(1).max(10),
    totalUnits: z.number().int().min(1).max(500),
    pricePerNight: price,
    amenities: z.array(z.string().trim().min(1).max(60)).max(30),
    images: z.array(httpUrl).max(20),
    isActive: z.boolean(),
  })
  .strict();

const createRoomBody = roomFields.partial({ slug: true, amenities: true, images: true, isActive: true });

const updateRoomBody = roomFields.partial().refine(atLeastOneField, atLeastOneFieldMessage);

const listRoomsQuery = z
  .object({
    type: z.enum(ROOM_TYPES).optional(),
    capacity: z.coerce.number().int().min(1).max(10).optional(),
    includeInactive: booleanQuery.optional(),
  })
  .strict();

module.exports = {
  createRoomBody,
  updateRoomBody,
  listRoomsQuery,
};
