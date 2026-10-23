const { Router } = require("express");
const controller = require("../controllers/catalog.controller");
const { authenticate, optionalAuth } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const { createGalleryBody, listCatalogQuery, updateGalleryBody } = require("../validation/catalog.schemas");
const { idParams } = require("../validation/common");

const router = Router();

router.get("/", optionalAuth, validate({ query: listCatalogQuery }), controller.listGallery);
router.post("/", authenticate, validate({ body: createGalleryBody }), controller.createGalleryItem);
router.patch("/:id", authenticate, validate({ params: idParams, body: updateGalleryBody }), controller.updateGalleryItem);
router.delete("/:id", authenticate, validate({ params: idParams }), controller.removeGalleryItem);

module.exports = router;
