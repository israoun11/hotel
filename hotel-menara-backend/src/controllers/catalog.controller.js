const { asyncHandler } = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");
const catalogService = require("../services/catalog.service");

// ---- Hotel services -------------------------------------------------------
const listServices = asyncHandler(async (req, res) => {
  const items = await catalogService.listServices(req.query, Boolean(req.admin));
  sendSuccess(res, items, 200, { count: items.length });
});

const createService = asyncHandler(async (req, res) => {
  sendSuccess(res, await catalogService.createService(req.body), 201);
});

const updateService = asyncHandler(async (req, res) => {
  sendSuccess(res, await catalogService.updateService(req.params.id, req.body));
});

const removeService = asyncHandler(async (req, res) => {
  await catalogService.deleteService(req.params.id);
  res.status(204).end();
});

// ---- Gallery --------------------------------------------------------------
const listGallery = asyncHandler(async (req, res) => {
  const items = await catalogService.listGallery(req.query, Boolean(req.admin));
  sendSuccess(res, items, 200, { count: items.length });
});

const createGalleryItem = asyncHandler(async (req, res) => {
  sendSuccess(res, await catalogService.createGalleryItem(req.body), 201);
});

const updateGalleryItem = asyncHandler(async (req, res) => {
  sendSuccess(res, await catalogService.updateGalleryItem(req.params.id, req.body));
});

const removeGalleryItem = asyncHandler(async (req, res) => {
  await catalogService.deleteGalleryItem(req.params.id);
  res.status(204).end();
});

module.exports = {
  listServices,
  createService,
  updateService,
  removeService,
  listGallery,
  createGalleryItem,
  updateGalleryItem,
  removeGalleryItem,
};
