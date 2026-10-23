const { Router } = require("express");
const controller = require("../controllers/booking.controller");
const { validate } = require("../middleware/validate");
const { availabilityQuery } = require("../validation/booking.schemas");

const router = Router();

router.get("/", validate({ query: availabilityQuery }), controller.availability);

module.exports = router;
