import { defineConfig, devices } from "@playwright/test";

/**
 * Runs the Expo app's *web* build (React Native Web) in a real browser against the real API and
 * database. It exercises the same screens, hooks, API client and image resolution as the phone app,
 * but not native code — SecureStore falls back to localStorage, and the camera is not involved.
 * Needs Postgres running and the catalogs imported (`pnpm docker:up`, `pnpm sync:*`).
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  expect: { timeout: 30_000 },
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:8081",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...devices["Pixel 7"],
  },
  projects: [{ name: "phone", use: {} }],
  webServer: [
    {
      command: "pnpm --filter @cardscan/api dev",
      url: "http://localhost:4100/health",
      reuseExistingServer: true,
      timeout: 120_000,
      env: { AUTH_RATE_LIMIT: "1000" },
    },
    {
      command: "pnpm --filter @cardscan/mobile exec expo start --web --port 8081",
      url: "http://localhost:8081",
      reuseExistingServer: true,
      timeout: 300_000,
      env: { EXPO_PUBLIC_API_URL: "http://localhost:4100/api", CI: "1" },
    },
  ],
});
