import { expect, test } from "@playwright/test";
import { expectAllCardImagesLoaded, signIn, watchForProblems } from "./helpers";

const cardGrid = (page: import("@playwright/test").Page) => page.getByTestId("card-grid");
const searchBox = (page: import("@playwright/test").Page) =>
  page.getByLabel("Search cards by name, set or number");
/** The tile's name line — one per card in the grid. */
const cardNames = (page: import("@playwright/test").Page) => cardGrid(page).locator("p.font-medium");

test.describe("Search — loading cards in the browser", () => {
  test.beforeEach(({ page }) => signIn(page));

  test("shows a full page of real cards with every image actually loaded", async ({ page }) => {
    const problems = watchForProblems(page);
    await page.goto("/search?q=dragon");

    const grid = cardGrid(page);
    await expect(grid).toBeVisible();
    // PAGE_SIZE is 30 and "dragon" matches far more than that across the catalogs.
    await expect(cardNames(page)).toHaveCount(30);
    expect(await expectAllCardImagesLoaded(grid)).toBeGreaterThan(0);

    await expect(page.getByText(/^[\d,]+ cards found$/)).toBeVisible();

    expect(problems.failedRequests).toEqual([]);
    expect(problems.consoleErrors).toEqual([]);
  });

  for (const scenario of [
    { game: "Pokémon", search: "Charizard", expectedName: /charizard/i, imageHost: "assets.tcgdex.net" },
    { game: "Magic", search: "Black Lotus", expectedName: /black lotus/i, imageHost: "cards.scryfall.io" },
    {
      game: "Yu-Gi-Oh!",
      search: "Blue-Eyes White Dragon",
      expectedName: /blue-eyes white dragon/i,
      imageHost: "/assets/yugioh/cards/",
    },
  ]) {
    test(`${scenario.game}: searching "${scenario.search}" shows matching cards with loaded images`, async ({
      page,
    }) => {
      const problems = watchForProblems(page);
      await page.goto("/search");

      await page.getByRole("radio", { name: scenario.game, exact: true }).click();
      await searchBox(page).fill(scenario.search);

      const grid = cardGrid(page);
      await expect(grid.getByText(scenario.expectedName).first()).toBeVisible();
      await expect(page.getByText(/^[\d,]+ cards? found$/)).toBeVisible();

      const names = await cardNames(page).allInnerTexts();
      expect(names.length).toBeGreaterThan(0);
      for (const name of names) expect(name).toMatch(new RegExp(scenario.search.split(" ")[0]!, "i"));

      await expectAllCardImagesLoaded(grid);
      const sources = await grid
        .getByTestId("card-image")
        .evaluateAll((imgs) => imgs.map((i) => (i as HTMLImageElement).src));
      for (const src of sources) expect(src).toContain(scenario.imageHost);
      // YGOPRODeck blacklists hotlinkers: our images must be served from our own API, never from their host.
      for (const src of sources) expect(src).not.toContain("ygoprodeck");

      expect(problems.failedRequests).toEqual([]);
    });
  }

  test("Yu-Gi-Oh! images are served by our API with a cross-origin-friendly header", async ({
    page,
    request,
  }) => {
    await page.goto("/search");
    await page.getByRole("radio", { name: "Yu-Gi-Oh!", exact: true }).click();
    await searchBox(page).fill("Dark Magician");
    const image = cardGrid(page).getByTestId("card-image").first();
    await expect(image).toBeVisible();
    const src = await image.getAttribute("src");

    const response = await request.get(src!);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("image/jpeg");
    expect(response.headers()["cross-origin-resource-policy"]).toBe("cross-origin");
  });

  test("pagination moves to a different page of cards", async ({ page }) => {
    await page.goto("/search?q=dragon");
    const grid = cardGrid(page);
    await expect(grid).toBeVisible();
    const firstPageNames = await cardNames(page).allInnerTexts();
    await expect(page.getByText(/^Page 1 of/)).toBeVisible();

    await page.getByRole("button", { name: /next/i }).click();
    await expect(page.getByText(/^Page 2 of/)).toBeVisible();
    await expect.poll(async () => (await cardNames(page).allInnerTexts())[0]).not.toBe(firstPageNames[0]);
    await expectAllCardImagesLoaded(grid);

    await page.getByRole("button", { name: /previous/i }).click();
    await expect(page.getByText(/^Page 1 of/)).toBeVisible();
  });

  test("filtering by a set narrows the results to that set", async ({ page }) => {
    await page.goto("/search?q=char");
    await expect(cardGrid(page)).toBeVisible();

    await page.getByRole("button", { name: /filters/i }).click();
    const sheet = page.getByRole("dialog", { name: "Filters" });
    await sheet.getByRole("button", { name: "Pokémon", exact: true }).click();
    await sheet.getByLabel("Filter sets").fill("Base Set");
    await sheet.getByRole("button", { name: /^Base Set/ }).first().click();
    await sheet.getByRole("button", { name: "Show results" }).click();

    const grid = cardGrid(page);
    await expect(grid.getByText("Base Set · ").first()).toBeVisible();
    for (const line of await grid.locator("p.text-faint").allInnerTexts()) {
      if (line.includes("·")) expect(line).toContain("Base Set");
    }
    await expectAllCardImagesLoaded(grid);
  });

  test("shows an empty state for a search with no results", async ({ page }) => {
    await page.goto("/search");
    await searchBox(page).fill("zzzz-no-such-card-zzzz");
    await expect(page.getByText(/^No cards match "zzzz-no-such-card-zzzz"$/)).toBeVisible();
  });

  test("shows an error with a retry when the API is unreachable, then recovers", async ({ page }) => {
    await page.goto("/search?q=dragon");
    await expect(cardGrid(page)).toBeVisible();

    let failing = true;
    await page.route("**/api/cards**", (route) => (failing ? route.abort() : route.continue()));
    await searchBox(page).fill("pikachu");
    await expect(page.getByRole("alert")).toContainText(/search didn.t come back/i);

    failing = false;
    await page.getByRole("button", { name: /try again/i }).click();
    await expect(cardGrid(page).getByText(/pikachu/i).first()).toBeVisible();
    await expect(page.getByRole("alert")).toHaveCount(0);
  });

  test("a card whose image is broken falls back to a placeholder instead of a broken icon", async ({
    page,
  }) => {
    await page.route("**/assets.tcgdex.net/**", (route) => route.abort());
    await page.goto("/search");
    await page.getByRole("radio", { name: "Pokémon", exact: true }).click();
    await searchBox(page).fill("Charizard");
    await expect(cardGrid(page).getByTestId("card-image-fallback").first()).toBeVisible();
    await expect(cardGrid(page).getByText("Charizard").first()).toBeVisible();
  });
});

test.describe("Search — access and layout", () => {
  test.beforeEach(({ page }) => signIn(page));

  test("keeps the user signed in across a full page reload (silent refresh)", async ({ page }) => {
    await page.goto("/search?q=dragon");
    await expect(cardGrid(page)).toBeVisible();
    await page.reload();
    await expect(cardGrid(page)).toBeVisible();
    await expect(page).toHaveURL(/\/search/);
  });

  test("has no horizontal scrolling", async ({ page }) => {
    await page.goto("/search?q=dragon");
    await expect(cardGrid(page)).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("is reachable from the navigation", async ({ page, isMobile }) => {
    await page.goto("/home");
    await page
      .getByRole("link", { name: isMobile ? "Search cards and sets" : /search cards or sets/i })
      .click();
    await expect(page.getByRole("heading", { name: "Search", level: 1 })).toBeVisible();
    await expect(searchBox(page)).toBeVisible();
  });

  test("the old /cards route still lands on search", async ({ page }) => {
    await page.goto("/cards");
    await expect(page).toHaveURL(/\/search/);
    await expect(page.getByRole("heading", { name: "Search", level: 1 })).toBeVisible();
  });
});

test.describe("Search — signed out", () => {
  test("redirects to the login page", async ({ page }) => {
    await page.goto("/search");
    await expect(page).toHaveURL(/\/login/);
  });
});
