const { asyncHandler } = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");
const contactService = require("../services/contact.service");

const create = asyncHandler(async (req, res) => {
  const message = await contactService.createContactMessage(req.body);
  sendSuccess(res, { id: message.id, message: "Your message has been received." }, 201);
});

const list = asyncHandler(async (req, res) => {
  const { items, ...pagination } = await contactService.listContactMessages(req.query);
  sendSuccess(res, items, 200, pagination);
});

const getOne = asyncHandler(async (req, res) => {
  sendSuccess(res, await contactService.getContactMessage(req.params.id));
});

const update = asyncHandler(async (req, res) => {
  sendSuccess(res, await contactService.updateContactMessage(req.params.id, req.body));
});

const remove = asyncHandler(async (req, res) => {
  await contactService.deleteContactMessage(req.params.id);
  res.status(204).end();
});

module.exports = {
  create,
  list,
  getOne,
  update,
  remove,
};
