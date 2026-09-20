import { TCG_LABELS } from "@cardscan/config";
import { prisma } from "../config/prisma";
import { mapWithConcurrency } from "../utils/concurrency";
import type { CatalogProvider, NormalizedCard, NormalizedSet } from "../providers/catalog";
import { imageStorage, type ImageStorage } from "../storage/imageStorage";

const CARD_BATCH_SIZE = 200;
const IMAGE_CONCURRENCY = 6;

export interface CatalogSyncOptions {
  /** With `rehost`: don't download missing images; already-stored ones are still linked. */
  skipImages?: boolean;
  storage?: ImageStorage;
  log?: (message: string) => void;
}

export interface CatalogSyncResult {
  setsProcessed: number;
  cardsUpserted: number;
  /** Rows the source listed twice under the same identity (the later one wins). */
  duplicatesMerged: number;
  cardsWithoutImage: number;
  imagesDownloaded: number;
  imagesFailed: number;
}

const cardKey = (card: NormalizedCard) => `${card.setCode}\u0000${card.collectorNumber}\u0000${card.variant}`;

const extensionOf = (url: string) => /\.(jpe?g|png|webp|avif|gif)(?:[?#]|$)/i.exec(url)?.[1]?.toLowerCase() ?? "jpg";

/** File-name-safe id — image keys come from third-party data. */
const safeName = (value: string) => value.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/\.{2,}/g, "_");

export const rehostedImageKey = (slug: string, card: Pick<NormalizedCard, "imageKey" | "imageUrl">) =>
  `${slug}/cards/${safeName(card.imageKey)}.${extensionOf(card.imageUrl ?? "")}`;

export const syncCatalog = async (
  provider: CatalogProvider,
  options: CatalogSyncOptions = {},
): Promise<CatalogSyncResult> => {
  const storage = options.storage ?? imageStorage;
  const log = options.log ?? provider.log ?? ((message: string) => console.log(`[${provider.slug}-sync] ${message}`));

  const tcg = await prisma.tcg.upsert({
    where: { slug: provider.slug },
    update: { name: provider.name },
    create: { slug: provider.slug, name: provider.name || TCG_LABELS[provider.slug], isEnabled: true },
  });

  const data = await provider.load();

  // A source may list one printing twice; merge on identity so a batch never upserts the same row twice.
  const byKey = new Map<string, NormalizedCard>();
  for (const card of data.cards) byKey.set(cardKey(card), card);
  const cards = [...byKey.values()];
  const duplicatesMerged = data.cards.length - cards.length;
  log(`Loaded ${data.sets.length} sets and ${cards.length} cards${duplicatesMerged ? ` (${duplicatesMerged} duplicates merged)` : ""}`);

  // Sets, plus any set that only shows up on a card.
  const sets = new Map<string, NormalizedSet>(data.sets.map((set) => [set.code, set]));
  for (const card of cards) {
    if (!sets.has(card.setCode)) sets.set(card.setCode, { code: card.setCode, name: card.setCode });
  }

  const setIdByCode = new Map<string, string>();
  for (const set of sets.values()) {
    const fields = {
      name: set.name,
      releaseDate: set.releaseDate ?? null,
      totalCards: set.totalCards ?? null,
      symbolUrl: set.symbolUrl ?? null,
    };
    const row = await prisma.cardSet.upsert({
      where: { tcgId_code: { tcgId: tcg.id, code: set.code } },
      update: fields,
      create: { tcgId: tcg.id, code: set.code, ...fields },
    });
    setIdByCode.set(set.code, row.id);
  }
  log(`Synced ${sets.size} sets`);

  // Images: re-host (download once, skip existing) or keep the source URL.
  const resolvedImage = new Map<string, string | null>();
  let imagesDownloaded = 0;
  let imagesFailed = 0;

  if (provider.imagePolicy === "rehost") {
    const withImage = cards.filter((card) => card.imageUrl);
    const unique = new Map(withImage.map((card) => [card.imageKey, card]));
    await mapWithConcurrency([...unique.values()], IMAGE_CONCURRENCY, async (card, index) => {
      const key = rehostedImageKey(provider.slug, card);
      if (await storage.exists(key)) {
        resolvedImage.set(card.imageKey, storage.publicUrl(key));
        return;
      }
      if (options.skipImages || !provider.downloadImage) return;
      try {
        await storage.put(key, await provider.downloadImage(card.imageUrl as string));
        resolvedImage.set(card.imageKey, storage.publicUrl(key));
        imagesDownloaded++;
        if (imagesDownloaded % 500 === 0) log(`...${imagesDownloaded} images downloaded (${index + 1}/${unique.size})`);
      } catch (error) {
        imagesFailed++;
        log(`Failed to download ${card.imageUrl}: ${error instanceof Error ? error.message : error}`);
      }
    });
  }

  const imageFor = (card: NormalizedCard) =>
    provider.imagePolicy === "rehost" ? (resolvedImage.get(card.imageKey) ?? null) : card.imageUrl;

  let cardsUpserted = 0;
  let cardsWithoutImage = 0;
  for (let i = 0; i < cards.length; i += CARD_BATCH_SIZE) {
    const batch = cards.slice(i, i + CARD_BATCH_SIZE);
    await Promise.all(
      batch.map(async (card) => {
        const setId = setIdByCode.get(card.setCode) as string;
        const imageUrl = imageFor(card);
        if (!imageUrl) cardsWithoutImage++;
        await prisma.card.upsert({
          where: {
            tcgId_setId_collectorNumber_variant: {
              tcgId: tcg.id,
              setId,
              collectorNumber: card.collectorNumber,
              variant: card.variant,
            },
          },
          update: { name: card.name, rarity: card.rarity, imageUrl },
          create: {
            tcgId: tcg.id,
            setId,
            collectorNumber: card.collectorNumber,
            variant: card.variant,
            name: card.name,
            rarity: card.rarity,
            imageUrl,
          },
        });
      }),
    );
    cardsUpserted += batch.length;
  }

  return { setsProcessed: sets.size, cardsUpserted, duplicatesMerged, cardsWithoutImage, imagesDownloaded, imagesFailed };
};
