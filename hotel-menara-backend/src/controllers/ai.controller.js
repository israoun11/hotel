const { asyncHandler } = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");
const aiService = require("../services/ai.service");

const assistant = asyncHandler(async (req, res) => {
  const answer = await aiService.askAssistant(req.body);
  sendSuccess(res, { answer });
});

module.exports = {
  assistant,
};
