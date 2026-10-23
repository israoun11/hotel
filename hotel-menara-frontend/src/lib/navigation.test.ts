import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isActivePath, matchPath, nextFocusIndex, safeAdminReturn } from "./navigation";

describe("Navigation helpers", () => {
  it("marks the current section in the menu", () => {
    assert.equal(isActivePath("/rooms/double-room", "/rooms"), true);
    assert.equal(isActivePath("/roomservice", "/rooms"), false);
    assert.equal(isActivePath("/spa", "/"), false);
    assert.equal(isActivePath("/", "/"), true);
  });

  it("keeps keyboard focus inside the open mobile menu and dialogs", () => {
    assert.equal(nextFocusIndex(4, 5, false), 0, "Tab on the last element goes back to the first");
    assert.equal(nextFocusIndex(0, 5, true), 4, "Shift+Tab on the first element goes to the last");
    assert.equal(nextFocusIndex(-1, 5, false), 0, "focus outside the menu enters it");
    assert.equal(nextFocusIndex(2, 0, false), -1);
  });

  it("matches routes with parameters", () => {
    assert.deepEqual(matchPath("/rooms/:slug", "/rooms/suite-jasmin"), { slug: "suite-jasmin" });
    assert.deepEqual(matchPath("/booking", "/booking/"), {});
    assert.equal(matchPath("/rooms/:slug", "/rooms"), null);
    assert.equal(matchPath("/rooms/:slug", "/rooms/%E0%A4%A"), null);
  });

  it("after sign-in, only returns to an internal admin page", () => {
    assert.equal(safeAdminReturn("/admin/bookings"), "/admin/bookings");
    assert.equal(safeAdminReturn(null), "/admin");
    assert.equal(safeAdminReturn("https://evil.example/admin"), "/admin");
    assert.equal(safeAdminReturn("//evil.example"), "/admin");
    assert.equal(safeAdminReturn("/admin/login"), "/admin");
  });
});
