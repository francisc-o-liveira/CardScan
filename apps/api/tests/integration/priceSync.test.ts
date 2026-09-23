import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../src/app";
import { prisma } from "../../src/config/prisma";
import { syncPrices } from "../../src/services/priceSyncService";
import * as tcgcsv from "../../src/providers/tcgplayer/tcgcsvClient";
import { resetDatabase } from "../helpers/db";
import { seedCatalog } from "../helpers/fixtures";

vi.mock("../../src/providers/tcgplayer/tcgcsvClient");

const app = createApp();
type Seed = Awaited<ReturnType<typeof seedCatalog>>;
let seed: Seed;

const price = (productId: number, subTypeName: string, marketPrice: number | null) => ({
  productId,
  lowPrice: 1,
  midPrice: 2,
  highPrice: 3,
  marketPrice,
  directLowPrice: null,
  subTypeName,
});

const product = (productId: number, name: string, number?: string) => ({
  productId,
  name,
  cleanName: name,
  imageUrl: "",
  groupId: 604,
  url: "",
  extendedData: number ? [{ name: "Number", displayName: "Card Number", value: number }] : [],
});

describe("TCGplayer price sync", () => {
  beforeEach(async () => {
    await resetDatabase();
    seed = await seedCatalog();
    vi.resetAllMocks();
    vi.mocked(tcgcsv.fetchGroups).mockResolvedValue([
      { groupId: 604, name: "Base Set", abbreviation: "BS", isSupplemental: false, publishedOn: "", categoryId: 3 },
      { groupId: 999, name: "Some Other Set", abbreviation: "SOS", isSupplemental: false, publishedOn: "", categoryId: 3 },
    ]);
    vi.mocked(tcgcsv.fetchProducts).mockResolvedValue([
      product(42382, "Charizard - 4/102", "4/102"),
      product(42360, "Alakazam - 1/102", "1/102"),
      product(1, "Base Set Booster Pack"),
    ]);
    vi.mocked(tcgcsv.fetchPrices).mockResolvedValue([
      price(42382, "Holofoil", 412.5),
      price(42382, "1st Edition Holofoil", null),
      price(42360, "Holofoil", 30),
      price(1, "Normal", 900),
    ]);
  });

  it("stores each finish's prices on the matched card and skips sealed products", async () => {
    const result = await syncPrices("pokemon", () => undefined);

    expect(result).toMatchObject({ groupsMatched: 1, productsMatched: 2, cardsPriced: 2, pricesWritten: 3 });
    expect(result.unmatchedGroups).toEqual(["Some Other Set"]);
    expect(tcgcsv.fetchProducts).toHaveBeenCalledTimes(1);

    const rows = await prisma.price.findMany({
      where: { cardId: seed.cards.charizard.id },
      orderBy: { subType: "asc" },
    });
    expect(rows.map((row) => [row.subType, row.market?.toNumber() ?? null])).toEqual([
      ["1st Edition Holofoil", null],
      ["Holofoil", 412.5],
    ]);
    expect(rows[1]).toMatchObject({ source: "tcgplayer", currency: "USD", externalId: "42382" });
  });

  it("replaces prices on re-run and keeps one history point per card and finish per day", async () => {
    await syncPrices("pokemon", () => undefined);
    vi.mocked(tcgcsv.fetchPrices).mockResolvedValue([price(42382, "Holofoil", 450)]);
    await syncPrices("pokemon", () => undefined);

    const rows = await prisma.price.findMany({ where: { cardId: seed.cards.charizard.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.market?.toNumber()).toBe(450);
    expect(await prisma.price.count({ where: { cardId: seed.cards.alakazam.id } })).toBe(0);

    const history = await prisma.priceHistory.findMany({ where: { cardId: seed.cards.charizard.id } });
    expect(history.map((row) => row.price.toNumber())).toEqual([450]);
  });

  it("exposes the headline market price on lists and every finish on the card", async () => {
    await syncPrices("pokemon", () => undefined);

    const list = await request(app).get(`/api/cards?setId=${seed.sets.base.id}`);
    const charizard = list.body.data.data.find((card: { name: string }) => card.name === "Charizard");
    expect(charizard.marketPrice).toEqual({ amount: 412.5, currency: "USD", subType: "Holofoil" });
    expect(charizard.prices).toBeUndefined();

    const detail = await request(app).get(`/api/cards/${seed.cards.charizard.id}`);
    expect(detail.body.data.prices).toHaveLength(2);
    expect(detail.body.data.prices[0]).toMatchObject({ subType: "1st Edition Holofoil", market: null, low: 1, mid: 2, high: 3 });

    const set = await request(app).get(`/api/sets/${seed.sets.base.id}`);
    expect(set.body.data.cards.map((card: { marketPrice: { amount: number } | null }) => card.marketPrice?.amount)).toEqual([30, 412.5]);

    const unpriced = await request(app).get(`/api/cards/${seed.cards.lotus.id}`);
    expect(unpriced.body.data).toMatchObject({ marketPrice: null, prices: [] });
  });

  describe("GET /api/cards/:id/price-history", () => {
    const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
    const point = (subType: string, price: number, n: number) => ({
      cardId: seed.cards.charizard.id,
      source: "tcgplayer",
      subType,
      price,
      currency: "USD",
      recordedAt: daysAgo(n),
    });

    beforeEach(async () => {
      await prisma.priceHistory.createMany({
        data: [
          point("Holofoil", 500, 200), // outside 3m, inside 1y
          point("Holofoil", 400, 60),
          point("Holofoil", 300, 30),
          point("Holofoil", 450, 1),
          point("Reverse Holofoil", 20, 1),
        ],
      });
    });

    it("returns each finish's series within the range, main finish first, with change and extremes", async () => {
      const res = await request(app).get(`/api/cards/${seed.cards.charizard.id}/price-history?range=3m`);
      expect(res.status).toBe(200);
      expect(res.body.data.range).toBe("3m");
      // The first point ever recorded, even though it falls outside the range.
      expect(res.body.data.trackedSince.slice(0, 10)).toBe(daysAgo(200).toISOString().slice(0, 10));

      const [holo, reverse] = res.body.data.series;
      expect(holo).toMatchObject({ subType: "Holofoil", low: 300, high: 450, change: { amount: 50, percent: 12.5 } });
      expect(holo.points.map((p: { market: number }) => p.market)).toEqual([400, 300, 450]);
      expect(reverse).toMatchObject({ subType: "Reverse Holofoil", change: null, low: 20, high: 20 });
    });

    it("widens with the range and defaults to 3 months", async () => {
      const year = await request(app).get(`/api/cards/${seed.cards.charizard.id}/price-history?range=1y`);
      expect(year.body.data.series[0].points).toHaveLength(4);

      const fallback = await request(app).get(`/api/cards/${seed.cards.charizard.id}/price-history`);
      expect(fallback.body.data.range).toBe("3m");
    });

    it("rejects an unknown range and a missing card", async () => {
      expect((await request(app).get(`/api/cards/${seed.cards.charizard.id}/price-history?range=5y`)).status).toBe(400);
      expect(
        (await request(app).get("/api/cards/00000000-0000-0000-0000-000000000000/price-history")).status,
      ).toBe(404);
    });

    it("returns no series for a card without history", async () => {
      const res = await request(app).get(`/api/cards/${seed.cards.lotus.id}/price-history`);
      expect(res.body.data).toMatchObject({ trackedSince: null, series: [] });
    });
  });
});
