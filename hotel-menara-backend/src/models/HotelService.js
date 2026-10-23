const { Schema, model } = require("mongoose");
const { SERVICE_CATEGORIES } = require("../constants");
const { baseSchemaOptions } = require("./shared");

const serviceSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, required: true, trim: true, maxlength: 1000 },
    category: { type: String, enum: SERVICE_CATEGORIES, required: true },
    icon: { type: String, trim: true, maxlength: 40 },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isDemo: { type: Boolean, default: false },
  },
  baseSchemaOptions,
);
serviceSchema.index({ isActive: 1, order: 1 });

const HotelService = model("HotelService", serviceSchema);

module.exports = {
  HotelService,
};
