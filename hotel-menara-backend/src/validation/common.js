const { z } = require("zod");
const { parseISODate } = require("../utils/dates");

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "must be a valid id");

const idParams = z.object({ id: objectId }).strict();

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "must use the format YYYY-MM-DD")
  .refine((value) => parseISODate(value) !== null, "must be a real calendar date");

const paginationQuery = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

const booleanQuery = z.enum(["true", "false"]).transform((value) => value === "true");

/** bcrypt only uses the first 72 bytes, hence the maximum length. */
const strongPassword = z
  .string()
  .min(12, "must be at least 12 characters long")
  .max(72, "must be at most 72 characters long")
  .regex(/[a-z]/, "must contain a lowercase letter")
  .regex(/[A-Z]/, "must contain an uppercase letter")
  .regex(/[0-9]/, "must contain a digit");

/** Only http(s) URLs: blocks javascript:, data: and similar schemes that could lead to XSS in a front end. */
const httpUrl = z
  .string()
  .url()
  .max(500)
  .refine((value) => /^https?:\/\//i.test(value), "must start with http:// or https://");

const emailField = z.string().trim().toLowerCase().email("must be a valid e-mail address").max(254);

const phoneField = z
  .string()
  .trim()
  .regex(/^\+?[0-9\s().-]{6,20}$/, "must be a valid phone number");

/** Rejects an empty PATCH body. */
const atLeastOneField = (value) => Object.keys(value).length > 0;
const atLeastOneFieldMessage = "at least one field must be provided";

module.exports = {
  objectId,
  idParams,
  isoDate,
  paginationQuery,
  booleanQuery,
  strongPassword,
  httpUrl,
  emailField,
  phoneField,
  atLeastOneField,
  atLeastOneFieldMessage,
};
