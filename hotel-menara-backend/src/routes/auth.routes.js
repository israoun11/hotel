const { Router } = require("express");
const controller = require("../controllers/auth.controller");
const { authenticate } = require("../middleware/auth");
const { loginLimiter } = require("../middleware/rateLimit");
const { validate } = require("../middleware/validate");
const { changePasswordBody, loginBody } = require("../validation/auth.schemas");

const router = Router();

router.post("/login", loginLimiter, validate({ body: loginBody }), controller.login);
router.get("/me", authenticate, controller.me);
router.post("/change-password", authenticate, validate({ body: changePasswordBody }), controller.changePassword);

module.exports = router;
