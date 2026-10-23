const { z } = require("zod");

const boolString = z.enum(["true", "false"]);

/** Extracts the database name from a MongoDB connection string. */
function extractDbName(uri) {
  const match = /^mongodb(?:\+srv)?:\/\/[^/]+\/([^/?]+)/.exec(uri);
  return match ? decodeURIComponent(match[1]) : null;
}

const mongoUri = z.string().regex(/^mongodb(\+srv)?:\/\//, "must start with mongodb:// or mongodb+srv://");

const isValidTimezone = (value) => {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: value });
    return true;
  } catch {
    return false;
  }
};

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    MONGODB_URI: mongoUri.optional(),
    MONGODB_URI_TEST: mongoUri.optional(),
    JWT_SECRET: z.string().min(32, "must be at least 32 characters long"),
    JWT_EXPIRES_MINUTES: z.coerce.number().int().min(5).max(10080).default(480),
    BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
    CORS_ORIGINS: z.string().default("http://localhost:3000,http://localhost:5173"),
    TRUST_PROXY: boolString.default("false"),
    RATE_LIMIT_MAX: z.coerce.number().int().min(10).max(100000).default(1000),
    HOTEL_TIMEZONE: z.string().default("Africa/Tunis").refine(isValidTimezone, "must be a valid IANA timezone"),
    LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),

    EMAIL_ENABLED: boolString.default("false"),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
    SMTP_SECURE: boolString.default("false"),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    EMAIL_FROM: z.string().optional(),
    HOTEL_NOTIFY_EMAIL: z.string().email().optional(),

    AI_ENABLED: boolString.default("false"),
    OPENAI_API_KEY: z.string().optional(),
    OPENAI_MODEL: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    const problem = (path, message) => {
      ctx.addIssue({ code: "custom", path: [path], message });
    };

    if (env.NODE_ENV !== "test" && !env.MONGODB_URI) {
      problem("MONGODB_URI", "is required: paste your MongoDB Atlas connection string (see README, step 'MongoDB Atlas')");
    }
    if (env.MONGODB_URI && !extractDbName(env.MONGODB_URI)) {
      problem("MONGODB_URI", "must include a database name, e.g. ...mongodb.net/hotel_menara?retryWrites=true&w=majority");
    }
    if (env.MONGODB_URI_TEST) {
      const testDb = extractDbName(env.MONGODB_URI_TEST);
      if (!testDb || !testDb.endsWith("_test")) {
        problem("MONGODB_URI_TEST", "must include a database name ending with '_test' (tests wipe this database)");
      }
      if (env.MONGODB_URI && testDb && testDb === extractDbName(env.MONGODB_URI)) {
        problem("MONGODB_URI_TEST", "must use a different database than MONGODB_URI");
      }
    }
    if (env.NODE_ENV === "production") {
      if (env.JWT_SECRET.toLowerCase().includes("change-me")) {
        problem("JWT_SECRET", "still contains the example placeholder; generate a real secret");
      }
      if (env.CORS_ORIGINS.split(",").some((origin) => origin.trim() === "*")) {
        problem("CORS_ORIGINS", "must list explicit origins in production (no '*')");
      }
    }
    if (env.AI_ENABLED === "true") {
      if (!env.OPENAI_API_KEY) problem("OPENAI_API_KEY", "is required when AI_ENABLED=true");
      if (!env.OPENAI_MODEL) problem("OPENAI_MODEL", "is required when AI_ENABLED=true");
    }
    if (env.EMAIL_ENABLED === "true") {
      const required = ["SMTP_HOST", "SMTP_USER", "SMTP_PASS", "EMAIL_FROM", "HOTEL_NOTIFY_EMAIL"];
      for (const key of required) {
        if (!env[key]) problem(key, "is required when EMAIL_ENABLED=true");
      }
    }
  })
  .transform((env) => ({
    ...env,
    TRUST_PROXY: env.TRUST_PROXY === "true",
    EMAIL_ENABLED: env.EMAIL_ENABLED === "true",
    SMTP_SECURE: env.SMTP_SECURE === "true",
    AI_ENABLED: env.AI_ENABLED === "true",
    CORS_ORIGINS: env.CORS_ORIGINS.split(",")
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0),
  }));

class ConfigError extends Error {
  /** @param {string[]} problems one human readable line per invalid variable */
  constructor(problems) {
    super(`Invalid environment configuration:\n - ${problems.join("\n - ")}`);
    this.name = "ConfigError";
    this.problems = problems;
  }
}

function describeIssue(issue) {
  const name = issue.path.join(".") || "(root)";
  const missing = issue.message === "Required" || issue.message.includes("received undefined");
  return `${name}: ${missing ? "is missing (see .env.example)" : issue.message}`;
}

/** Validates a set of environment variables. Empty values are treated as "not set". */
function parseEnv(source) {
  const cleaned = {};
  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined && value.trim() !== "") cleaned[key] = value;
  }
  const result = schema.safeParse(cleaned);
  if (!result.success) throw new ConfigError(result.error.issues.map(describeIssue));
  return result.data;
}

module.exports = {
  extractDbName,
  ConfigError,
  parseEnv,
};
