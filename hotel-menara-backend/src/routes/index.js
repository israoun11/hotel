const { Router } = require("express");
const mongoose = require("mongoose");
const { env } = require("../config/env");
const aiRoutes = require("./ai.routes");
const authRoutes = require("./auth.routes");
const availabilityRoutes = require("./availability.routes");
const bookingRoutes = require("./booking.routes");
const contactRoutes = require("./contact.routes");
const galleryRoutes = require("./gallery.routes");
const roomRoutes = require("./room.routes");
const serviceRoutes = require("./service.routes");
const settingsRoutes = require("./settings.routes");

const router = Router();

router.get("/health", (_req, res) => {
  const database = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  res.status(database === "connected" ? 200 : 503).json({
    success: true,
    data: {
      status: database === "connected" ? "ok" : "degraded",
      database,
      environment: env.NODE_ENV,
      aiEnabled: env.AI_ENABLED,
      emailEnabled: env.EMAIL_ENABLED,
      uptimeSeconds: Math.round(process.uptime()),
    },
  });
});

router.use("/auth", authRoutes);
router.use("/settings", settingsRoutes);
router.use("/rooms", roomRoutes);
router.use("/services", serviceRoutes);
router.use("/gallery", galleryRoutes);
router.use("/availability", availabilityRoutes);
router.use("/bookings", bookingRoutes);
router.use("/contact-messages", contactRoutes);
router.use("/ai", aiRoutes);

module.exports = router;
