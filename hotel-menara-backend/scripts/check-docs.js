const { checkConsistency } = require("./lib/docsConsistency");

const { problems, counts } = checkConsistency();
console.log(`Routes: ${counts.express} in Express, ${counts.openapi} in OpenAPI, ${counts.postman} distinct in Postman.`);
if (problems.length > 0) {
  console.error(`\n${problems.length} documentation problem(s):`);
  for (const problem of problems) console.error(` - ${problem}`);
  process.exit(1);
}
console.log("OpenAPI, Postman and Express routes are consistent.");
