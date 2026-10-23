const { mkdirSync, writeFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { buildCollection, buildEnvironment } = require("./lib/postmanBuilder");

const dir = resolve(__dirname, "..", "postman");
mkdirSync(dir, { recursive: true });
writeFileSync(resolve(dir, "hotel-menara.postman_collection.json"), `${JSON.stringify(buildCollection(), null, 2)}\n`);
writeFileSync(resolve(dir, "hotel-menara.postman_environment.json"), `${JSON.stringify(buildEnvironment(), null, 2)}\n`);
console.log("Postman files written to /postman");
