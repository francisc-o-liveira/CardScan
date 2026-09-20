import { Readable } from "node:stream";
import zlib from "node:zlib";
import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../../src/config/prisma";
import { syncMagicCatalog } from "../../src/services/magicSyncService";
import * as scryfall from "../../src/providers/magic/scryfallClient";
import { resetDatabase } from "../helpers/db";

vi.mock("../../src/providers/magic/scryfallClient");
vi.mock("axios");

const card = (extra: Record<string, unknown>) => ({
  id: crypto.randomUUID(),
  lang: "en",
  digital: false,
  layout: "normal",
  rarity: "common",
  ...extra,
});

const bulk = [
  card({ name: "Black Lotus", set: "lea", set_name: "Alpha", collector_number: "232", rarity: "rare", image_uris: { large: "https://cards.scryfall.io/large/lotus.jpg" } }),
  card({
    name: "Delver of Secrets // Insectile Aberration", set: "isd", set_name: "Innistrad", collector_number: "51", layout: "transform",
    card_faces: [{ name: "Delver", image_uris: { large: "https://cards.scryfall.io/large/delver-front.jpg" } }, { name: "Insectile" }],
  }),
  card({ name: "Arena Only Alchemy Card", set: "ymid", set_name: "Alchemy: Innistrad", collector_number: "1", digital: true, image_uris: { large: "x" } }),
  card({ name: "Card From Unknown Set", set: "zzz", set_name: "Unknown", collector_number: "1" }),
  card({ name: "Imageless Card", set: "lea", set_name: "Alpha", collector_number: "233" }),
];

const gzippedJsonl = (lines: object[]) => zlib.gzipSync(lines.map((l) => JSON.stringify(l)).join("\n") + "\n");

describe("Magic (Scryfall) sync", () => {
  beforeEach(async () => {
    await resetDatabase();
    vi.resetAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.mocked(scryfall.fetchSets).mockResolvedValue([
      { id: "1", code: "lea", name: "Limited Edition Alpha", released_at: "1993-08-05", set_type: "core", card_count: 295, icon_svg_uri: "https://svgs.scryfall.io/sets/lea.svg", digital: false },
      { id: "2", code: "isd", name: "Innistrad", released_at: "2011-09-30", set_type: "expansion", card_count: 264, digital: false },
    ]);
    vi.mocked(scryfall.fetchDefaultCardsDownloadUrl).mockResolvedValue("https://data.scryfall.io/default-cards.jsonl.gz");
    // A fresh stream per call, so the sync can be run more than once.
    vi.mocked(axios.get).mockImplementation(async () => ({ data: Readable.from([gzippedJsonl(bulk)]) }));
  });

  it("imports sets and streams cards out of the gzipped JSONL bulk file", async () => {
    const result = await syncMagicCatalog();
    expect(result).toMatchObject({ setsProcessed: 2, cardsUpserted: 3 });
    expect(await prisma.cardSet.findFirstOrThrow({ where: { code: "lea" } })).toMatchObject({
      name: "Limited Edition Alpha",
      totalCards: 295,
      symbolUrl: "https://svgs.scryfall.io/sets/lea.svg",
    });

    const lotus = await prisma.card.findFirstOrThrow({ where: { name: "Black Lotus" } });
    expect(lotus).toMatchObject({ rarity: "rare", collectorNumber: "232", imageUrl: "https://cards.scryfall.io/large/lotus.jpg" });
  });

  it("uses the first face's image for double-faced cards", async () => {
    await syncMagicCatalog();
    const delver = await prisma.card.findFirstOrThrow({ where: { name: { startsWith: "Delver" } } });
    expect(delver.imageUrl).toBe("https://cards.scryfall.io/large/delver-front.jpg");
  });

  it("skips digital-only cards and cards whose set is unknown, and reports them", async () => {
    const result = await syncMagicCatalog();
    expect(await prisma.card.count({ where: { name: "Arena Only Alchemy Card" } })).toBe(0);
    expect(await prisma.card.count({ where: { name: "Card From Unknown Set" } })).toBe(0);
    expect(result.cardsSkipped).toBe(2);
  });

  it("keeps a card that has no image, with a null imageUrl", async () => {
    await syncMagicCatalog();
    expect((await prisma.card.findFirstOrThrow({ where: { name: "Imageless Card" } })).imageUrl).toBeNull();
  });

  it("is idempotent — re-running never duplicates rows", async () => {
    await syncMagicCatalog();
    await syncMagicCatalog();
    expect(await prisma.card.count()).toBe(3);
    expect(await prisma.cardSet.count()).toBe(2);
  });

  it("downloads the bulk file URL that Scryfall advertises", async () => {
    await syncMagicCatalog();
    expect(vi.mocked(axios.get).mock.calls[0]?.[0]).toBe("https://data.scryfall.io/default-cards.jsonl.gz");
  });
});
