// Loaded before every test file (see the "test" script in package.json).
process.env.NODE_ENV = "test";
try {
  // Optional: lets MONGODB_URI_TEST come from your .env. Never overrides variables already set.
  process.loadEnvFile(".env");
} catch {
  // No .env file: unit tests do not need one.
}
process.env.NODE_ENV = "test";
process.env.JWT_SECRET ??= "test-only-secret-that-is-at-least-32-characters-long";
process.env.LOG_LEVEL = "error";
