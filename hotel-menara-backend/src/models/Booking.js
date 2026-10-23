const { Schema, model } = require("mongoose");
const { BOOKING_STATUSES } = require("../constants");
const { baseSchemaOptions } = require("./shared");

const bookingSchema = new Schema(
  {
    reference: { type: String, required: true, unique: true, uppercase: true },
    room: { type: Schema.Types.ObjectId, ref: "Room", required: true, index: true },
    roomName: { type: String, required: true },
    guest: {
      firstName: { type: String, required: true, trim: true, maxlength: 80 },
      lastName: { type: String, required: true, trim: true, maxlength: 80 },
      email: { type: String, required: true, lowercase: true, trim: true },
      phone: { type: String, required: true, trim: true },
    },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    nights: { type: Number, required: true, min: 1 },
    adults: { type: Number, required: true, min: 1 },
    children: { type: Number, required: true, min: 0, default: 0 },
    specialRequests: { type: String, trim: true, maxlength: 1000 },
    pricing: {
      currency: { type: String, required: true },
      nightlyRate: { type: Number, required: true },
      nights: { type: Number, required: true },
      subtotal: { type: Number, required: true },
      taxRatePercent: { type: Number, required: true },
      taxAmount: { type: Number, required: true },
      touristTax: { type: Number, required: true },
      total: { type: Number, required: true },
    },
    status: { type: String, enum: BOOKING_STATUSES, default: "pending" },
    cancellationReason: { type: String, trim: true, maxlength: 300 },
    statusChangedAt: { type: Date },
  },
  baseSchemaOptions,
);
bookingSchema.index({ status: 1, checkIn: 1 });
bookingSchema.index({ "guest.email": 1 });

const Booking = model("Booking", bookingSchema);

module.exports = {
  Booking,
};
