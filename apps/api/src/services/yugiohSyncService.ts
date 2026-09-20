import { prisma } from "../config/prisma";
import { mapWithConcurrency } from "../utils/concurrency";
import * as ygoClient from "../providers/yugioh/ygoprodeckClient";
import { NO_SET, slugifySetName, toPrintings } from "../providers/yugioh/normalize";
import type { YgoPrinting } from "../providers/yugioh/normalize";
import { imageStorage, type ImageStorage } from "../storage/imageStorage";

const IMAGE_CONCURRENCY = 6;
const CARD_BATCH_SIZE = 200;

export interface YugiohSyncOptions {
  /** Don't download missing images; cards whose image isn't stored yet get no `imageUrl` until a later run. */
  skipImages?: boolean;
  storage?: ImageStorage;
  client?: Pick<typeof ygoClient, "fetchAllCards" | "fetchAllSets" | "downloadImage">;
  log?: (message: string) => void;
}

export interface YugiohSyncResult {
  setsProcessed: number;
  cardsUpserted: number;
  imagesDownloaded: number;
  imagesFailed: number;
  imagesMissing: number;
}

export const imageKey = (cardId: number) => `yugioh/cards/${cardId}.jpg`;

export const syncYugiohCatalog = async (options: YugiohSyncOptions = {}): Promise<YugiohSyncResult> => {
  const storage = options.storage ?? imageStorage;
  const client = options.client ?? ygoClient;
  const log = options.log ?? ((message: string) => console.log(`[yugioh-sync] ${message}`));

  const tcg = await prisma.tcg.upsert({
    where: { slug: "yugioh" },
    update: {},
    create: { slug: "yugioh", name: "Yu-Gi-Oh!", isEnabled: true },
  });

  const [ygoSets, cards] = await Promise.all([client.fetchAllSets(), client.fetchAllCards()]);
  log(`Fetched ${cards.length} cards and ${ygoSets.length} sets`);

  const printings = cards.flatMap(toPrintings);

  // Sets: the official list (dates, sizes) plus any set that only appears in card printings.
  const setsByCode = new Map<string, { name: string; releaseDate: Date | null; totalCards: number | null }>();
  for (const set of ygoSets) {
    setsByCode.set(slugifySetName(set.set_name), {
      name: set.set_name,
      releaseDate: set.tcg_date ? new Date(set.tcg_date) : null,
      totalCards: set.num_of_cards ?? null,
    });
  }
  for (const printing of printings) {
    if (!setsByCode.has(printing.setCode)) {
      setsByCode.set(printing.setCode, { name: printing.setName, releaseDate: null, totalCards: null });
    }
  }
  setsByCode.set(NO_SET.code, setsByCode.get(NO_SET.code) ?? { name: NO_SET.name, releaseDate: null, totalCards: null });

  const setIdByCode = new Map<string, string>();
  for (const [code, set] of setsByCode) {
    const cardSet = await prisma.cardSet.upsert({
      where: { tcgId_code: { tcgId: tcg.id, code } },
      update: { name: set.name, releaseDate: set.releaseDate, totalCards: set.totalCards },
      create: { tcgId: tcg.id, code, name: set.name, releaseDate: set.releaseDate, totalCards: set.totalCards },
    });
    setIdByCode.set(code, cardSet.id);
  }
  log(`Synced ${setsByCode.size} sets`);

  // Images: one file per card id, shared by all of that card's printings.
  const sourceByCardId = new Map<number, string>();
  for (const printing of printings) {
    if (printing.sourceImageUrl) sourceByCardId.set(printing.cardId, printing.sourceImageUrl);
  }

  let imagesDownloaded = 0;
  let imagesFailed = 0;
  const available = new Set<number>();
  const entries = [...sourceByCardId];

  await mapWithConcurrency(entries, IMAGE_CONCURRENCY, async ([cardId, url], index) => {
    const key = imageKey(cardId);
    if (await storage.exists(key)) {
      available.add(cardId);
      return;
    }
    if (options.skipImages) return;

    try {
      await storage.put(key, await client.downloadImage(url));
      available.add(cardId);
      imagesDownloaded++;
      if (imagesDownloaded % 500 === 0) log(`...${imagesDownloaded} images downloaded (${index + 1}/${entries.length})`);
    } catch (error) {
      imagesFailed++;
      log(`Failed to download image for card ${cardId}: ${error instanceof Error ? error.message : error}`);
    }
  });

  const upsertPrinting = async (printing: YgoPrinting) => {
    const setId = setIdByCode.get(printing.setCode);
    if (!setId) return;
    const imageUrl = available.has(printing.cardId) ? storage.publicUrl(imageKey(printing.cardId)) : null;

    await prisma.card.upsert({
      where: {
        tcgId_setId_collectorNumber_variant: {
          tcgId: tcg.id,
          setId,
          collectorNumber: printing.collectorNumber,
          variant: printing.variant,
        },
      },
      update: { name: printing.name, rarity: printing.rarity, imageUrl },
      create: {
        tcgId: tcg.id,
        setId,
        collectorNumber: printing.collectorNumber,
        variant: printing.variant,
        name: printing.name,
        rarity: printing.rarity,
        imageUrl,
      },
    });
  };

  let cardsUpserted = 0;
  for (let i = 0; i < printings.length; i += CARD_BATCH_SIZE) {
    const batch = printings.slice(i, i + CARD_BATCH_SIZE);
    await Promise.all(batch.map(upsertPrinting));
    cardsUpserted += batch.length;
  }

  const imagesMissing = printings.filter((p) => !available.has(p.cardId)).length;
  return { setsProcessed: setsByCode.size, cardsUpserted, imagesDownloaded, imagesFailed, imagesMissing };
};
