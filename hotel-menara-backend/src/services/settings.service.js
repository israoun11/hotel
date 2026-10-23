const { HotelSettings } = require("../models/HotelSettings");
const { flattenForUpdate } = require("../utils/text");

/** Returns the single settings document, creating it with demo defaults on first use. */
async function getSettings() {
  const settings = await HotelSettings.findOneAndUpdate(
    { key: "main" },
    { $setOnInsert: { key: "main" } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  if (!settings) throw new Error("Could not load hotel settings");
  return settings;
}

async function updateSettings(input) {
  await getSettings();
  const updated = await HotelSettings.findOneAndUpdate(
    { key: "main" },
    { $set: flattenForUpdate(input) },
    { new: true, runValidators: true },
  );
  if (!updated) throw new Error("Could not update hotel settings");
  return updated;
}

module.exports = {
  getSettings,
  updateSettings,
};
