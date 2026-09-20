import { expect, type Page } from "@playwright/test";

const API_URL = "http://localhost:4100/api";

export interface E2eUser {
  username: string;
  email: string;
  password: string;
}

/** Creates a throwaway account through the API, the way the mobile client does. */
export async function createUser(page: Page): Promise<E2eUser> {
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const user = { username: `m_${id}`, email: `m_${id}@example.com`, password: "Password1" };
  const response = await page.request.post(`${API_URL}/auth/register`, {
    data: user,
    headers: { "x-client-type": "mobile" },
  });
  expect(response.status(), "registering the e2e user").toBe(201);
  return user;
}

/** Signs in through the real login screen. */
export async function signInThroughUi(page: Page, user: E2eUser) {
  await page.goto("/");
  await page.getByPlaceholder("you@example.com").fill(user.email);
  await page.getByPlaceholder("••••••••").fill(user.password);
  await page.getByText("Sign in", { exact: true }).click();
  await expect(page.getByText(`, ${user.username}`)).toBeVisible();
}

export async function openCardDatabase(page: Page) {
  await page.getByRole("button", { name: "Card Database" }).click();
  await expect(page.getByText("Search every card in the catalog").or(page.getByTestId("card-total"))).toBeVisible();
  await expect(page.getByTestId("card-list")).toBeVisible();
}

export interface Problems {
  failedImages: string[];
  consoleErrors: string[];
}

export function watchForProblems(page: Page): Problems {
  const problems: Problems = { failedImages: [], consoleErrors: [] };
  page.on("response", (response) => {
    if (response.request().resourceType() === "image" && response.status() >= 400) {
      problems.failedImages.push(`${response.status()} ${response.url()}`);
    }
  });
  page.on("requestfailed", (request) => {
    if (request.resourceType() === "image") problems.failedImages.push(`FAILED ${request.url()}`);
  });
  page.on("console", (message) => {
    if (message.type() === "error") problems.consoleErrors.push(message.text());
  });
  return problems;
}

/**
 * Counts card images that really decoded in the browser. React Native Web renders <Image> as a
 * background-image plus a hidden <img>, so the <img> is what tells us whether the file loaded.
 */
export async function loadedCardImages(page: Page): Promise<{ total: number; loaded: number; sources: string[] }> {
  return page.evaluate(() => {
    // Only the Card Database list: screens underneath it (Discover's rails) stay mounted with their own card images.
    const imgs = Array.from(
      document.querySelectorAll<HTMLImageElement>('[data-testid="card-list"] [data-testid="card-image"] img'),
    );
    return {
      total: imgs.length,
      loaded: imgs.filter((img) => img.complete && img.naturalWidth > 0).length,
      sources: imgs.map((img) => img.currentSrc || img.src),
    };
  });
}
