import { prisma } from "../config/prisma";
import { syncPokemonCatalog } from "../services/pokemonSyncService";

async function main() {
  console.log("[pokemon-sync] Starting TCGdex Pokémon catalog sync...");
  const start = Date.now();
  const result = await syncPokemonCatalog();
  const seconds = ((Date.now() - start) / 1000).toFixed(1);
  console.log(
    `[pokemon-sync] Done in ${seconds}s — ${result.setsProcessed} sets synced, ${result.setsFailed} failed, ${result.cardsUpserted} cards upserted.`,
  );
}

main()
  .catch((error) => {
    console.error("[pokemon-sync] Fatal error:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
