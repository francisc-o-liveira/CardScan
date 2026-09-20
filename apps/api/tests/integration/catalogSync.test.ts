import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../src/app";
import { prisma } from "../../src/config/prisma";
import type { CatalogData, CatalogProvider, NormalizedCard } from "../../src/providers/catalog";
import { createLorcanaProvider } from "../../src/providers/lorcana/provider";
import { createDigimonProvider } from "../../src/providers/digimon/provider";
import { createFabProvider } from "../../src/providers/fab/provider";
import { createStarWarsProvider } from "../../src/providers/starwars/provider";
import { rehostedImageKey, syncCatalog } from "../../src/services/catalogSyncService";
import type { ImageStorage } from "../../src/storage/imageStorage";
import { resetDatabase } from "../helpers/db";

const card = (over: Partial<NormalizedCard> = {}): NormalizedCard => ({
  setCode: "S1",
  collectorNumber: "001",
  variant: "",
  name: "Card One",
  rarity: "Common",
  imageUrl: "https://cdn.test/one.png",
  imageKey: "one",
  ...over,
});

const provider = (data: CatalogData, over: Partial<CatalogProvider> = {}): CatalogProvider => ({
  slug: "lorcana",
  name: "Disney Lorcana",
  imagePolicy: "hotlink",
  load: async () => data,
  ...over,
});

const memoryStorage = () => {
  const files = new Map<string, Buffer>();
  const storage: ImageStorage = {
    exists: async (key) => files.has(key),
    put: async (key, data) => void files.set(key, data),
    publicUrl: (key) => `http://api.test/assets/${key}`,
  };
  return { storage, files };
};

const quiet = { log: () => undefined };

describe("shared catalog sync", () => {
  beforeEach(resetDatabase);

  it("creates the game, its sets and its cards", async () => {
    const result = await syncCatalog(
      provider({
        sets: [{ code: "S1", name: "Set One", releaseDate: new Date("2024-01-02"), totalCards: 2 }],
        cards: [card(), card({ collectorNumber: "002", name: "Card Two", imageKey: "two" })],
      }),
      quiet,
    );

    expect(await prisma.tcg.findUnique({ where: { slug: "lorcana" } })).toMatchObject({ name: "Disney Lorcana", isEnabled: true });
    expect(await prisma.cardSet.findFirst({ where: { code: "S1" } })).toMatchObject({ name: "Set One", totalCards: 2, releaseDate: new Date("2024-01-02") });
    expect(await prisma.card.count()).toBe(2);
    expect(result).toMatchObject({ setsProcessed: 1, cardsUpserted: 2, duplicatesMerged: 0, cardsWithoutImage: 0 });
  });

  it("hotlinks: stores the source image URL unchanged", async () => {
    await syncCatalog(provider({ sets: [], cards: [card()] }), quiet);
    expect((await prisma.card.findFirstOrThrow()).imageUrl).toBe("https://cdn.test/one.png");
  });

  it("creates a set that only appears on a card, so no card is dropped", async () => {
    await syncCatalog(provider({ sets: [], cards: [card({ setCode: "MYSTERY" })] }), quiet);
    expect(await prisma.cardSet.findFirstOrThrow({ where: { code: "MYSTERY" } })).toMatchObject({ name: "MYSTERY" });
    expect(await prisma.card.count()).toBe(1);
  });

  it("merges rows the source lists twice (later wins) instead of failing", async () => {
    const result = await syncCatalog(
      provider({ sets: [], cards: [card({ name: "Old name" }), card({ name: "New name" })] }),
      quiet,
    );
    expect(result.duplicatesMerged).toBe(1);
    expect(await prisma.card.count()).toBe(1);
    expect((await prisma.card.findFirstOrThrow()).name).toBe("New name");
  });

  it("keeps variants of one collector number as separate cards", async () => {
    await syncCatalog(provider({ sets: [], cards: [card({ variant: "N" }), card({ variant: "Foil" })] }), quiet);
    expect(await prisma.card.count()).toBe(2);
  });

  it("is idempotent and updates changed data in place", async () => {
    const data = { sets: [{ code: "S1", name: "Set One" }], cards: [card()] };
    await syncCatalog(provider(data), quiet);
    await syncCatalog(provider({ ...data, cards: [card({ name: "Renamed", rarity: "Rare" })] }), quiet);
    expect(await prisma.card.count()).toBe(1);
    expect(await prisma.cardSet.count()).toBe(1);
    expect(await prisma.tcg.count()).toBe(1);
    expect(await prisma.card.findFirstOrThrow()).toMatchObject({ name: "Renamed", rarity: "Rare" });
  });

  it("counts cards without an image and stores them with a null imageUrl", async () => {
    const result = await syncCatalog(provider({ sets: [], cards: [card({ imageUrl: null })] }), quiet);
    expect(result.cardsWithoutImage).toBe(1);
    expect((await prisma.card.findFirstOrThrow()).imageUrl).toBeNull();
  });

  it("never touches other games' data", async () => {
    const other = await prisma.tcg.create({ data: { slug: "magic", name: "Magic" } });
    const set = await prisma.cardSet.create({ data: { tcgId: other.id, code: "S1", name: "Magic S1" } });
    await prisma.card.create({ data: { tcgId: other.id, setId: set.id, collectorNumber: "001", variant: "", name: "Untouched" } });

    await syncCatalog(provider({ sets: [{ code: "S1", name: "Lorcana S1" }], cards: [card()] }), quiet);

    expect(await prisma.card.count({ where: { tcgId: other.id } })).toBe(1);
    expect((await prisma.card.findFirstOrThrow({ where: { tcgId: other.id } })).name).toBe("Untouched");
    expect(await prisma.cardSet.count()).toBe(2); // same set code in two games is fine
  });

  describe("re-hosting (hobby-run sources)", () => {
    const rehost = (files: ReturnType<typeof memoryStorage>, downloads: string[] = [], failFor?: string) =>
      provider(
        { sets: [], cards: [card({ imageKey: "a", imageUrl: "https://hobby.test/a.jpg" }), card({ collectorNumber: "002", imageKey: "b", imageUrl: "https://hobby.test/b.png" })] },
        {
          slug: "onepiece",
          name: "One Piece",
          imagePolicy: "rehost",
          downloadImage: async (url) => {
            downloads.push(url);
            if (url === failFor) throw new Error("boom");
            return Buffer.from(url);
          },
        },
      );

    it("downloads each image once, stores it, and points cards at our own URL", async () => {
      const mem = memoryStorage();
      const downloads: string[] = [];
      const result = await syncCatalog(rehost(mem, downloads), { ...quiet, storage: mem.storage });

      expect(downloads.sort()).toEqual(["https://hobby.test/a.jpg", "https://hobby.test/b.png"]);
      expect([...mem.files.keys()].sort()).toEqual(["onepiece/cards/a.jpg", "onepiece/cards/b.png"]);
      const urls = (await prisma.card.findMany({ orderBy: { collectorNumber: "asc" } })).map((c) => c.imageUrl);
      expect(urls).toEqual(["http://api.test/assets/onepiece/cards/a.jpg", "http://api.test/assets/onepiece/cards/b.png"]);
      expect(result).toMatchObject({ imagesDownloaded: 2, imagesFailed: 0 });
    });

    it("does not download again on a re-run", async () => {
      const mem = memoryStorage();
      await syncCatalog(rehost(mem), { ...quiet, storage: mem.storage });
      const downloads: string[] = [];
      const second = await syncCatalog(rehost(mem, downloads), { ...quiet, storage: mem.storage });
      expect(downloads).toEqual([]);
      expect(second.imagesDownloaded).toBe(0);
    });

    it("keeps the card without an image when a download fails, and retries it next run", async () => {
      const mem = memoryStorage();
      const first = await syncCatalog(rehost(mem, [], "https://hobby.test/b.png"), { ...quiet, storage: mem.storage });
      expect(first).toMatchObject({ imagesFailed: 1, cardsWithoutImage: 1 });
      expect((await prisma.card.findFirstOrThrow({ where: { collectorNumber: "002" } })).imageUrl).toBeNull();

      await syncCatalog(rehost(mem), { ...quiet, storage: mem.storage });
      expect((await prisma.card.findFirstOrThrow({ where: { collectorNumber: "002" } })).imageUrl).toContain("/assets/onepiece/cards/b.png");
    });

    it("with skipImages never downloads, but links images that already exist", async () => {
      const mem = memoryStorage();
      mem.files.set("onepiece/cards/a.jpg", Buffer.from("x"));
      const downloads: string[] = [];
      await syncCatalog(rehost(mem, downloads), { ...quiet, storage: mem.storage, skipImages: true });
      expect(downloads).toEqual([]);
      expect((await prisma.card.findFirstOrThrow({ where: { collectorNumber: "001" } })).imageUrl).not.toBeNull();
      expect((await prisma.card.findFirstOrThrow({ where: { collectorNumber: "002" } })).imageUrl).toBeNull();
    });
  });

  it("builds safe storage keys from untrusted image ids", () => {
    expect(rehostedImageKey("onepiece", { imageKey: "OP01-077_p1", imageUrl: "https://x/y.jpg?123" })).toBe("onepiece/cards/OP01-077_p1.jpg");
    const hostile = rehostedImageKey("onepiece", { imageKey: "../../etc/passwd", imageUrl: "https://x/y.png" });
    expect(hostile).not.toContain("..");
    expect(hostile.startsWith("onepiece/cards/")).toBe(true);
    expect(rehostedImageKey("g", { imageKey: "k", imageUrl: null })).toBe("g/cards/k.jpg");
  });
});

describe("the five new games, end to end (source JSON → database → public API)", () => {
  const app = createApp();
  beforeEach(resetDatabase);

  const stubHttp = (routes: Record<string, unknown>) => ({
    getJson: vi.fn(async (path: string) => {
      if (!(path in routes)) throw new Error(`unexpected ${path}`);
      return routes[path];
    }) as never,
    getBuffer: vi.fn(async () => Buffer.from("img")),
  });

  it("makes every game queryable through /api/cards with working image URLs", async () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);

    await syncCatalog(
      createLorcanaProvider(
        stubHttp({
          "/sets": { results: [{ id: "a", name: "The First Chapter", code: "1", released_at: "2023-08-18" }] },
          "/sets/1/cards": [{ id: "crd_1", name: "Elsa", version: "Snow Queen", rarity: "Legendary", collector_number: "42", lang: "en", image_uris: { digital: { large: "https://cards.lorcast.io/elsa.avif" } } }],
        }),
        0,
      ),
      quiet,
    );
    await syncCatalog(
      createDigimonProvider(stubHttp({ "/search": [{ name: "Agumon", id: "BT3-007", rarity: "c", set_name: ["BT-03: Booster Union Impact"] }] })),
      quiet,
    );
    await syncCatalog(
      createStarWarsProvider(
        stubHttp({
          "/sets": [{ setId: "SOR", fullName: "Spark of Rebellion", numberCards: 1, releaseDate: "3/8/24" }],
          "/cards/sor": { data: [{ Set: "SOR", Number: "005", Name: "Luke Skywalker", Subtitle: "Faithful Friend", Rarity: "Legendary", FrontArt: "https://cdn.swu-db.com/images/cards/SOR/005.png" }] },
        }),
        0,
      ),
      quiet,
    );
    await syncCatalog(
      createFabProvider(
        stubHttp({
          "/card.json": [{ unique_id: "c", name: "Wounded Bull", color: "Red", printings: [{ unique_id: "p1", id: "WTR001", set_id: "WTR", edition: "F", foiling: "S", rarity: "C", image_url: "https://s3.test/WTR001.webp" }] }],
          "/set.json": [{ id: "WTR", name: "Welcome to Rathe", printings: [{ initial_release_date: "2019-10-11T00:00:00.000Z" }] }],
        }),
      ),
      quiet,
    );

    for (const [tcg, name, imageHost] of [
      ["lorcana", "Elsa - Snow Queen", "cards.lorcast.io"],
      ["digimon", "Agumon", "images.digimoncard.io"],
      ["starwars", "Luke Skywalker - Faithful Friend", "cdn.swu-db.com"],
      ["fab", "Wounded Bull (Red)", "s3.test"],
    ] as const) {
      const res = await request(app).get(`/api/cards?tcg=${tcg}`);
      expect(res.status, tcg).toBe(200);
      expect(res.body.data.pagination.total, tcg).toBe(1);
      expect(res.body.data.data[0], tcg).toMatchObject({ name, tcg: { slug: tcg } });
      expect(res.body.data.data[0].imageUrl, tcg).toContain(imageHost);
    }

    const tcgs = await request(app).get("/api/tcgs");
    expect(tcgs.body.data.map((t: { slug: string }) => t.slug).sort()).toEqual(["digimon", "fab", "lorcana", "starwars"]);

    const sets = await request(app).get("/api/sets?tcg=fab");
    expect(sets.body.data[0]).toMatchObject({ code: "WTR", name: "Welcome to Rathe" });

    const search = await request(app).get("/api/cards?query=agumon");
    expect(search.body.data.data.map((c: { name: string }) => c.name)).toEqual(["Agumon"]);
  });
});
