const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const { calculatePrice } = require("../src/utils/pricing");

describe("calculatePrice", () => {
  it("computes subtotal, tax, tourist tax and total", () => {
    const result = calculatePrice({ nightlyRate: 100, nights: 3, adults: 2, taxRatePercent: 7, touristTaxPerAdultPerNight: 1.5 });
    assert.deepEqual(result, {
      nightlyRate: 100,
      nights: 3,
      subtotal: 300,
      taxRatePercent: 7,
      taxAmount: 21,
      touristTax: 9,
      total: 330,
    });
  });

  it("works with zero taxes", () => {
    const result = calculatePrice({ nightlyRate: 90, nights: 2, adults: 1, taxRatePercent: 0, touristTaxPerAdultPerNight: 0 });
    assert.equal(result.total, 180);
  });

  it("avoids floating point drift (3 decimals)", () => {
    const result = calculatePrice({ nightlyRate: 0.1, nights: 3, adults: 1, taxRatePercent: 0, touristTaxPerAdultPerNight: 0.2 });
    assert.equal(result.subtotal, 0.3);
    assert.equal(result.touristTax, 0.6);
    assert.equal(result.total, 0.9);
  });

  it("rejects invalid input", () => {
    const base = { nightlyRate: 100, nights: 1, adults: 1, taxRatePercent: 0, touristTaxPerAdultPerNight: 0 };
    assert.throws(() => calculatePrice({ ...base, nights: 0 }));
    assert.throws(() => calculatePrice({ ...base, nights: 1.5 }));
    assert.throws(() => calculatePrice({ ...base, adults: 0 }));
    assert.throws(() => calculatePrice({ ...base, nightlyRate: -1 }));
  });
});
