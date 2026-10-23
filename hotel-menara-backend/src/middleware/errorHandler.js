const mongoose = require("mongoose");
const { ZodError } = require("zod");
const { env } = require("../config/env");
const { AppError } = require("../utils/AppError");
const { isDuplicateKeyError } = require("../utils/mongoErrors");
const { logger } = require("../utils/logger");

function send(
  res,
  status,
  code,
  message,
  details,
) {
  res.status(status).json({ success: false, error: details === undefined ? { code, message } : { code, message, details } });
}

const notFound = (req, res) => {
  send(res, 404, "NOT_FOUND", `Route not found: ${req.method} ${req.originalUrl.split("?")[0]}`);
};

// Express recognises error handlers by their four parameters: `_next` must stay.
const errorHandler = (error, req, res, _next) => {
  if (error instanceof ZodError) {
    const details = error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }));
    return send(res, 400, "VALIDATION_ERROR", "Request validation failed", details);
  }
  if (error instanceof AppError) {
    return send(res, error.statusCode, error.code, error.message, error.details);
  }
  if (error instanceof mongoose.Error.CastError) {
    return send(res, 400, "INVALID_ID", `Invalid value for '${error.path}'`);
  }
  if (error instanceof mongoose.Error.ValidationError) {
    const details = Object.values(error.errors).map((item) => ({ path: item.path, message: item.message }));
    return send(res, 400, "VALIDATION_ERROR", "Request validation failed", details);
  }
  if (isDuplicateKeyError(error)) {
    const keys = Object.keys(error.keyPattern ?? {});
    return send(res, 409, "DUPLICATE_VALUE", `A record with the same value already exists${keys.length ? ` (${keys.join(", ")})` : ""}`);
  }

  const httpError = (typeof error === "object" && error !== null ? error : {});
  if (httpError.type === "entity.parse.failed") return send(res, 400, "INVALID_JSON", "Request body is not valid JSON");
  if (httpError.type === "entity.too.large") return send(res, 413, "PAYLOAD_TOO_LARGE", "Request body is too large");

  logger.error("Unhandled error", {
    method: req.method,
    path: req.originalUrl.split("?")[0],
    error: error instanceof Error ? error.stack ?? error.message : String(error),
  });
  const message = env.NODE_ENV === "production" ? "Internal server error" : error instanceof Error ? error.message : "Internal server error";
  return send(res, 500, "INTERNAL_ERROR", message);
};

module.exports = {
  notFound,
  errorHandler,
};
