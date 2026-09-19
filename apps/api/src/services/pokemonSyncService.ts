import { prisma } from "../config/prisma";
import { mapWithConcurrency } from "../utils/concurrency";
import { fetchSets, fetchSetDetail } from "../providers/pokemon/tcgdexClient";
import { buildCardImageUrl, buildAssetUrl } from "../providers/pokemon/image";

const SET_FETCH_CONCURRENCY = 8;

/**
 * TCGdex's compound unique key for `Card` is (tcgId, setId, collectorNumber, variant).
 * Postgres never treats two NULLs as equal in a unique index, so upserting with
 * `variant: null` would insert a fresh duplicate row on every re-run instead of
 * matching the existing one. Using "" as the "no distinct variant" sentinel keeps
 * the sync idempotent.
 */
const DEFAULT_VARIANT = "";

export interface PokemonSyncResult {
  setsProcessed: number;
  setsFailed: number;
  cardsUpserted: number;
}

export const syncPokemonCatalog = async (): Promise<PokemonSyncResult> => {
  const tcg = await prisma.tcg.upsert({
    where: { slug: "pokemon" },
    update: {},
    create: { slug: "pokemon", name: "Pokémon", isEnabled: true },
  });

  const sets = await fetchSets();
  console.log(`[pokemon-sync] Found ${sets.length} sets from TCGdex`);

  let setsProcessed = 0;
  let setsFailed = 0;
  let cardsUpserted = 0;

  await mapWithConcurrency(sets, SET_FETCH_CONCURRENCY, async (setBrief, index) => {
    try {
      const detail = await fetchSetDetail(setBrief.id);

      const symbolBase = detail.symbol ?? detail.logo ?? null;

      const cardSet = await prisma.cardSet.upsert({
        where: { tcgId_code: { tcgId: tcg.id, code: detail.id } },
        update: {
          name: detail.name,
          releaseDate: detail.releaseDate ? new Date(detail.releaseDate) : null,
          totalCards: detail.cardCount?.total ?? null,
          symbolUrl: symbolBase ? buildAssetUrl(symbolBase) : null,
        },
        create: {
          tcgId: tcg.id,
          code: detail.id,
          name: detail.name,
          releaseDate: detail.releaseDate ? new Date(detail.releaseDate) : null,
          totalCards: detail.cardCount?.total ?? null,
          symbolUrl: symbolBase ? buildAssetUrl(symbolBase) : null,
        },
      });

      await Promise.all(
        detail.cards.map((card) =>
          prisma.card.upsert({
            where: {
              tcgId_setId_collectorNumber_variant: {
                tcgId: tcg.id,
                setId: cardSet.id,
                collectorNumber: card.localId,
                variant: DEFAULT_VARIANT,
              },
            },
            update: {
              name: card.name,
              imageUrl: card.image ? buildCardImageUrl(card.image) : null,
            },
            create: {
              tcgId: tcg.id,
              setId: cardSet.id,
              collectorNumber: card.localId,
              variant: DEFAULT_VARIANT,
              name: card.name,
              imageUrl: card.image ? buildCardImageUrl(card.image) : null,
            },
          }),
        ),
      );

      cardsUpserted += detail.cards.length;
      setsProcessed++;
      console.log(
        `[pokemon-sync] (${index + 1}/${sets.length}) ${detail.name} — ${detail.cards.length} cards`,
      );
    } catch (error) {
      setsFailed++;
      console.error(
        `[pokemon-sync] Failed to sync set "${setBrief.id}":`,
        error instanceof Error ? error.message : error,
      );
    }
  });

  return { setsProcessed, setsFailed, cardsUpserted };
};
