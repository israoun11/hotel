require("dotenv/config");
const { ConfigError, parseEnv } = require("./env.schema");

function load() {
  try {
    return parseEnv(process.env);
  } catch (error) {
    if (error instanceof ConfigError) {
      process.stderr.write(`\n${error.message}\n\nFix your .env file (see .env.example and README.md).\n\n`);
      process.exit(1);
    }
    throw error;
  }
}

const env = load();

module.exports = {
  env,
};
