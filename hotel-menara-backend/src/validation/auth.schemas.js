const { z } = require("zod");
const { emailField, strongPassword } = require("./common");

const loginBody = z
  .object({
    email: emailField,
    password: z.string().min(1).max(200),
  })
  .strict();

const changePasswordBody = z
  .object({
    currentPassword: z.string().min(1).max(200),
    newPassword: strongPassword,
  })
  .strict()
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: "newPassword must be different from currentPassword",
    path: ["newPassword"],
  });

module.exports = {
  loginBody,
  changePasswordBody,
};
