const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { openApiSpec } = require("../../src/docs/openapi");
const { buildCollection, buildEnvironment, COLLECTION_VARIABLES, ENVIRONMENT_VARIABLES } = require("./postmanBuilder");

const ROOT = resolve(__dirname, "..", "..");
const HTTP_METHODS = ["get", "post", "put", "patch", "delete"];

/** Turns :id, {id} and {{variable}} into {} so routes from different sources can be compared. */
function normalizePath(path) {
  const normalized = path
    .replace(/\{\{[^}]+\}\}/g, "{}")
    .replace(/\{[^}]+\}/g, "{}")
    .replace(/:[A-Za-z0-9_]+/g, "{}")
    .replace(/\/+$/, "");
  return normalized === "" ? "/" : normalized;
}

const read = (relative) => readFileSync(resolve(ROOT, relative), "utf8");

/** Reads the real Express routers (src/routes) and returns "METHOD /normalized/path" keys. */
function collectExpressRoutes() {
  const index = read("src/routes/index.js");
  const fileByImport = new Map();
  for (const match of index.matchAll(/const (\w+) = require\("\.\/([\w.]+)"\)/g)) fileByImport.set(match[1], match[2]);

  const routes = new Set();
  const addRoutes = (source, prefix) => {
    for (const match of source.matchAll(/router\.(get|post|put|patch|delete)\(\s*"([^"]*)"/g)) {
      const sub = match[2] === "/" ? "" : match[2];
      routes.add(`${match[1].toUpperCase()} ${normalizePath(prefix + sub)}`);
    }
  };

  addRoutes(index, "");
  for (const match of index.matchAll(/router\.use\(\s*"([^"]+)"\s*,\s*(\w+)\s*\)/g)) {
    const file = fileByImport.get(match[2]);
    if (!file) throw new Error(`Cannot resolve router import "${match[2]}" in src/routes/index.js`);
    addRoutes(read(`src/routes/${file}.js`), match[1]);
  }
  return routes;
}

function collectOpenApiRoutes() {
  const routes = new Set();
  const paths = openApiSpec.paths;
  for (const [path, operations] of Object.entries(paths)) {
    for (const method of Object.keys(operations)) {
      if (HTTP_METHODS.includes(method)) routes.add(`${method.toUpperCase()} ${normalizePath(path)}`);
    }
  }
  return routes;
}

function collectPostmanRoutes(collection = buildCollection()) {
  const routes = new Set();
  const walk = (nodes) => {
    for (const node of nodes) {
      if (node.item) walk(node.item);
      if (node.request) {
        const withoutBase = node.request.url.raw.replace("{{baseUrl}}", "").split("?")[0];
        routes.add(`${node.request.method} ${normalizePath(withoutBase)}`);
      }
    }
  };
  walk(collection.item);
  return routes;
}

const diff = (a, b) => [...a].filter((item) => !b.has(item)).sort();

function checkConsistency() {
  const problems = [];
  const express = collectExpressRoutes();
  const openapi = collectOpenApiRoutes();
  const postman = collectPostmanRoutes();

  for (const route of diff(express, openapi)) problems.push(`Route implemented but missing from OpenAPI: ${route}`);
  for (const route of diff(openapi, express)) problems.push(`OpenAPI documents a route that does not exist: ${route}`);
  for (const route of diff(express, postman)) problems.push(`Route not covered by the Postman collection: ${route}`);
  for (const route of diff(postman, express)) problems.push(`Postman calls a route that does not exist: ${route}`);

  // Every {{variable}} used in the collection must be defined somewhere.
  const known = new Set([...Object.keys(COLLECTION_VARIABLES), ...ENVIRONMENT_VARIABLES]);
  const used = new Set();
  for (const match of JSON.stringify(buildCollection()).matchAll(/\{\{(\w+)\}\}/g)) used.add(match[1]);
  for (const name of [...used].sort()) if (!known.has(name)) problems.push(`Postman variable {{${name}}} is used but never defined`);

  // The committed JSON files must be exactly what the builder generates.
  const expected = [
    ["postman/hotel-menara.postman_collection.json", buildCollection()],
    ["postman/hotel-menara.postman_environment.json", buildEnvironment()],
  ];
  for (const [file, json] of expected) {
    let onDisk = "";
    try {
      onDisk = read(file);
    } catch {
      problems.push(`Missing file: ${file} (run npm run postman:generate)`);
      continue;
    }
    if (onDisk !== `${JSON.stringify(json, null, 2)}\n`) problems.push(`${file} is out of date (run npm run postman:generate)`);
  }

  return { problems, counts: { express: express.size, openapi: openapi.size, postman: postman.size } };
}

module.exports = {
  normalizePath,
  collectExpressRoutes,
  collectOpenApiRoutes,
  collectPostmanRoutes,
  checkConsistency,
};
