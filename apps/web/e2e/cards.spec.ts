import { expect, test } from "@playwright/test";
import { expectAllCardImagesLoaded, signIn, watchForProblems } from "./helpers";

const cardList = (page: import("@playwright/test").Page) => page.getByRole("list", { name: "Cards" });

test.describe("Card Database — loading cards in the browser", () => {
  test.beforeEach(({ page }) => signIn(page));

  test("shows the first page of real cards with every image actually loaded", async ({ page }) => {
    const problems = watchForProblems(page);
    await page.goto("/cards");

    const list = cardList(page);
    await expect(list).toBeVisible();
    await expect(list.getByRole("listitem")).toHaveCount(24);
    expect(await expectAllCardImagesLoaded(list)).toBeGreaterThan(0);

    // Total across all three catalogs (Pokémon + Magic + Yu-Gi-Oh!) — far more than one page.
    await expect(page.getByText(/^[\d,]+ cards$/)).toBeVisible();
    const total = Number((await page.getByText(/^[\d,]+ cards$/).innerText()).replace(/[^\d]/g, ""));
    expect(total).toBeGreaterThan(100_000);

    expect(problems.failedRequests).toEqual([]);
    expect(problems.consoleErrors).toEqual([]);
  });

  for (const scenario of [
    { tcg: "Pokémon", search: "Charizard", expectedName: /charizard/i, imageHost: "assets.tcgdex.net" },
    { tcg: "Magic: The Gathering", search: "Black Lotus", expectedName: /black lotus/i, imageHost: "cards.scryfall.io" },
    { tcg: "Yu-Gi-Oh!", search: "Blue-Eyes White Dragon", expectedName: /blue-eyes white dragon/i, imageHost: "/assets/yugioh/cards/" },
  ]) {
    test(`${scenario.tcg}: searching "${scenario.search}" shows matching cards with loaded images`, async ({ page }) => {
      const problems = watchForProblems(page);
      await page.goto("/cards");
      await expect(cardList(page)).toBeVisible();

      await page.getByLabel("Filter by TCG").selectOption({ label: scenario.tcg });
      await page.getByLabel("Search cards").fill(scenario.search);

      const list = cardList(page);
      await expect(list.getByText(scenario.expectedName).first()).toBeVisible();
      await expect(page.getByText(/cards$/).first()).toBeVisible();
      const names = await list.locator("p.font-medium").allInnerTexts();
      expect(names.length).toBeGreaterThan(0);
      for (const name of names) expect(name).toMatch(new RegExp(scenario.search.split(" ")[0]!, "i"));

      await expectAllCardImagesLoaded(list);
      const sources = await list.getByTestId("card-image").evaluateAll((imgs) => imgs.map((i) => (i as HTMLImageElement).src));
      for (const src of sources) expect(src).toContain(scenario.imageHost);
      // YGOPRODeck blacklists hotlinkers: our images must be served from our own API, never from their host.
      for (const src of sources) expect(src).not.toContain("ygoprodeck");

      expect(problems.failedRequests).toEqual([]);
    });
  }

  test("Yu-Gi-Oh! images are served by our API with a cross-origin-friendly header", async ({ page, request }) => {
    await page.goto("/cards");
    await page.getByLabel("Filter by TCG").selectOption({ label: "Yu-Gi-Oh!" });
    await page.getByLabel("Search cards").fill("Dark Magician");
    const image = cardList(page).getByTestId("card-image").first();
    await expect(image).toBeVisible();
    const src = await image.getAttribute("src");

    const response = await request.get(src!);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("image/jpeg");
    expect(response.headers()["cross-origin-resource-policy"]).toBe("cross-origin");
  });

  test("pagination moves to a different page of cards", async ({ page }) => {
    await page.goto("/cards");
    const list = cardList(page);
    await expect(list).toBeVisible();
    const firstPageNames = await list.locator("p.font-medium").allInnerTexts();
    await expect(page.getByText(/^Page 1 of/)).toBeVisible();

    await page.getByRole("button", { name: /next/i }).click();
    await expect(page.getByText(/^Page 2 of/)).toBeVisible();
    await expect.poll(async () => (await list.locator("p.font-medium").allInnerTexts())[0]).not.toBe(firstPageNames[0]);
    await expectAllCardImagesLoaded(list);

    await page.getByRole("button", { name: /previous/i }).click();
    await expect(page.getByText(/^Page 1 of/)).toBeVisible();
  });

  test("filtering by a set narrows the results to that set", async ({ page }) => {
    await page.goto("/cards");
    await page.getByLabel("Filter by TCG").selectOption({ label: "Pokémon" });
    const setSelect = page.getByLabel("Filter by set");
    await expect(setSelect).toBeEnabled();
    await expect(setSelect.getByRole("option", { name: "Base Set", exact: true })).toBeAttached();
    await setSelect.selectOption({ label: "Base Set" });

    const list = cardList(page);
    await expect(page.getByText("102 cards")).toBeVisible();
    await expect(list.getByText("Base Set · ").first()).toBeVisible();
    for (const line of await list.locator("p.text-xs").allInnerTexts()) {
      if (line.includes("·")) expect(line).toContain("Base Set");
    }
    await expectAllCardImagesLoaded(list);
  });

  test("shows an empty state for a search with no results", async ({ page }) => {
    await page.goto("/cards");
    await page.getByLabel("Search cards").fill("zzzz-no-such-card-zzzz");
    await expect(page.getByText("No cards found")).toBeVisible();
  });

  test("shows an error with a retry when the API is unreachable, then recovers", async ({ page }) => {
    await page.goto("/cards");
    await expect(cardList(page)).toBeVisible();

    let failing = true;
    await page.route("**/api/cards**", (route) => (failing ? route.abort() : route.continue()));
    await page.getByLabel("Search cards").fill("pikachu");
    await expect(page.getByRole("alert").filter({ hasText: "Try again" })).toContainText(/couldn.t load cards/i);

    failing = false;
    await page.getByRole("button", { name: /try again/i }).click();
    await expect(cardList(page).getByText(/pikachu/i).first()).toBeVisible();
    await expect(page.getByRole("alert").filter({ hasText: "Try again" })).toHaveCount(0);
  });

  test("a card whose image is broken falls back to a placeholder instead of a broken icon", async ({ page }) => {
    await page.route("**/assets.tcgdex.net/**", (route) => route.abort());
    await page.goto("/cards");
    await page.getByLabel("Filter by TCG").selectOption({ label: "Pokémon" });
    await page.getByLabel("Search cards").fill("Charizard");
    await expect(cardList(page).getByTestId("card-image-fallback").first()).toBeVisible();
    await expect(cardList(page).getByText("Charizard").first()).toBeVisible();
  });
});

test.describe("Card Database — access and layout", () => {
  test.beforeEach(({ page }) => signIn(page));

  test("keeps the user signed in across a full page reload (silent refresh)", async ({ page }) => {
    await page.goto("/cards");
    await expect(cardList(page)).toBeVisible();
    await page.reload();
    await expect(cardList(page)).toBeVisible();
    await expect(page).toHaveURL(/\/cards$/);
  });

  test("has no horizontal scrolling", async ({ page }) => {
    await page.goto("/cards");
    await expect(cardList(page)).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("is reachable from the navigation", async ({ page, isMobile }) => {
    await page.goto("/dashboard");
    if (isMobile) {
      // The mobile bottom bar has no Card Database entry; the page must still work by URL.
      await page.goto("/cards");
    } else {
      await page.getByRole("link", { name: "Card Database" }).click();
    }
    await expect(page.getByRole("heading", { name: "Card Database" })).toBeVisible();
    await expect(cardList(page)).toBeVisible();
  });
});

test.describe("Card Database — signed out", () => {
  test("redirects to the login page", async ({ page }) => {
    await page.goto("/cards");
    await expect(page).toHaveURL(/\/login/);
  });
});
