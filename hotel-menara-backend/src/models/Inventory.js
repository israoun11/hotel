const { Schema, model } = require("mongoose");

const inventorySchema = new Schema({
  room: { type: Schema.Types.ObjectId, ref: "Room", required: true },
  date: { type: Date, required: true },
  booked: { type: Number, required: true, default: 0, min: 0 },
});
inventorySchema.index({ room: 1, date: 1 }, { unique: true });
// Old nights are useless for availability: let MongoDB clean them up 30 days after the night.
inventorySchema.index({ date: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

const Inventory = model("Inventory", inventorySchema);

module.exports = {
  Inventory,
};
