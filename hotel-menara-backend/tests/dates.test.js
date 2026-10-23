const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const { listNights, nightsBetween, parseISODate, toISODate, todayInTimezone } = require("../src/utils/dates");

describe("dates", () => {
  it("parses valid ISO dates as UTC midnight", () => {
    const date = parseISODate("2030-06-10");
    assert.ok(date);
    assert.equal(date.toISOString(), "2030-06-10T00:00:00.000Z");
  });

  it("rejects malformed and impossible dates", () => {
    for (const bad of ["2030-6-10", "10/06/2030", "2030-02-31", "2030-13-01", "", "2030-06-10T10:00:00Z"]) {
      assert.equal(parseISODate(bad), null, bad);
    }
  });

  it("counts nights and lists the occupied nights (check-out night excluded)", () => {
    const checkIn = parseISODate("2030-06-10");
    const checkOut = parseISODate("2030-06-13");
    assert.ok(checkIn && checkOut);
    assert.equal(nightsBetween(checkIn, checkOut), 3);
    assert.deepEqual(listNights(checkIn, 3).map(toISODate), ["2030-06-10", "2030-06-11", "2030-06-12"]);
  });

  it("handles month and year boundaries", () => {
    const checkIn = parseISODate("2030-12-30");
    assert.ok(checkIn);
    assert.deepEqual(listNights(checkIn, 3).map(toISODate), ["2030-12-30", "2030-12-31", "2031-01-01"]);
  });

  it("computes 'today' in the hotel timezone", () => {
    const late = new Date("2026-10-20T23:30:00Z");
    assert.equal(toISODate(todayInTimezone("UTC", late)), "2026-10-20");
    assert.equal(toISODate(todayInTimezone("Africa/Tunis", late)), "2026-10-21");
  });
});
