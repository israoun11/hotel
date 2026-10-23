const { Schema, model } = require("mongoose");
const { MESSAGE_STATUSES } = require("../constants");
const { baseSchemaOptions } = require("./shared");

const contactSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    subject: { type: String, required: true, trim: true, maxlength: 150 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    status: { type: String, enum: MESSAGE_STATUSES, default: "new" },
  },
  baseSchemaOptions,
);
contactSchema.index({ status: 1, createdAt: -1 });

const ContactMessage = model("ContactMessage", contactSchema);

module.exports = {
  ContactMessage,
};
