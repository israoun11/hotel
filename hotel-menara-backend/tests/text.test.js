const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const { flattenForUpdate, generateBookingReference, slugify } = require("../src/utils/text");

describe("text utils", () => {
  it("slugifies names, removing accents", () => {
    assert.equal(slugify("Chambre Supérieure - Vue Mer!"), "chambre-superieure-vue-mer");
    assert.equal(slugify("  --  "), "");
  });

  it("generates well-formed, unique booking references", () => {
    const references = new Set();
    for (let index = 0; index < 2000; index += 1) {
      const reference = generateBookingReference();
      assert.match(reference, /^MEN-[A-HJ-NP-Z2-9]{8}$/);
      references.add(reference);
    }
    assert.equal(references.size, 2000);
  });

  it("flattens nested updates so siblings are not erased", () => {
    const flat = flattenForUpdate({ hotelName: "X", contact: { email: "a@b.co" }, address: { city: "Y" }, tags: ["a"], skip: undefined });
    assert.deepEqual(flat, { hotelName: "X", "contact.email": "a@b.co", "address.city": "Y", tags: ["a"] });
  });
});
