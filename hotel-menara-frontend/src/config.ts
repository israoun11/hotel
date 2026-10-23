/** Frontend configuration, read from Vite environment variables (see .env.example). No secrets here. */
// `import.meta.env` is provided by Vite; it is undefined when modules run directly in Node (unit tests).
const env: Partial<ImportMetaEnv> = import.meta.env ?? {};

export const API_BASE_URL = (env.VITE_API_BASE_URL || "http://localhost:4000/api/v1").replace(/\/+$/, "");

const timeout = Number(env.VITE_API_TIMEOUT_MS);
export const API_TIMEOUT_MS = Number.isFinite(timeout) && timeout >= 1000 ? timeout : 15000;
