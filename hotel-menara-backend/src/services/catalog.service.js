const { GalleryItem } = require("../models/GalleryItem");
const { HotelService } = require("../models/HotelService");
const { AppError } = require("../utils/AppError");

function buildFilter(query, includeInactive) {
  const filter = {};
  if (!includeInactive || !query.includeInactive) filter.isActive = true;
  if (query.category) filter.category = query.category;
  return filter;
}

// ---- Hotel services -------------------------------------------------------
const listServices = (query, includeInactive) =>
  HotelService.find(buildFilter(query, includeInactive)).sort({ order: 1, name: 1 });

const createService = (input) => HotelService.create(input);

async function updateService(id, input) {
  const service = await HotelService.findByIdAndUpdate(id, { $set: input }, { new: true, runValidators: true });
  if (!service) throw new AppError(404, "SERVICE_NOT_FOUND", "Service not found");
  return service;
}

async function deleteService(id) {
  const result = await HotelService.findByIdAndDelete(id);
  if (!result) throw new AppError(404, "SERVICE_NOT_FOUND", "Service not found");
}

// ---- Gallery --------------------------------------------------------------
const listGallery = (query, includeInactive) =>
  GalleryItem.find(buildFilter(query, includeInactive)).sort({ order: 1, createdAt: -1 });

const createGalleryItem = (input) => GalleryItem.create(input);

async function updateGalleryItem(id, input) {
  const item = await GalleryItem.findByIdAndUpdate(id, { $set: input }, { new: true, runValidators: true });
  if (!item) throw new AppError(404, "GALLERY_ITEM_NOT_FOUND", "Gallery item not found");
  return item;
}

async function deleteGalleryItem(id) {
  const result = await GalleryItem.findByIdAndDelete(id);
  if (!result) throw new AppError(404, "GALLERY_ITEM_NOT_FOUND", "Gallery item not found");
}

module.exports = {
  listServices,
  createService,
  updateService,
  deleteService,
  listGallery,
  createGalleryItem,
  updateGalleryItem,
  deleteGalleryItem,
};
