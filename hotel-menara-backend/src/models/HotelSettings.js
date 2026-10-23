const { Schema, model } = require("mongoose");
const { baseSchemaOptions } = require("./shared");

// Every default below is DEMO data to be replaced by the hotel through PUT /api/v1/settings.
const settingsSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: "main" },
    hotelName: { type: String, default: "Hotel Menara Hammamet" },
    tagline: { type: String, default: "[DEMO] Replace this tagline" },
    description: { type: String, default: "[DEMO] Replace this description with the real hotel presentation." },
    address: {
      street: { type: String, default: "[DEMO] Street address" },
      city: { type: String, default: "Hammamet" },
      country: { type: String, default: "Tunisia" },
    },
    contact: {
      phone: { type: String, default: "+000 00 000 000" },
      email: { type: String, default: "demo@example.com" },
    },
    socialLinks: {
      facebook: { type: String },
      instagram: { type: String },
    },
    checkInTime: { type: String, default: "14:00" },
    checkOutTime: { type: String, default: "12:00" },
    currency: { type: String, default: "TND" },
    taxRatePercent: { type: Number, default: 0, min: 0, max: 100 },
    touristTaxPerAdultPerNight: { type: Number, default: 0, min: 0 },
    maxStayNights: { type: Number, default: 30, min: 1, max: 90 },
    cancellationPolicy: { type: String, default: "[DEMO] Replace with the real cancellation policy." },
    isBookingEnabled: { type: Boolean, default: true },
  },
  baseSchemaOptions,
);

const HotelSettings = model("HotelSettings", settingsSchema);

module.exports = {
  HotelSettings,
};
