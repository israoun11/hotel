const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const { checkConsistency, collectExpressRoutes, normalizePath } = require("../scripts/lib/docsConsistency");

describe("documentation consistency", () => {
  it("normalises the different path syntaxes", () => {
    assert.equal(normalizePath("/rooms/:id"), "/rooms/{}");
    assert.equal(normalizePath("/rooms/{idOrSlug}"), "/rooms/{}");
    assert.equal(normalizePath("/rooms/{{roomId}}/"), "/rooms/{}");
  });

  it("finds the Express routes", () => {
    const routes = collectExpressRoutes();
    for (const expected of ["GET /health", "POST /auth/login", "POST /bookings", "PATCH /bookings/{}/status", "GET /availability"]) {
      assert.ok(routes.has(expected), `missing ${expected}`);
    }
  });

  it("Express routes, OpenAPI and the Postman files agree", () => {
    const { problems } = checkConsistency();
    assert.deepEqual(problems, []);
  });
});
