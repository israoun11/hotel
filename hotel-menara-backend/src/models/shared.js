/** Shared schema options: createdAt/updatedAt, `id` instead of `_id`, no `__v`, never expose password hashes. */
const baseSchemaOptions = {
  timestamps: true,
  toJSON: {
    versionKey: false,
    transform: (_doc, ret) => {
      ret.id = String(ret._id);
      delete ret._id;
      delete ret.passwordHash;
      return ret;
    },
  },
};

module.exports = {
  baseSchemaOptions,
};
