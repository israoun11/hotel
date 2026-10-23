// Parses every .js file with Node and reports syntax errors.
const { spawnSync } = require("node:child_process");
const { readdirSync } = require("node:fs");
const { join, resolve } = require("node:path");

const root = resolve(__dirname, "..");
const IGNORED = new Set(["node_modules", "coverage", ".git"]);

function listJsFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) return IGNORED.has(entry.name) ? [] : listJsFiles(join(dir, entry.name));
    return entry.name.endsWith(".js") ? [join(dir, entry.name)] : [];
  });
}

const files = listJsFiles(root);
const failures = files.filter((file) => spawnSync(process.execPath, ["--check", file], { encoding: "utf8" }).status !== 0);

if (failures.length > 0) {
  console.error("Syntax errors found in:");
  for (const file of failures) {
    const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
    console.error(`\n${file}\n${result.stderr}`);
  }
  process.exit(1);
}
console.log(`Syntax OK: ${files.length} JavaScript files checked.`);
