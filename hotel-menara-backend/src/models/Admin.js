const { Schema, model } = require("mongoose");
const { baseSchemaOptions } = require("./shared");

const adminSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["admin"], default: "admin" },
    isActive: { type: Boolean, default: true },
    tokenVersion: { type: Number, default: 0 },
    lastLoginAt: { type: Date },
  },
  baseSchemaOptions,
);

const Admin = model("Admin", adminSchema);

module.exports = {
  Admin,
};
