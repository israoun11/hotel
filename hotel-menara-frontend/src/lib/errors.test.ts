import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ApiError } from "../api/client";
import { en } from "../i18n/en";
import { fr } from "../i18n/fr";
import { errorMessage, fieldErrorsFrom } from "./errors";

describe("Error messages", () => {
  it("translates backend error codes in both languages", () => {
    const error = new ApiError(409, "ROOM_UNAVAILABLE", "This room is no longer available");
    assert.equal(errorMessage(error, fr), fr.errors.ROOM_UNAVAILABLE);
    assert.equal(errorMessage(error, en), en.errors.ROOM_UNAVAILABLE);
  });
  it("uses a server message for unknown 5xx codes and a generic one otherwise", () => {
    assert.equal(errorMessage(new ApiError(503, "SOMETHING_NEW", "x"), en), en.errors.INTERNAL_ERROR);
    assert.equal(errorMessage(new ApiError(418, "SOMETHING_NEW", "x"), en), en.errors.generic);
    assert.equal(errorMessage(new Error("boom"), fr), fr.errors.generic);
  });
  it("maps field issues, keeping the first message per field", () => {
    const error = new ApiError(400, "VALIDATION_ERROR", "x", [
      { path: "contact.email", message: "first" },
      { path: "contact.email", message: "second" },
      { path: "name", message: "too short" },
    ]);
    assert.deepEqual(fieldErrorsFrom(error, { "contact.email": "email" }), { email: "first", name: "too short" });
    assert.deepEqual(fieldErrorsFrom(new Error("x")), {});
  });
});
