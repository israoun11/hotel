const { env } = require("../config/env");

const { Booking } = require("../models/Booking");
const { Inventory } = require("../models/Inventory");
const { Room } = require("../models/Room");
const { AppError } = require("../utils/AppError");
const { listNights, nightsBetween, parseISODate, todayInTimezone } = require("../utils/dates");
const { isDuplicateKeyError } = require("../utils/mongoErrors");
const { calculatePrice } = require("../utils/pricing");
const { generateBookingReference } = require("../utils/text");

const { notifyBookingCreated, notifyBookingStatusChanged } = require("./mail.service");
const { getSettings } = require("./settings.service");

/** Parses and validates the dates of a stay against "today" and the hotel's maximum stay. */
function resolveStay(checkInText, checkOutText, maxStayNights) {
  const checkIn = parseISODate(checkInText);
  const checkOut = parseISODate(checkOutText);
  if (!checkIn || !checkOut) throw new AppError(400, "INVALID_DATES", "Dates must use the format YYYY-MM-DD");

  const nights = nightsBetween(checkIn, checkOut);
  if (nights < 1) throw new AppError(400, "INVALID_DATES", "checkOut must be after checkIn");
  if (checkIn.getTime() < todayInTimezone(env.HOTEL_TIMEZONE).getTime()) {
    throw new AppError(400, "INVALID_DATES", "checkIn cannot be in the past");
  }
  if (nights > maxStayNights) {
    throw new AppError(400, "STAY_TOO_LONG", `The maximum stay is ${maxStayNights} nights`);
  }
  return { checkIn, checkOut, nights, nightDates: listNights(checkIn, nights) };
}

function priceFor(room, stay, adults, settings) {
  return calculatePrice({
    nightlyRate: room.pricePerNight,
    nights: stay.nights,
    adults,
    taxRatePercent: settings.taxRatePercent,
    touristTaxPerAdultPerNight: settings.touristTaxPerAdultPerNight,
  });
}

// ---------------------------------------------------------------------------
// Availability
// ---------------------------------------------------------------------------

async function searchAvailability(query) {
  const settings = await getSettings();
  const stay = resolveStay(query.checkIn, query.checkOut, settings.maxStayNights);
  const guests = query.adults + query.children;

  const filter = { isActive: true, capacity: { $gte: guests } };
  if (query.roomType) filter.type = query.roomType;
  if (query.roomId) filter._id = query.roomId;
  const rooms = await Room.find(filter).sort({ pricePerNight: 1, name: 1 });

  const rows = await Inventory.find({ room: { $in: rooms.map((room) => room._id) }, date: { $in: stay.nightDates } });
  const maxBooked = new Map();
  for (const row of rows) {
    const key = String(row.room);
    maxBooked.set(key, Math.max(maxBooked.get(key) ?? 0, row.booked));
  }

  const results = rooms.map((room) => {
    const remainingUnits = Math.max(room.totalUnits - (maxBooked.get(room.id) ?? 0), 0);
    return { room, available: remainingUnits > 0, remainingUnits, pricing: priceFor(room, stay, query.adults, settings) };
  });

  return {
    checkIn: query.checkIn,
    checkOut: query.checkOut,
    nights: stay.nights,
    adults: query.adults,
    children: query.children,
    currency: settings.currency,
    rooms: results.map((entry) => ({
      room: entry.room,
      available: entry.available,
      remainingUnits: entry.remainingUnits,
      pricing: { ...entry.pricing, currency: settings.currency },
    })),
  };
}

// ---------------------------------------------------------------------------
// Inventory (double-booking protection)
// ---------------------------------------------------------------------------
async function releaseNights(roomId, nightDates) {
  if (nightDates.length === 0) return;
  await Inventory.updateMany({ room: roomId, date: { $in: nightDates }, booked: { $gt: 0 } }, { $inc: { booked: -1 } });
}

/**
 * Atomically takes one unit of the room for each night.
 * The filter `booked < totalUnits` makes the increment conditional; when the night is full the
 * upsert tries to insert a duplicate (room, date) and MongoDB answers E11000, which we translate into
 * "unavailable". Two simultaneous requests can therefore never both get the last unit.
 */
async function reserveNights(room, nightDates) {
  const reserved = [];
  for (const date of nightDates) {
    let taken = false;
    for (let attempt = 0; attempt < 2 && !taken; attempt += 1) {
      try {
        await Inventory.updateOne(
          { room: room._id, date, booked: { $lt: room.totalUnits } },
          { $inc: { booked: 1 } },
          { upsert: true },
        );
        taken = true;
      } catch (error) {
        // First attempt: another request may have just created the night's document; retry once.
        if (!isDuplicateKeyError(error)) {
          await releaseNights(room._id, reserved);
          throw error;
        }
      }
    }
    if (!taken) {
      await releaseNights(room._id, reserved);
      throw new AppError(409, "ROOM_UNAVAILABLE", "This room is no longer available for the selected dates");
    }
    reserved.push(date);
  }
}

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------
async function createBooking(input) {
  const settings = await getSettings();
  if (!settings.isBookingEnabled) throw new AppError(503, "BOOKING_DISABLED", "Online booking is currently disabled");

  const stay = resolveStay(input.checkIn, input.checkOut, settings.maxStayNights);
  const room = await Room.findById(input.roomId);
  if (!room || !room.isActive) throw new AppError(404, "ROOM_NOT_FOUND", "Room not found");
  if (input.adults + input.children > room.capacity) {
    throw new AppError(422, "CAPACITY_EXCEEDED", `This room accepts at most ${room.capacity} guest(s)`);
  }

  const pricing = priceFor(room, stay, input.adults, settings); // computed on the server, never taken from the client
  await reserveNights(room, stay.nightDates);

  try {
    const booking = await Booking.create({
      reference: generateBookingReference(),
      room: room._id,
      roomName: room.name,
      guest: input.guest,
      checkIn: stay.checkIn,
      checkOut: stay.checkOut,
      nights: stay.nights,
      adults: input.adults,
      children: input.children,
      specialRequests: input.specialRequests,
      pricing: { ...pricing, currency: settings.currency },
      status: "pending",
    });
    notifyBookingCreated(booking);
    return booking;
  } catch (error) {
    await releaseNights(room._id, stay.nightDates); // never keep inventory for a booking that was not saved
    throw error;
  }
}

async function lookupBooking(input) {
  const booking = await Booking.findOne({ reference: input.reference, "guest.email": input.email });
  // Same message whether the reference or the e-mail is wrong: do not leak which bookings exist.
  if (!booking) throw new AppError(404, "BOOKING_NOT_FOUND", "No booking matches this reference and e-mail");
  return booking;
}

async function listBookings(query) {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.roomId) filter.room = query.roomId;
  if (query.reference) filter.reference = query.reference;
  if (query.email) filter["guest.email"] = query.email;
  if (query.checkInFrom || query.checkInTo) {
    const range = {};
    const from = query.checkInFrom ? parseISODate(query.checkInFrom) : null;
    const to = query.checkInTo ? parseISODate(query.checkInTo) : null;
    if (from) range.$gte = from;
    if (to) range.$lte = to;
    filter.checkIn = range;
  }

  const [items, total] = await Promise.all([
    Booking.find(filter)
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit),
    Booking.countDocuments(filter),
  ]);
  return { items, page: query.page, limit: query.limit, total, totalPages: Math.max(Math.ceil(total / query.limit), 1) };
}

async function getBookingById(id) {
  const booking = await Booking.findById(id);
  if (!booking) throw new AppError(404, "BOOKING_NOT_FOUND", "Booking not found");
  return booking;
}

const ALLOWED_TRANSITIONS = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["cancelled", "completed"],
  cancelled: [],
  completed: [],
};

async function updateBookingStatus(id, status, reason) {
  const booking = await getBookingById(id);
  if (!ALLOWED_TRANSITIONS[booking.status].includes(status)) {
    throw new AppError(409, "INVALID_STATUS_TRANSITION", `A ${booking.status} booking cannot become ${status}`);
  }

  // Atomic guard: only one concurrent request can perform the transition (and release the nights once).
  const updated = await Booking.findOneAndUpdate(
    { _id: booking._id, status: booking.status },
    { $set: { status, statusChangedAt: new Date(), ...(status === "cancelled" && reason ? { cancellationReason: reason } : {}) } },
    { new: true },
  );
  if (!updated) throw new AppError(409, "INVALID_STATUS_TRANSITION", "The booking was modified by someone else, please retry");

  if (status === "cancelled") await releaseNights(updated.room, listNights(updated.checkIn, updated.nights));
  notifyBookingStatusChanged(updated);
  return updated;
}

module.exports = {
  resolveStay,
  searchAvailability,
  createBooking,
  lookupBooking,
  listBookings,
  getBookingById,
  updateBookingStatus,
};
