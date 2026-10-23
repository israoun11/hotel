const { asyncHandler } = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");
const bookingService = require("../services/booking.service");

const availability = asyncHandler(async (req, res) => {
  sendSuccess(res, await bookingService.searchAvailability(req.query));
});

const create = asyncHandler(async (req, res) => {
  sendSuccess(res, await bookingService.createBooking(req.body), 201);
});

const lookup = asyncHandler(async (req, res) => {
  sendSuccess(res, await bookingService.lookupBooking(req.body));
});

const list = asyncHandler(async (req, res) => {
  const { items, ...pagination } = await bookingService.listBookings(req.query);
  sendSuccess(res, items, 200, pagination);
});

const getOne = asyncHandler(async (req, res) => {
  sendSuccess(res, await bookingService.getBookingById(req.params.id));
});

const updateStatus = asyncHandler(async (req, res) => {
  const { status, reason } = req.body;
  sendSuccess(res, await bookingService.updateBookingStatus(req.params.id, status, reason));
});

module.exports = {
  availability,
  create,
  lookup,
  list,
  getOne,
  updateStatus,
};
