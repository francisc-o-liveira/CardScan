import zlib from "node:zlib";
import readline from "node:readline";
import axios from "axios";
import { prisma } from "../config/prisma";
import { fetchSets, fetchDefaultCardsDownloadUrl, SCRYFALL_USER_AGENT } from "../providers/magic/scryfallClient";
import { getCardImageUrl } from "../providers/magic/image";
import type { ScryfallCard } from "../providers/magic/scryfall.types";

/**
 * Same reasoning as the Pokémon/TCGdex sync: Postgres never treats two NULLs as equal in a
 * unique index, so upserting the (tcgId, setId, collectorNumber, variant) compound key with
 * `variant: null` would insert a fresh duplicate on every re-run. `default_cards` already has
 * exactly one entry per (set, collector_number), so "" is a safe, idempotent sentinel here too.
 */
const DEFAULT_VARIANT = "";
const CARD_BATCH_SIZE = 200;

export interface MagicSyncResult {
  setsProcessed: number;
  cardsUpserted: number;
  cardsSkipped: number;
}

export const syncMagicCatalog = async (): Promise<MagicSyncResult> => {
  const tcg = await prisma.tcg.upsert({
    where: { slug: "magic" },
    update: {},
    create: { slug: "magic", name: "Magic: The Gathering", isEnabled: true },
  });

  const sets = await fetchSets();
  const setIdByCode = new Map<string, string>();

  for (const set of sets) {
    const cardSet = await prisma.cardSet.upsert({
      where: { tcgId_code: { tcgId: tcg.id, code: set.code } },
      update: {
        name: set.name,
        releaseDate: set.released_at ? new Date(set.released_at) : null,
        totalCards: set.card_count ?? null,
        symbolUrl: set.icon_svg_uri ?? null,
      },
      create: {
        tcgId: tcg.id,
        code: set.code,
        name: set.name,
        releaseDate: set.released_at ? new Date(set.released_at) : null,
        totalCards: set.card_count ?? null,
        symbolUrl: set.icon_svg_uri ?? null,
      },
    });
    setIdByCode.set(set.code, cardSet.id);
  }
  console.log(`[magic-sync] Synced ${sets.length} sets`);

  const downloadUrl = await fetchDefaultCardsDownloadUrl();
  console.log(`[magic-sync] Streaming bulk card data from ${downloadUrl}`);

  const response = await axios.get<NodeJS.ReadableStream>(downloadUrl, {
    responseType: "stream",
    headers: { "User-Agent": SCRYFALL_USER_AGENT },
    timeout: 0,
  });

  const rl = readline.createInterface({ input: response.data.pipe(zlib.createGunzip()) });

  let cardsUpserted = 0;
  let cardsSkipped = 0;
  let batch: ScryfallCard[] = [];

  const upsertCard = async (card: ScryfallCard) => {
    const setId = setIdByCode.get(card.set);
    if (!setId) {
      cardsSkipped++;
      return;
    }

    await prisma.card.upsert({
      where: {
        tcgId_setId_collectorNumber_variant: {
          tcgId: tcg.id,
          setId,
          collectorNumber: card.collector_number,
          variant: DEFAULT_VARIANT,
        },
      },
      update: {
        name: card.name,
        rarity: card.rarity,
        imageUrl: getCardImageUrl(card),
      },
      create: {
        tcgId: tcg.id,
        setId,
        collectorNumber: card.collector_number,
        variant: DEFAULT_VARIANT,
        name: card.name,
        rarity: card.rarity,
        imageUrl: getCardImageUrl(card),
      },
    });
    cardsUpserted++;
  };

  const flushBatch = async () => {
    if (batch.length === 0) return;
    await Promise.all(batch.map(upsertCard));
    batch = [];
    if (cardsUpserted % 5000 < CARD_BATCH_SIZE) {
      console.log(`[magic-sync] ...${cardsUpserted} cards upserted so far`);
    }
  };

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const card = JSON.parse(trimmed) as ScryfallCard;
    // Arena/MTGO-only digital objects can never be physically scanned or collected — out of scope.
    if (card.digital) {
      cardsSkipped++;
      continue;
    }

    batch.push(card);
    if (batch.length >= CARD_BATCH_SIZE) {
      await flushBatch();
    }
  }
  await flushBatch();

  return { setsProcessed: sets.length, cardsUpserted, cardsSkipped };
};
