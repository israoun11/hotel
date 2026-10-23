const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  { ignores: ["node_modules/**", "coverage/**"] },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "commonjs",
      globals: { ...globals.node },
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-console": "error",
      eqeqeq: ["error", "always"],
    },
  },
  {
    // CLI scripts and the logger are allowed to print to the console.
    files: ["scripts/**/*.js", "src/scripts/**/*.js", "src/utils/logger.js"],
    rules: { "no-console": "off" },
  },
];
