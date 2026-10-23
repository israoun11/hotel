const { z } = require("zod");

const assistantBody = z
  .object({
    message: z.string().trim().min(2).max(500),
    history: z
      .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(500) }).strict())
      .max(6)
      .optional(),
  })
  .strict();

module.exports = {
  assistantBody,
};
