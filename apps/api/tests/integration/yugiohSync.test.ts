import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../../src/config/prisma";
import { imageKey, syncYugiohCatalog } from "../../src/services/yugiohSyncService";
import type { ImageStorage } from "../../src/storage/imageStorage";
import type { YgoCard, YgoSet } from "../../src/providers/yugioh/ygoprodeck.types";
import { resetDatabase } from "../helpers/db";

const cards: YgoCard[] = [
  {
    id: 1,
    name: "Blue-Eyes White Dragon",
    type: "Normal Monster",
    card_images: [{ id: 1, image_url: "https://src/1.jpg" }],
    card_sets: [
      { set_name: "Legend of Blue Eyes White Dragon", set_code: "LOB-EN001", set_rarity: "Ultra Rare" },
      { set_name: "Legend of Blue Eyes White Dragon", set_code: "LOB-EN001", set_rarity: "Secret Rare" },
      { set_name: "Starter Deck: Kaiba", set_code: "SDK-EN001", set_rarity: "Ultra Rare" },
    ],
  },
  {
    id: 2,
    name: "Dark Magician",
    type: "Normal Monster",
    card_images: [{ id: 2, image_url: "https://src/2.jpg" }],
    card_sets: [{ set_name: "Set Only In Cards", set_code: "ZZZ-EN001", set_rarity: "Common" }],
  },
  { id: 3, name: "Unreleased Token", type: "Token", card_images: [{ id: 3, image_url: "https://src/3.jpg" }] },
];

const sets: YgoSet[] = [
  { set_name: "Legend of Blue Eyes White Dragon", set_code: "LOB", num_of_cards: 126, tcg_date: "2002-03-08" },
  { set_name: "Starter Deck: Kaiba", set_code: "SDK", num_of_cards: 43, tcg_date: "2002-03-08" },
];

const memoryStorage = () => {
  const files = new Map<string, Buffer>();
  const storage: ImageStorage = {
    exists: async (key) => files.has(key),
    put: async (key, data) => void files.set(key, data),
    publicUrl: (key) => `http://api.test/assets/${key}`,
  };
  return { storage, files };
};

const fakeClient = (overrides: { failImageFor?: string } = {}) => ({
  fetchAllCards: vi.fn(async () => cards),
  fetchAllSets: vi.fn(async () => sets),
  downloadImage: vi.fn(async (url: string) => {
    if (url === overrides.failImageFor) throw new Error("boom");
    return Buffer.from(`image:${url}`);
  }),
});

const run = (client: ReturnType<typeof fakeClient>, storage: ImageStorage, extra = {}) =>
  syncYugiohCatalog({ client, storage, log: () => undefined, ...extra });

describe("Yu-Gi-Oh! sync", () => {
  beforeEach(resetDatabase);

  it("creates the TCG, the sets (official + card-only + no-set) and one card row per printing", async () => {
    const { storage } = memoryStorage();
    const result = await run(fakeClient(), storage);

    expect(await prisma.tcg.findUnique({ where: { slug: "yugioh" } })).toMatchObject({ name: "Yu-Gi-Oh!" });

    const setCodes = (await prisma.cardSet.findMany()).map((s) => s.code).sort();
    expect(setCodes).toEqual(["legend-of-blue-eyes-white-dragon", "no-set", "set-only-in-cards", "starter-deck-kaiba"]);
    expect(await prisma.cardSet.findFirst({ where: { code: "legend-of-blue-eyes-white-dragon" } })).toMatchObject({
      totalCards: 126,
      releaseDate: new Date("2002-03-08"),
    });

    // 3 printings of Blue-Eyes + 1 Dark Magician + 1 token without a set
    expect(await prisma.card.count()).toBe(5);
    expect(result).toMatchObject({ setsProcessed: 4, cardsUpserted: 5, imagesDownloaded: 3, imagesFailed: 0 });
  });

  it("keeps two rarities of the same print code as separate cards", async () => {
    await run(fakeClient(), memoryStorage().storage);
    const rows = await prisma.card.findMany({ where: { collectorNumber: "LOB-EN001" }, orderBy: { rarity: "asc" } });
    expect(rows.map((r) => r.rarity)).toEqual(["Secret Rare", "Ultra Rare"]);
  });

  it("downloads each card image once, re-hosts it, and points every printing at it", async () => {
    const { storage, files } = memoryStorage();
    const client = fakeClient();
    await run(client, storage);

    expect(client.downloadImage).toHaveBeenCalledTimes(3);
    expect([...files.keys()].sort()).toEqual([imageKey(1), imageKey(2), imageKey(3)]);
    const blueEyes = await prisma.card.findMany({ where: { name: "Blue-Eyes White Dragon" } });
    expect(blueEyes).toHaveLength(3);
    for (const card of blueEyes) {
      expect(card.imageUrl).toBe("http://api.test/assets/yugioh/cards/1.jpg");
      expect(card.imageUrl).not.toContain("ygoprodeck");
    }
  });

  it("is idempotent: a second run adds no rows and downloads nothing", async () => {
    const { storage } = memoryStorage();
    await run(fakeClient(), storage);
    const client = fakeClient();
    const second = await run(client, storage);

    expect(await prisma.card.count()).toBe(5);
    expect(await prisma.cardSet.count()).toBe(4);
    expect(client.downloadImage).not.toHaveBeenCalled();
    expect(second.imagesDownloaded).toBe(0);
  });

  it("updates changed card data in place on re-run", async () => {
    const { storage } = memoryStorage();
    await run(fakeClient(), storage);
    const renamed = fakeClient();
    renamed.fetchAllCards.mockResolvedValue(cards.map((c) => (c.id === 2 ? { ...c, name: "Dark Magician (errata)" } : c)));
    await run(renamed, storage);
    expect(await prisma.card.count({ where: { name: "Dark Magician (errata)" } })).toBe(1);
    expect(await prisma.card.count({ where: { name: "Dark Magician" } })).toBe(0);
  });

  it("survives a failed image download: the card is kept without an image and the failure is reported", async () => {
    const { storage } = memoryStorage();
    const result = await run(fakeClient({ failImageFor: "https://src/2.jpg" }), storage);
    expect(result.imagesFailed).toBe(1);
    expect(await prisma.card.findFirstOrThrow({ where: { name: "Dark Magician" } })).toMatchObject({ imageUrl: null });
    expect((await prisma.card.findFirstOrThrow({ where: { name: "Unreleased Token" } })).imageUrl).not.toBeNull();
  });

  it("fills in a previously failed image on the next run", async () => {
    const { storage } = memoryStorage();
    await run(fakeClient({ failImageFor: "https://src/2.jpg" }), storage);
    await run(fakeClient(), storage);
    expect((await prisma.card.findFirstOrThrow({ where: { name: "Dark Magician" } })).imageUrl).toBe(
      "http://api.test/assets/yugioh/cards/2.jpg",
    );
  });

  it("with skipImages never downloads, but still links images that already exist", async () => {
    const { storage, files } = memoryStorage();
    files.set(imageKey(1), Buffer.from("existing"));
    const client = fakeClient();
    await run(client, storage, { skipImages: true });

    expect(client.downloadImage).not.toHaveBeenCalled();
    expect((await prisma.card.findFirstOrThrow({ where: { name: "Blue-Eyes White Dragon" } })).imageUrl).not.toBeNull();
    expect((await prisma.card.findFirstOrThrow({ where: { name: "Dark Magician" } })).imageUrl).toBeNull();
  });
});
