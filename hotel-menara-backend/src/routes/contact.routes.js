const { Router } = require("express");
const controller = require("../controllers/contact.controller");
const { authenticate } = require("../middleware/auth");
const { publicWriteLimiter } = require("../middleware/rateLimit");
const { validate } = require("../middleware/validate");
const { idParams } = require("../validation/common");
const { createContactBody, listContactQuery, updateContactBody } = require("../validation/contact.schemas");

const router = Router();

router.post("/", publicWriteLimiter, validate({ body: createContactBody }), controller.create);
router.get("/", authenticate, validate({ query: listContactQuery }), controller.list);
router.get("/:id", authenticate, validate({ params: idParams }), controller.getOne);
router.patch("/:id", authenticate, validate({ params: idParams, body: updateContactBody }), controller.update);
router.delete("/:id", authenticate, validate({ params: idParams }), controller.remove);

module.exports = router;
