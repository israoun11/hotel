const { Router } = require("express");
const controller = require("../controllers/settings.controller");
const { authenticate } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const { updateSettingsBody } = require("../validation/settings.schemas");

const router = Router();

router.get("/", controller.get);
router.put("/", authenticate, validate({ body: updateSettingsBody }), controller.update);

module.exports = router;
