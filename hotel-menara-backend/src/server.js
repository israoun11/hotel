const { createApp } = require("./app");
const { connectDb, disconnectDb } = require("./config/db");
const { env } = require("./config/env");
const { logger } = require("./utils/logger");

async function main() {
  const dbName = await connectDb();
  logger.info("MongoDB connected", { database: dbName });

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`API listening on http://localhost:${env.PORT}`, {
      docs: `http://localhost:${env.PORT}/api/docs`,
      environment: env.NODE_ENV,
      email: env.EMAIL_ENABLED ? "enabled" : "disabled",
      ai: env.AI_ENABLED ? "enabled" : "disabled",
    });
  });

  const shutdown = (signal) => {
    logger.info(`${signal} received, shutting down`);
    server.close(() => {
      void disconnectDb().then(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection", { reason: reason instanceof Error ? reason.stack : String(reason) });
});

main().catch((error) => {
  logger.error("Server failed to start", { reason: error instanceof Error ? error.message : String(error) });
  process.exit(1);
});
