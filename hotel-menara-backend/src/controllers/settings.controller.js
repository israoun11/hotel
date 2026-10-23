const { asyncHandler } = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");
const settingsService = require("../services/settings.service");

const get = asyncHandler(async (_req, res) => {
  sendSuccess(res, await settingsService.getSettings());
});

const update = asyncHandler(async (req, res) => {
  sendSuccess(res, await settingsService.updateSettings(req.body));
});

module.exports = {
  get,
  update,
};
