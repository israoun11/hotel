// Amounts are handled in thousandths (millimes for TND) to avoid floating point drift.
const toMinor = (amount) => Math.round(amount * 1000);
const fromMinor = (minor) => minor / 1000;

/** Computes the full price of a stay. Always call this on the server; never trust client totals. */
function calculatePrice(input) {
  const { nightlyRate, nights, adults, taxRatePercent, touristTaxPerAdultPerNight } = input;
  if (!Number.isInteger(nights) || nights < 1) throw new Error("nights must be a positive integer");
  if (!Number.isInteger(adults) || adults < 1) throw new Error("adults must be a positive integer");
  if (nightlyRate < 0 || taxRatePercent < 0 || touristTaxPerAdultPerNight < 0) {
    throw new Error("prices and rates cannot be negative");
  }

  const subtotal = toMinor(nightlyRate) * nights;
  const taxAmount = Math.round((subtotal * taxRatePercent) / 100);
  const touristTax = toMinor(touristTaxPerAdultPerNight) * adults * nights;

  return {
    nightlyRate,
    nights,
    subtotal: fromMinor(subtotal),
    taxRatePercent,
    taxAmount: fromMinor(taxAmount),
    touristTax: fromMinor(touristTax),
    total: fromMinor(subtotal + taxAmount + touristTax),
  };
}

module.exports = {
  calculatePrice,
};
