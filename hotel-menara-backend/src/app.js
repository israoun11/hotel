const cors = require("cors");
const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const swaggerUi = require("swagger-ui-express");
const { env } = require("./config/env");
const { openApiSpec } = require("./docs/openapi");
const { errorHandler, notFound } = require("./middleware/errorHandler");
const { globalLimiter } = require("./middleware/rateLimit");
const routes = require("./routes");
const { logger } = require("./utils/logger");

function createApp() {
  const app = express();
  app.set("trust proxy", env.TRUST_PROXY);

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        // Requests without an Origin header (Postman, curl, server-to-server) are allowed.
        callback(null, !origin || env.CORS_ORIGINS.includes(origin));
      },
    }),
  );
  if (env.NODE_ENV !== "test") {
    app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev", { stream: { write: (line) => logger.info(line.trim()) } }));
  }
  app.use(globalLimiter);
  app.use(express.json({ limit: "100kb" }));

  app.get("/", (_req, res) => {
    res.json({ success: true, data: { name: "Hotel Menara Hammamet API", version: "v1", docs: "/api/docs", health: "/api/v1/health" } });
  });
  app.get("/api/docs.json", (_req, res) => {
    res.json(openApiSpec);
  });
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec, { customSiteTitle: "Hotel Menara API docs" }));
  app.use("/api/v1", routes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = {
  createApp,
};
