import { prisma } from "../config/prisma";
import { PRICE_GAMES, syncPrices } from "../services/priceSyncService";

/**
 * `tsx syncPrices.ts pokemon` — one game; `tsx syncPrices.ts all` — every game
 * that has a catalog. Pass `--verbose` to list the TCGplayer groups that
 * couldn't be matched to a set.
 */
async function main() {
  const [target = "all", ...flags] = process.argv.slice(2);
  const verbose = flags.includes("--verbose");

  const slugs =
    target === "all"
      ? (await prisma.tcg.findMany({ select: { slug: true } }))
          .map((tcg) => tcg.slug)
          .filter((slug) => slug in PRICE_GAMES)
      : [target];

  for (const slug of slugs) {
    const start = Date.now();
    const result = await syncPrices(slug);
    const seconds = ((Date.now() - start) / 1000).toFixed(1);
    const pct = (n: number, of: number) => (of ? `${((100 * n) / of).toFixed(1)}%` : "—");
    console.log(
      `[price-sync:${slug}] Done in ${seconds}s — groups ${result.groupsMatched}/${result.groups} matched (${result.groupsFailed} failed), ` +
        `products ${result.productsMatched}/${result.products}, ` +
        `cards priced ${result.cardsPriced}/${result.cardsInCatalog} (${pct(result.cardsPriced, result.cardsInCatalog)}), ` +
        `${result.pricesWritten} prices written.`,
    );
    if (verbose && result.unmatchedGroups.length) {
      console.log(`[price-sync:${slug}] Unmatched groups:\n  ${result.unmatchedGroups.join("\n  ")}`);
    }
    if (verbose && result.looseMatches.length) {
      console.log(
        `[price-sync:${slug}] ${result.looseMatches.length} loose name matches:\n    ${result.looseMatches.join("\n    ")}`,
      );
    }
  }
}

main()
  .catch((error) => {
    console.error("[price-sync] Fatal error:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
