const { z } = require("zod");
const { MESSAGE_STATUSES } = require("../constants");
const { emailField, paginationQuery, phoneField } = require("./common");

const createContactBody = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: emailField,
    phone: phoneField.optional(),
    subject: z.string().trim().min(3).max(150),
    message: z.string().trim().min(10).max(2000),
  })
  .strict();

const updateContactBody = z.object({ status: z.enum(MESSAGE_STATUSES) }).strict();

const listContactQuery = z
  .object({
    status: z.enum(MESSAGE_STATUSES).optional(),
    ...paginationQuery,
  })
  .strict();

module.exports = {
  createContactBody,
  updateContactBody,
  listContactQuery,
};
