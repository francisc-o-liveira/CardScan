import { expect, test, type Page } from "@playwright/test";
import { createUser, loadedCardImages, openCardDatabase, signInThroughUi, watchForProblems } from "./helpers";

const search = (page: Page) => page.getByLabel("Search cards");

/** Waits until at least `min` card images are on screen and every one of them has decoded. */
async function expectImagesLoaded(page: Page, min = 1) {
  await expect
    .poll(async () => {
      const { total, loaded } = await loadedCardImages(page);
      return total >= min && loaded === total;
    }, { message: "card images did not finish loading", timeout: 45_000 })
    .toBe(true);
  return loadedCardImages(page);
}

test.describe("Mobile app — Card Database", () => {
  test.beforeEach(async ({ page }) => {
    const user = await createUser(page);
    await signInThroughUi(page, user);
  });

  test("opens from Home and shows real cards with images that actually loaded", async ({ page }) => {
    const problems = watchForProblems(page);
    await openCardDatabase(page);

    const { total, sources } = await expectImagesLoaded(page, 6);
    expect(total).toBeGreaterThanOrEqual(6);
    for (const src of sources) expect(src).toMatch(/^https?:\/\//);

    const count = await page.getByTestId("card-total").innerText();
    expect(Number(count.replace(/[^\d]/g, ""))).toBeGreaterThan(100_000);

    expect(problems.failedImages).toEqual([]);
  });

  for (const scenario of [
    { tcg: "Pokémon", term: "Charizard", host: "assets.tcgdex.net" },
    { tcg: "Magic: The Gathering", term: "Black Lotus", host: "cards.scryfall.io" },
    { tcg: "Yu-Gi-Oh!", term: "Blue-Eyes White Dragon", host: "localhost:4100/assets/yugioh/cards/" },
  ]) {
    test(`${scenario.tcg}: searching "${scenario.term}" loads matching cards and images`, async ({ page }) => {
      const problems = watchForProblems(page);
      await openCardDatabase(page);
      await page.getByLabel(scenario.tcg, { exact: true }).click();
      await search(page).fill(scenario.term);

      await expect(page.getByText(new RegExp(scenario.term, "i")).first()).toBeVisible();
      const { sources } = await expectImagesLoaded(page, 1);
      for (const src of sources) expect(src).toContain(scenario.host);
      // Never hotlink YGOPRODeck (they blacklist IPs): images must come from our own API.
      for (const src of sources) expect(src).not.toContain("ygoprodeck");

      expect(problems.failedImages).toEqual([]);
    });
  }

  test("scrolling to the end loads more cards (infinite scroll)", async ({ page }) => {
    await openCardDatabase(page);
    await expectImagesLoaded(page, 6);
    const before = (await loadedCardImages(page)).total;

    // The list is virtualized, so scroll it until the next page has been requested.
    const nextPage = page.waitForResponse((r) => r.url().includes("/api/cards") && r.url().includes("page=2"));
    await page.getByTestId("card-list").evaluate(async (list) => {
      const scroller = list as HTMLElement;
      for (let i = 0; i < 12; i++) {
        scroller.scrollTop = scroller.scrollHeight;
        await new Promise((r) => setTimeout(r, 250));
      }
    });
    expect((await nextPage).status()).toBe(200);
    await expectImagesLoaded(page, before);
  });

  test("filters by set through the picker", async ({ page }) => {
    await openCardDatabase(page);
    await page.getByLabel("Pokémon", { exact: true }).click();
    await page.getByLabel("Filter by set").click();
    await page.getByLabel("Search sets").fill("Base Set");
    await page.getByText("Base Set", { exact: true }).first().click();

    await expect(page.getByTestId("card-total")).toHaveText("102 cards");
    await expectImagesLoaded(page, 6);
  });

  test("shows an empty state for a search with no results", async ({ page }) => {
    await openCardDatabase(page);
    await search(page).fill("zzzz-no-such-card-zzzz");
    await expect(page.getByText("No cards found")).toBeVisible();
  });

  test("shows an error with retry when the API is unreachable, then recovers", async ({ page }) => {
    await openCardDatabase(page);
    let failing = true;
    await page.route("**/api/cards**", (route) => (failing ? route.abort() : route.continue()));
    await search(page).fill("pikachu");
    await expect(page.getByText(/Couldn.t load cards/)).toBeVisible();

    failing = false;
    await page.getByText("Try again").click();
    await expect(page.getByText(/pikachu/i).first()).toBeVisible();
    await expect(page.getByText(/Couldn.t load cards/)).toHaveCount(0);
  });

  test("a broken image falls back to a placeholder", async ({ page }) => {
    await page.route("**/assets.tcgdex.net/**", (route) => route.abort());
    await openCardDatabase(page);
    await page.getByLabel("Pokémon", { exact: true }).click();
    await search(page).fill("Charizard");
    await expect(page.getByTestId("card-image-fallback").first()).toBeVisible();
    await expect(page.getByText("Charizard").first()).toBeVisible();
  });

  test("keeps the session across a reload and can go back to Home", async ({ page }) => {
    await openCardDatabase(page);
    await page.reload();
    await expect(page.getByTestId("card-list")).toBeVisible();
    await page.getByLabel("Go back").click();
    await expect(page.getByText("Scan a Card")).toBeVisible();
  });
});

test("signed out, the card database redirects to login", async ({ page }) => {
  await page.goto("/cards");
  await expect(page.getByPlaceholder("you@example.com")).toBeVisible();
});
