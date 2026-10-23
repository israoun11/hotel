const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const { ConfigError, extractDbName, parseEnv } = require("../src/config/env.schema");

const SECRET = "a-valid-secret-with-more-than-32-characters!";
const URI = "mongodb+srv://user:pass@cluster0.example.mongodb.net/hotel_menara?retryWrites=true&w=majority";
const base = { JWT_SECRET: SECRET, MONGODB_URI: URI };

function problemsOf(source) {
  try {
    parseEnv(source);
  } catch (error) {
    assert.ok(error instanceof ConfigError);
    return error.message;
  }
  assert.fail("parseEnv should have thrown");
}

describe("environment validation", () => {
  it("accepts a minimal valid configuration and applies defaults", () => {
    const env = parseEnv(base);
    assert.equal(env.NODE_ENV, "development");
    assert.equal(env.PORT, 4000);
    assert.equal(env.AI_ENABLED, false);
    assert.equal(env.EMAIL_ENABLED, false);
    assert.deepEqual(env.CORS_ORIGINS, ["http://localhost:3000", "http://localhost:5173"]);
  });

  it("extracts database names", () => {
    assert.equal(extractDbName(URI), "hotel_menara");
    assert.equal(extractDbName("mongodb://localhost:27017/demo"), "demo");
    assert.equal(extractDbName("mongodb+srv://u:p@host.net/?retryWrites=true"), null);
  });

  it("explains what is missing", () => {
    assert.match(problemsOf({ JWT_SECRET: SECRET }), /MONGODB_URI: is required/);
    assert.match(problemsOf({ MONGODB_URI: URI }), /JWT_SECRET/);
    assert.match(problemsOf({ ...base, JWT_SECRET: "short" }), /at least 32/);
  });

  it("requires a database name in the URI", () => {
    assert.match(problemsOf({ ...base, MONGODB_URI: "mongodb+srv://u:p@host.mongodb.net/?retryWrites=true" }), /database name/);
  });

  it("keeps the test database separate", () => {
    assert.match(problemsOf({ ...base, MONGODB_URI_TEST: URI }), /_test/);
    assert.match(problemsOf({ ...base, MONGODB_URI_TEST: "mongodb://localhost/hotel_menara_test2" }), /_test/);
    const ok = parseEnv({ ...base, MONGODB_URI_TEST: "mongodb://localhost:27017/hotel_menara_test" });
    assert.equal(ok.MONGODB_URI_TEST, "mongodb://localhost:27017/hotel_menara_test");
  });

  it("does not require MONGODB_URI when running tests", () => {
    assert.equal(parseEnv({ NODE_ENV: "test", JWT_SECRET: SECRET }).NODE_ENV, "test");
  });

  it("requires OpenAI settings only when AI is enabled; empty values count as unset", () => {
    assert.equal(parseEnv({ ...base, AI_ENABLED: "false", OPENAI_API_KEY: "", OPENAI_MODEL: "" }).AI_ENABLED, false);
    const message = problemsOf({ ...base, AI_ENABLED: "true" });
    assert.match(message, /OPENAI_API_KEY/);
    assert.match(message, /OPENAI_MODEL/);
    assert.equal(parseEnv({ ...base, AI_ENABLED: "true", OPENAI_API_KEY: "sk-test", OPENAI_MODEL: "some-model" }).AI_ENABLED, true);
  });

  it("requires SMTP settings only when e-mail is enabled", () => {
    const message = problemsOf({ ...base, EMAIL_ENABLED: "true" });
    for (const key of ["SMTP_HOST", "SMTP_USER", "SMTP_PASS", "EMAIL_FROM", "HOTEL_NOTIFY_EMAIL"]) assert.match(message, new RegExp(key));
  });

  it("rejects unsafe production settings", () => {
    assert.match(problemsOf({ ...base, NODE_ENV: "production", JWT_SECRET: "change-me-this-is-a-placeholder-secret-value" }), /placeholder/);
    assert.match(problemsOf({ ...base, NODE_ENV: "production", CORS_ORIGINS: "*" }), /explicit origins/);
  });

  it("rejects invalid booleans, ports and timezones", () => {
    assert.match(problemsOf({ ...base, AI_ENABLED: "yes" }), /AI_ENABLED/);
    assert.match(problemsOf({ ...base, PORT: "99999" }), /PORT/);
    assert.match(problemsOf({ ...base, HOTEL_TIMEZONE: "Mars/Olympus" }), /HOTEL_TIMEZONE/);
  });
});
