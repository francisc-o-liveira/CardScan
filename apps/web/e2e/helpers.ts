import fs from "node:fs";
import path from "node:path";
import { expect, type Locator, type Page } from "@playwright/test";

export const E2E_USER_FILE = path.join(__dirname, ".auth/user-credentials.json");

export const newE2eUser = () => {
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return { username: `e2e_${id}`, email: `e2e_${id}@example.com`, password: "Password1" };
};

export interface ImageProblems {
  failedRequests: string[];
  consoleErrors: string[];
}

/** Records every image request that fails (HTTP >= 400) and every console error while a test runs. */
export function watchForProblems(page: Page): ImageProblems {
  const problems: ImageProblems = { failedRequests: [], consoleErrors: [] };
  page.on("response", (response) => {
    if (response.request().resourceType() === "image" && response.status() >= 400) {
      problems.failedRequests.push(`${response.status()} ${response.url()}`);
    }
  });
  page.on("requestfailed", (request) => {
    if (request.resourceType() === "image") problems.failedRequests.push(`FAILED ${request.url()}`);
  });
  page.on("console", (message) => {
    if (message.type() === "error") problems.consoleErrors.push(message.text());
  });
  return problems;
}

/** Scrolls every card into view (images are lazy-loaded) and waits until each one has really decoded. */
export async function expectAllCardImagesLoaded(cards: Locator) {
  const images = cards.getByTestId("card-image");
  const count = await images.count();
  for (let i = 0; i < count; i++) {
    await images.nth(i).scrollIntoViewIfNeeded();
  }
  await expect
    .poll(
      async () =>
        images.evaluateAll((nodes) =>
          nodes.filter((n) => !(n as HTMLImageElement).complete || (n as HTMLImageElement).naturalWidth === 0).length,
        ),
      { message: "some card images did not load", timeout: 30_000 },
    )
    .toBe(0);
  return count;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4100/api";

/**
 * Signs the browser context in through the API. Refresh tokens rotate on every use, so a session
 * saved once and shared between tests would be revoked by the first page load — each test logs in itself.
 */
export async function signIn(page: Page) {
  const { email, password } = JSON.parse(fs.readFileSync(E2E_USER_FILE, "utf8")) as { email: string; password: string };
  const response = await page.request.post(`${API_URL}/auth/login`, { data: { email, password } });
  expect(response.ok(), "e2e login should succeed").toBe(true);
}
