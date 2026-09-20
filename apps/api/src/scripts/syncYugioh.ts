import { prisma } from "../config/prisma";
import { syncYugiohCatalog } from "../services/yugiohSyncService";

async function main() {
  const skipImages = process.argv.includes("--skip-images");
  console.log(`[yugioh-sync] Starting YGOPRODeck catalog sync${skipImages ? " (skipping image downloads)" : ""}...`);
  const start = Date.now();
  const result = await syncYugiohCatalog({ skipImages });
  const seconds = ((Date.now() - start) / 1000).toFixed(1);
  console.log(
    `[yugioh-sync] Done in ${seconds}s — ${result.setsProcessed} sets, ${result.cardsUpserted} printings upserted, ` +
      `${result.imagesDownloaded} images downloaded, ${result.imagesFailed} failed, ${result.imagesMissing} printings without an image.`,
  );
}

main()
  .catch((error) => {
    console.error("[yugioh-sync] Fatal error:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
