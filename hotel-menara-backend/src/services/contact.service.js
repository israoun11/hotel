const { ContactMessage } = require("../models/ContactMessage");
const { AppError } = require("../utils/AppError");

const { notifyContactMessage } = require("./mail.service");

async function createContactMessage(input) {
  const message = await ContactMessage.create(input);
  notifyContactMessage(message);
  return message;
}

async function listContactMessages(query) {
  const filter = query.status ? { status: query.status } : {};
  const [items, total] = await Promise.all([
    ContactMessage.find(filter)
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit),
    ContactMessage.countDocuments(filter),
  ]);
  return { items, page: query.page, limit: query.limit, total, totalPages: Math.max(Math.ceil(total / query.limit), 1) };
}

async function getContactMessage(id) {
  const message = await ContactMessage.findById(id);
  if (!message) throw new AppError(404, "MESSAGE_NOT_FOUND", "Contact message not found");
  return message;
}

async function updateContactMessage(id, input) {
  const message = await ContactMessage.findByIdAndUpdate(id, { $set: { status: input.status } }, { new: true });
  if (!message) throw new AppError(404, "MESSAGE_NOT_FOUND", "Contact message not found");
  return message;
}

async function deleteContactMessage(id) {
  const result = await ContactMessage.findByIdAndDelete(id);
  if (!result) throw new AppError(404, "MESSAGE_NOT_FOUND", "Contact message not found");
}

module.exports = {
  createContactMessage,
  listContactMessages,
  getContactMessage,
  updateContactMessage,
  deleteContactMessage,
};
