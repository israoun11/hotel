const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { env } = require("../config/env");
const { Admin } = require("../models/Admin");
const { AppError } = require("../utils/AppError");

// Compared against when the e-mail is unknown, so response time does not reveal which e-mails exist.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", env.BCRYPT_ROUNDS);

async function login(email, password) {
  const admin = await Admin.findOne({ email }).select("+passwordHash");
  const passwordOk = await bcrypt.compare(password, admin?.passwordHash ?? DUMMY_HASH);
  if (!admin || !admin.isActive || !passwordOk) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid e-mail or password");
  }

  admin.lastLoginAt = new Date();
  await admin.save();

  const expiresInSeconds = env.JWT_EXPIRES_MINUTES * 60;
  const token = jwt.sign({ sub: admin.id, tv: admin.tokenVersion }, env.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: expiresInSeconds,
  });
  return { token, tokenType: "Bearer", expiresInSeconds, admin };
}

async function getAdminProfile(adminId) {
  const admin = await Admin.findById(adminId);
  if (!admin) throw new AppError(404, "ADMIN_NOT_FOUND", "Administrator not found");
  return admin;
}

async function changePassword(adminId, currentPassword, newPassword) {
  const admin = await Admin.findById(adminId).select("+passwordHash");
  if (!admin) throw new AppError(404, "ADMIN_NOT_FOUND", "Administrator not found");
  if (!(await bcrypt.compare(currentPassword, admin.passwordHash))) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Current password is incorrect");
  }
  admin.passwordHash = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);
  admin.tokenVersion += 1; // invalidates every token issued before this change
  await admin.save();
}

module.exports = {
  login,
  getAdminProfile,
  changePassword,
};
