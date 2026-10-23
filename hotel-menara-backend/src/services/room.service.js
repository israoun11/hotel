const { randomBytes } = require("node:crypto");
const { Booking } = require("../models/Booking");
const { Inventory } = require("../models/Inventory");
const { Room } = require("../models/Room");
const { AppError } = require("../utils/AppError");
const { todayInTimezone } = require("../utils/dates");
const { env } = require("../config/env");
const { slugify } = require("../utils/text");

async function listRooms(query, includeInactive) {
  const filter = {};
  if (!includeInactive || !query.includeInactive) filter.isActive = true;
  if (query.type) filter.type = query.type;
  if (query.capacity) filter.capacity = { $gte: query.capacity };
  return Room.find(filter).sort({ pricePerNight: 1, name: 1 });
}

async function getRoomByIdOrSlug(idOrSlug, includeInactive) {
  const isId = /^[a-f\d]{24}$/i.test(idOrSlug);
  const room = await Room.findOne(isId ? { _id: idOrSlug } : { slug: idOrSlug.toLowerCase() });
  if (!room || (!room.isActive && !includeInactive)) throw new AppError(404, "ROOM_NOT_FOUND", "Room not found");
  return room;
}

async function createRoom(input) {
  const slug = input.slug ?? (slugify(input.name) || `room-${randomBytes(3).toString("hex")}`);
  return Room.create({ ...input, slug });
}

async function updateRoom(id, input) {
  const room = await Room.findByIdAndUpdate(id, { $set: input }, { new: true, runValidators: true });
  if (!room) throw new AppError(404, "ROOM_NOT_FOUND", "Room not found");
  return room;
}

async function deleteRoom(id) {
  const room = await Room.findById(id);
  if (!room) throw new AppError(404, "ROOM_NOT_FOUND", "Room not found");

  const today = todayInTimezone(env.HOTEL_TIMEZONE);
  const activeBookings = await Booking.countDocuments({
    room: room._id,
    status: { $in: ["pending", "confirmed"] },
    checkOut: { $gt: today },
  });
  if (activeBookings > 0) {
    throw new AppError(
      409,
      "ROOM_HAS_BOOKINGS",
      `This room has ${activeBookings} pending/confirmed upcoming booking(s). Cancel them first, or set isActive to false instead.`,
    );
  }
  await Inventory.deleteMany({ room: room._id });
  await room.deleteOne();
}

module.exports = {
  listRooms,
  getRoomByIdOrSlug,
  createRoom,
  updateRoom,
  deleteRoom,
};
