/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+\\.m?js$": ["babel-jest", { configFile: "./babel.jest.config.js" }],
  },
  // Transform ESM-only packages (jose v6 and bs58 v6 ship no CJS build)
  transformIgnorePatterns: ["/node_modules/(?!(jose|bs58)/)"],
  setupFiles: ["./jest.setup.js"],
  testPathIgnorePatterns: ["/node_modules/", "/.next/", "/e2e/"],
  collectCoverageFrom: [
    "lib/**/*.js",
    "utils/**/*.js",
    "hooks/**/*.js",
    "!lib/prisma.js",
    "!lib/emailTemplates.js",
  ],
  coverageDirectory: "coverage",
  testTimeout: 30000,
  // Silence noisy console output during tests
  silent: false,
};
