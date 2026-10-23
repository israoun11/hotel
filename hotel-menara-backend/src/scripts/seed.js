const { connectDb, disconnectDb } = require("../config/db");
const { env } = require("../config/env");
const { Booking } = require("../models/Booking");
const { GalleryItem } = require("../models/GalleryItem");
const { HotelService } = require("../models/HotelService");
const { Inventory } = require("../models/Inventory");
const { Room } = require("../models/Room");
const { getSettings } = require("../services/settings.service");

// Every record below is clearly marked DEMO data (isDemo: true) and uses placeholder values only.
const demoRooms = [
  { name: "[DEMO] Single Room", slug: "demo-single-room", type: "single", description: "[DEMO] Placeholder description of a single room.", capacity: 1, totalUnits: 4, pricePerNight: 60, amenities: ["[DEMO] Amenity A", "[DEMO] Amenity B"], images: ["https://example.com/demo/single-room.jpg"] },
  { name: "[DEMO] Double Room", slug: "demo-double-room", type: "double", description: "[DEMO] Placeholder description of a double room.", capacity: 2, totalUnits: 10, pricePerNight: 90, amenities: ["[DEMO] Amenity A", "[DEMO] Amenity B"], images: ["https://example.com/demo/double-room.jpg"] },
  { name: "[DEMO] Twin Room", slug: "demo-twin-room", type: "twin", description: "[DEMO] Placeholder description of a twin room.", capacity: 2, totalUnits: 8, pricePerNight: 90, amenities: ["[DEMO] Amenity A"], images: ["https://example.com/demo/twin-room.jpg"] },
  { name: "[DEMO] Family Room", slug: "demo-family-room", type: "family", description: "[DEMO] Placeholder description of a family room.", capacity: 4, totalUnits: 5, pricePerNight: 150, amenities: ["[DEMO] Amenity A", "[DEMO] Amenity C"], images: ["https://example.com/demo/family-room.jpg"] },
  { name: "[DEMO] Suite", slug: "demo-suite", type: "suite", description: "[DEMO] Placeholder description of a suite.", capacity: 3, totalUnits: 2, pricePerNight: 250, amenities: ["[DEMO] Amenity A", "[DEMO] Amenity D"], images: ["https://example.com/demo/suite.jpg"] },
];

const demoServices = [
  { name: "[DEMO] Restaurant", description: "[DEMO] Placeholder description of a restaurant service.", category: "dining", icon: "utensils", order: 1 },
  { name: "[DEMO] Swimming pool", description: "[DEMO] Placeholder description of a pool.", category: "leisure", icon: "waves", order: 2 },
  { name: "[DEMO] Spa", description: "[DEMO] Placeholder description of a spa.", category: "wellness", icon: "spa", order: 3 },
  { name: "[DEMO] Airport transfer", description: "[DEMO] Placeholder description of a transfer service.", category: "transport", icon: "car", order: 4 },
  { name: "[DEMO] Meeting room", description: "[DEMO] Placeholder description of a meeting room.", category: "business", icon: "briefcase", order: 5 },
];

const demoGallery = [
  { title: "[DEMO] Exterior", caption: "[DEMO] Placeholder image", imageUrl: "https://example.com/demo/exterior.jpg", category: "exterior", order: 1 },
  { title: "[DEMO] Pool", caption: "[DEMO] Placeholder image", imageUrl: "https://example.com/demo/pool.jpg", category: "pool", order: 2 },
  { title: "[DEMO] Restaurant", caption: "[DEMO] Placeholder image", imageUrl: "https://example.com/demo/restaurant.jpg", category: "dining", order: 3 },
  { title: "[DEMO] Double room", caption: "[DEMO] Placeholder image", imageUrl: "https://example.com/demo/room.jpg", category: "rooms", order: 4 },
];

async function resetDemoData() {
  const demoRoomIds = (await Room.find({ isDemo: true }).select("_id")).map((room) => room._id);
  const roomsWithBookings = new Set((await Booking.distinct("room", { room: { $in: demoRoomIds } })).map(String));
  const deletableIds = demoRoomIds.filter((id) => !roomsWithBookings.has(String(id)));

  await Inventory.deleteMany({ room: { $in: deletableIds } });
  const rooms = await Room.deleteMany({ _id: { $in: deletableIds } });
  const services = await HotelService.deleteMany({ isDemo: true });
  const gallery = await GalleryItem.deleteMany({ isDemo: true });
  console.log(`Removed demo data only: ${rooms.deletedCount} rooms, ${services.deletedCount} services, ${gallery.deletedCount} gallery items.`);
  if (roomsWithBookings.size > 0) console.log(`Kept ${roomsWithBookings.size} demo room(s) that have bookings.`);
}

async function main() {
  if (env.NODE_ENV === "production") {
    throw new Error("Refusing to seed demo data when NODE_ENV=production.");
  }
  const dbName = await connectDb();
  console.log(`Seeding database "${dbName}" (${env.NODE_ENV}). Existing real data is never modified or deleted.`);

  if (process.argv.includes("--reset-demo")) await resetDemoData();

  let created = 0;
  for (const room of demoRooms) {
    const result = await Room.updateOne({ slug: room.slug }, { $setOnInsert: { ...room, isActive: true, isDemo: true } }, { upsert: true });
    created += result.upsertedCount;
  }
  for (const service of demoServices) {
    const result = await HotelService.updateOne({ name: service.name, isDemo: true }, { $setOnInsert: { ...service, isActive: true, isDemo: true } }, { upsert: true });
    created += result.upsertedCount;
  }
  for (const item of demoGallery) {
    const result = await GalleryItem.updateOne({ title: item.title, isDemo: true }, { $setOnInsert: { ...item, isActive: true, isDemo: true } }, { upsert: true });
    created += result.upsertedCount;
  }
  await getSettings(); // creates the demo settings document only if it does not exist yet

  console.log(`Done: ${created} new demo record(s) created.`);
  console.log("Next: create the administrator with `npm run admin:create`.");
}

main()
  .catch((error) => {
    console.error(`Seed failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(() => disconnectDb());
