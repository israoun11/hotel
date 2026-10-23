const { asyncHandler } = require("../utils/asyncHandler");
const { AppError } = require("../utils/AppError");
const { sendSuccess } = require("../utils/response");
const authService = require("../services/auth.service");

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  sendSuccess(res, {
    token: result.token,
    tokenType: result.tokenType,
    expiresInSeconds: result.expiresInSeconds,
    admin: result.admin,
  });
});

const me = asyncHandler(async (req, res) => {
  if (!req.admin) throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  sendSuccess(res, await authService.getAdminProfile(req.admin.id));
});

const changePassword = asyncHandler(async (req, res) => {
  if (!req.admin) throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  const { currentPassword, newPassword } = req.body;
  await authService.changePassword(req.admin.id, currentPassword, newPassword);
  sendSuccess(res, { message: "Password changed. Please log in again." });
});

module.exports = {
  login,
  me,
  changePassword,
};
