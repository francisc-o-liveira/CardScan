import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests drive a real browser against the real API, database and re-hosted images,
 * so they need Postgres running and the catalogs imported (`pnpm docker:up`, `pnpm sync:*`).
 * Servers that are already running are reused; otherwise Playwright starts them.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /auth.setup.ts/ },
    {
      name: "desktop",
      testIgnore: /auth.setup.ts/,
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      testIgnore: /auth.setup.ts/,
      dependencies: ["setup"],
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: [
    {
      command: "pnpm --filter @cardscan/api dev",
      url: "http://localhost:4100/health",
      reuseExistingServer: true,
      timeout: 120_000,
      // The auth limiter (20 requests / 15 min) is meant for real traffic, not a test run.
      env: { AUTH_RATE_LIMIT: "1000" },
    },
    {
      command: "pnpm --filter @cardscan/web dev",
      url: "http://localhost:3000/login",
      reuseExistingServer: true,
      timeout: 240_000,
    },
  ],
});
