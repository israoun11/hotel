const jwt = require("jsonwebtoken");
const { env } = require("../config/env");
const { Admin } = require("../models/Admin");
const { AppError } = require("../utils/AppError");
const { asyncHandler } = require("../utils/asyncHandler");

function isTokenPayload(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof value.sub === "string" &&
    typeof value.tv === "number"
  );
}

function readBearerToken(req) {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  return scheme === "Bearer" && token ? token : null;
}

async function resolveAdmin(token) {
  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] });
  } catch {
    throw new AppError(401, "INVALID_TOKEN", "Invalid or expired token");
  }
  if (!isTokenPayload(payload)) throw new AppError(401, "INVALID_TOKEN", "Invalid or expired token");

  const admin = await Admin.findById(payload.sub);
  if (!admin || !admin.isActive || admin.tokenVersion !== payload.tv) {
    throw new AppError(401, "INVALID_TOKEN", "Invalid or expired token");
  }
  return { id: admin.id, email: admin.email, name: admin.name, role: admin.role };
}

/** Requires a valid administrator JWT: `Authorization: Bearer <token>`. */
const authenticate = asyncHandler(async (req, _res, next) => {
  const token = readBearerToken(req);
  if (!token) throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  req.admin = await resolveAdmin(token);
  next();
});

/** Sets req.admin when a valid token is present, but never rejects the request. */
const optionalAuth = asyncHandler(async (req, _res, next) => {
  const token = readBearerToken(req);
  if (token) {
    try {
      req.admin = await resolveAdmin(token);
    } catch {
      // An invalid token on a public route is simply treated as an anonymous visitor.
    }
  }
  next();
});

module.exports = {
  authenticate,
  optionalAuth,
};
