const { Schema, model } = require("mongoose");
const { ROOM_TYPES } = require("../constants");
const { baseSchemaOptions } = require("./shared");

const roomSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    type: { type: String, enum: ROOM_TYPES, required: true },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    capacity: { type: Number, required: true, min: 1, max: 10 },
    totalUnits: { type: Number, required: true, min: 1, max: 500 },
    pricePerNight: { type: Number, required: true, min: 0 },
    amenities: { type: [String], default: [] },
    images: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    isDemo: { type: Boolean, default: false },
  },
  baseSchemaOptions,
);
roomSchema.index({ isActive: 1, type: 1 });

const Room = model("Room", roomSchema);

module.exports = {
  Room,
};
