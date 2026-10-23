const { randomBytes } = require("node:crypto");
const { existsSync, readFileSync, writeFileSync } = require("node:fs");
const { resolve } = require("node:path");

const root = resolve(__dirname, "..");
const target = resolve(root, ".env");
const template = resolve(root, ".env.example");

if (existsSync(target)) {
  console.log(".env already exists: it was NOT modified.");
  process.exit(0);
}

const secret = randomBytes(48).toString("base64url");
const content = readFileSync(template, "utf8").replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${secret}`);
// flag "wx" fails instead of overwriting if the file appeared in the meantime.
writeFileSync(target, content, { flag: "wx" });

console.log(".env created with a freshly generated JWT_SECRET.");
console.log("Now open .env and paste your MongoDB Atlas connection string in MONGODB_URI.");
