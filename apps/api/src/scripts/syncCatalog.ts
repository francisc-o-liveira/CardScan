import { prisma } from "../config/prisma";
import { CATALOG_SLUGS, createProvider, isCatalogSlug, type CatalogSlug } from "../providers/registry";
import { syncCatalog } from "../services/catalogSyncService";

/** Usage: tsx src/scripts/syncCatalog.ts <lorcana|onepiece|digimon|starwars|fab|all> [--skip-images] */
async function main() {
  const args = process.argv.slice(2);
  const skipImages = args.includes("--skip-images");
  const target = args.find((arg) => !arg.startsWith("--"));

  let slugs: CatalogSlug[];
  if (target === "all") slugs = CATALOG_SLUGS;
  else if (target && isCatalogSlug(target)) slugs = [target];
  else {
    console.error(`Usage: syncCatalog <${[...CATALOG_SLUGS, "all"].join("|")}> [--skip-images]`);
    process.exitCode = 1;
    return;
  }

  let failed = 0;
  for (const slug of slugs) {
    const start = Date.now();
    console.log(`[${slug}-sync] Starting${skipImages ? " (skipping image downloads)" : ""}...`);
    try {
      const r = await syncCatalog(createProvider(slug), { skipImages });
      const seconds = ((Date.now() - start) / 1000).toFixed(1);
      console.log(
        `[${slug}-sync] Done in ${seconds}s — ${r.setsProcessed} sets, ${r.cardsUpserted} cards upserted` +
          `${r.duplicatesMerged ? `, ${r.duplicatesMerged} duplicates merged` : ""}` +
          `${r.imagesDownloaded || r.imagesFailed ? `, ${r.imagesDownloaded} images downloaded (${r.imagesFailed} failed)` : ""}` +
          `, ${r.cardsWithoutImage} without an image.`,
      );
    } catch (error) {
      failed++;
      console.error(`[${slug}-sync] Failed:`, error instanceof Error ? error.message : error);
    }
  }
  if (failed) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error("[catalog-sync] Fatal error:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
