const { Router } = require("express");
const controller = require("../controllers/booking.controller");
const { authenticate } = require("../middleware/auth");
const { publicWriteLimiter } = require("../middleware/rateLimit");
const { validate } = require("../middleware/validate");
const {
  createBookingBody,
  listBookingsQuery,
  lookupBookingBody,
  updateBookingStatusBody,
} = require("../validation/booking.schemas");
const { idParams } = require("../validation/common");

const router = Router();

router.post("/", publicWriteLimiter, validate({ body: createBookingBody }), controller.create);
router.post("/lookup", publicWriteLimiter, validate({ body: lookupBookingBody }), controller.lookup);
router.get("/", authenticate, validate({ query: listBookingsQuery }), controller.list);
router.get("/:id", authenticate, validate({ params: idParams }), controller.getOne);
router.patch("/:id/status", authenticate, validate({ params: idParams, body: updateBookingStatusBody }), controller.updateStatus);

module.exports = router;
