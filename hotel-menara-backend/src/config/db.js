const mongoose = require("mongoose");
const { env } = require("./env");
const { extractDbName } = require("./env.schema");
const { logger } = require("../utils/logger");

/** The URI actually used: the isolated test database when NODE_ENV=test. */
function getMongoUri() {
  const uri = env.NODE_ENV === "test" ? env.MONGODB_URI_TEST : env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      env.NODE_ENV === "test"
        ? "MONGODB_URI_TEST is not set: database tests cannot run."
        : "MONGODB_URI is not set.",
    );
  }
  return uri;
}

async function connectDb() {
  const uri = getMongoUri();
  mongoose.set("strictQuery", true);
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    // Make sure every unique index exists before serving traffic (booking safety relies on them).
    await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    logger.error(
      "Could not connect to MongoDB. Check the username/password, the Atlas Network Access (IP allow list) and the URI format.",
      { reason },
    );
    throw error;
  }
  return extractDbName(uri) ?? "unknown";
}

async function disconnectDb() {
  await mongoose.disconnect();
}

module.exports = {
  getMongoUri,
  connectDb,
  disconnectDb,
};
