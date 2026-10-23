const { Router } = require("express");
const controller = require("../controllers/ai.controller");
const { publicWriteLimiter } = require("../middleware/rateLimit");
const { validate } = require("../middleware/validate");
const { assistantBody } = require("../validation/ai.schemas");

const router = Router();

router.post("/assistant", publicWriteLimiter, validate({ body: assistantBody }), controller.assistant);

module.exports = router;
