const { Router } = require("express");
const controller = require("../controllers/room.controller");
const { authenticate, optionalAuth } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const { idParams } = require("../validation/common");
const { createRoomBody, listRoomsQuery, updateRoomBody } = require("../validation/room.schemas");

const router = Router();

router.get("/", optionalAuth, validate({ query: listRoomsQuery }), controller.list);
router.get("/:idOrSlug", optionalAuth, controller.getOne);
router.post("/", authenticate, validate({ body: createRoomBody }), controller.create);
router.patch("/:id", authenticate, validate({ params: idParams, body: updateRoomBody }), controller.update);
router.delete("/:id", authenticate, validate({ params: idParams }), controller.remove);

module.exports = router;
