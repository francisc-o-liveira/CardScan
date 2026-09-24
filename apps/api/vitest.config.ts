import path from "node:path";
import os from "node:os";
import { defineConfig } from "vitest/config";
import { TEST_DATABASE_URL } from "./tests/constants";

// Tests run against a dedicated Postgres database so they can never touch development data.

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["./tests/global-setup.ts"],
    setupFiles: ["./tests/setup.ts"],
    // One shared database: run test files one at a time so they can't clobber each other's rows.
    fileParallelism: false,
    testTimeout: 30_000,
    env: {
      NODE_ENV: "test",
      DATABASE_URL: TEST_DATABASE_URL,
      // The quota has its own tests; everywhere else scans are not limited.
      FREE_SCANS_PER_DAY: "100000",
      WELCOME_SCAN_CREDITS: "0",
      SCAN_RATE_LIMIT: "10000",
      AUTH_RATE_LIMIT: "10000",
      JWT_SECRET: "test-access-secret",
      JWT_REFRESH_SECRET: "test-refresh-secret",
      CORS_ORIGIN: "http://localhost:3000, http://localhost:8081",
      API_PUBLIC_URL: "http://api.test",
      ASSETS_DIR: path.join(os.tmpdir(), "cardscan-test-assets"),
    },
  },
});
