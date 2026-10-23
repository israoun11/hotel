const { Router } = require("express");
const controller = require("../controllers/catalog.controller");
const { authenticate, optionalAuth } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const { createServiceBody, listCatalogQuery, updateServiceBody } = require("../validation/catalog.schemas");
const { idParams } = require("../validation/common");

const router = Router();

router.get("/", optionalAuth, validate({ query: listCatalogQuery }), controller.listServices);
router.post("/", authenticate, validate({ body: createServiceBody }), controller.createService);
router.patch("/:id", authenticate, validate({ params: idParams, body: updateServiceBody }), controller.updateService);
router.delete("/:id", authenticate, validate({ params: idParams }), controller.removeService);

module.exports = router;
