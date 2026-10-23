const { rateLimit } = require("express-rate-limit");
const { env } = require("../config/env");

const baseOptions = {
  windowMs: 15 * 60 * 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: "RATE_LIMITED", message: "Too many requests, please try again later" } },
};

/** Whole API (disabled only in automated tests). */
const globalLimiter = rateLimit({ ...baseOptions, limit: env.RATE_LIMIT_MAX, skip: () => env.NODE_ENV === "test" });

// The two stricter limiters below only apply in production, so that repeated Postman runs
// during development are not blocked.
const productionOnly = () => env.NODE_ENV !== "production";

/** Login attempts (brute-force protection). */
const loginLimiter = rateLimit({ ...baseOptions, limit: 10, skip: productionOnly });
/** Public write endpoints: bookings, contact messages, AI assistant. */
const publicWriteLimiter = rateLimit({ ...baseOptions, limit: 30, skip: productionOnly });

module.exports = {
  globalLimiter,
  loginLimiter,
  publicWriteLimiter,
};
