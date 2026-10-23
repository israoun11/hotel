const { z } = require("zod");
const { GALLERY_CATEGORIES, SERVICE_CATEGORIES } = require("../constants");
const { atLeastOneField, atLeastOneFieldMessage, booleanQuery, httpUrl } = require("./common");

const serviceFields = z
  .object({
    name: z.string().trim().min(2).max(100),
    description: z.string().trim().min(5).max(1000),
    category: z.enum(SERVICE_CATEGORIES),
    icon: z.string().trim().min(1).max(40),
    order: z.number().int().min(0).max(10000),
    isActive: z.boolean(),
  })
  .strict();

const createServiceBody = serviceFields.partial({ icon: true, order: true, isActive: true });
const updateServiceBody = serviceFields.partial().refine(atLeastOneField, atLeastOneFieldMessage);

const galleryFields = z
  .object({
    title: z.string().trim().min(2).max(120),
    caption: z.string().trim().max(300),
    imageUrl: httpUrl,
    category: z.enum(GALLERY_CATEGORIES),
    order: z.number().int().min(0).max(10000),
    isActive: z.boolean(),
  })
  .strict();

const createGalleryBody = galleryFields.partial({ caption: true, order: true, isActive: true });
const updateGalleryBody = galleryFields.partial().refine(atLeastOneField, atLeastOneFieldMessage);

const listCatalogQuery = z
  .object({
    category: z.string().trim().max(30).optional(),
    includeInactive: booleanQuery.optional(),
  })
  .strict();

module.exports = {
  createServiceBody,
  updateServiceBody,
  createGalleryBody,
  updateGalleryBody,
  listCatalogQuery,
};
