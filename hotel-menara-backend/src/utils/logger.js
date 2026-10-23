const { env } = require("../config/env");

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

function write(level, message, meta) {
  if (LEVELS[level] > LEVELS[env.LOG_LEVEL]) return;
  const line = JSON.stringify({ time: new Date().toISOString(), level, message, ...meta });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

const logger = {
  error: (message, meta) => write("error", message, meta),
  warn: (message, meta) => write("warn", message, meta),
  info: (message, meta) => write("info", message, meta),
  debug: (message, meta) => write("debug", message, meta),
};

module.exports = {
  logger,
};
