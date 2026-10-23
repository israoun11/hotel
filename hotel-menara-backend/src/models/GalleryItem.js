const { Schema, model } = require("mongoose");
const { GALLERY_CATEGORIES } = require("../constants");
const { baseSchemaOptions } = require("./shared");

const gallerySchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    caption: { type: String, trim: true, maxlength: 300 },
    imageUrl: { type: String, required: true, trim: true, maxlength: 500 },
    category: { type: String, enum: GALLERY_CATEGORIES, required: true },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isDemo: { type: Boolean, default: false },
  },
  baseSchemaOptions,
);
gallerySchema.index({ isActive: 1, category: 1, order: 1 });

const GalleryItem = model("GalleryItem", gallerySchema);

module.exports = {
  GalleryItem,
};
