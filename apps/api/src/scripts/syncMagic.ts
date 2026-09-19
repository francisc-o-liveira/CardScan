import { prisma } from "../config/prisma";
import { syncMagicCatalog } from "../services/magicSyncService";

async function main() {
  console.log("[magic-sync] Starting Scryfall Magic: The Gathering catalog sync...");
  const start = Date.now();
  const result = await syncMagicCatalog();
  const seconds = ((Date.now() - start) / 1000).toFixed(1);
  console.log(
    `[magic-sync] Done in ${seconds}s — ${result.setsProcessed} sets synced, ${result.cardsUpserted} cards upserted, ${result.cardsSkipped} skipped (digital-only or unmatched set).`,
  );
}

main()
  .catch((error) => {
    console.error("[magic-sync] Fatal error:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
