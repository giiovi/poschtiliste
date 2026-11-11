const baseConfig = require("./jest.config.cjs");

/** @type {import('jest').Config} */
module.exports = {
  ...baseConfig,
  testMatch: [
    "**/require-auth.test.ts",
    "**/require-admin.test.ts",
    "**/shopping-list-access.test.ts",
  ],
  collectCoverage: true,
  collectCoverageFrom: [
    "src/authorization/shopping-list-access.ts",
    "src/middleware/require-auth.ts",
    "src/middleware/require-admin.ts",
  ],
  coverageReporters: ["text", "text-summary"],
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
};
