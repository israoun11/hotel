const { randomBytes } = require("node:crypto");

function slugify(input) {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

const REFERENCE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

/** Booking reference such as MEN-7K3P9Q2X. */
function generateBookingReference() {
  const bytes = randomBytes(8);
  let code = "";
  for (const byte of bytes) code += REFERENCE_ALPHABET[byte % REFERENCE_ALPHABET.length];
  return `MEN-${code}`;
}

const isPlainObject = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof Date);

/**
 * Turns { contact: { email: "x" } } into { "contact.email": "x" } so a partial update
 * changes only the provided nested fields instead of replacing the whole sub-document.
 */
function flattenForUpdate(input, prefix = "") {
  const output = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (isPlainObject(value)) Object.assign(output, flattenForUpdate(value, path));
    else output[path] = value;
  }
  return output;
}

module.exports = {
  slugify,
  generateBookingReference,
  flattenForUpdate,
};
