import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../src/app";
import { resetDatabase } from "../helpers/db";
import { seedCatalog } from "../helpers/fixtures";

const app = createApp();
type Seed = Awaited<ReturnType<typeof seedCatalog>>;
let seed: Seed;

const names = (res: request.Response): string[] => res.body.data.data.map((c: { name: string }) => c.name);

describe("catalog API", () => {
  beforeAll(async () => {
    await resetDatabase();
    seed = await seedCatalog();
  });

  describe("GET /api/tcgs", () => {
    it("lists every TCG", async () => {
      const res = await request(app).get("/api/tcgs");
      expect(res.status).toBe(200);
      expect(res.body.data.map((t: { slug: string }) => t.slug).sort()).toEqual(["magic", "pokemon", "yugioh"]);
    });
  });

  describe("GET /api/sets", () => {
    it("lists all sets with their TCG, newest first", async () => {
      const res = await request(app).get("/api/sets");
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(4);
      expect(res.body.data[0].tcg).toBeDefined();
    });

    it("filters by TCG slug", async () => {
      const res = await request(app).get("/api/sets?tcg=pokemon");
      expect(res.body.data.map((s: { code: string }) => s.code).sort()).toEqual(["base1", "base2"]);
    });

    it("returns an empty list for an unknown TCG", async () => {
      const res = await request(app).get("/api/sets?tcg=digimon");
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });
  });

  describe("GET /api/sets/:id", () => {
    it("returns the set with its cards ordered by collector number", async () => {
      const res = await request(app).get(`/api/sets/${seed.sets.base.id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe("Base Set");
      expect(res.body.data.cards.map((c: { collectorNumber: string }) => c.collectorNumber)).toEqual(["1", "4"]);
    });

    it("returns 404 for an unknown set", async () => {
      const res = await request(app).get("/api/sets/00000000-0000-0000-0000-000000000000");
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("GET /api/cards", () => {
    it("returns cards with their set and TCG, and pagination metadata", async () => {
      const res = await request(app).get("/api/cards");
      expect(res.status).toBe(200);
      expect(res.body.data.pagination).toEqual({ page: 1, limit: 50, total: 5, totalPages: 1 });
      const charizard = res.body.data.data.find((c: { name: string }) => c.name === "Charizard");
      expect(charizard).toMatchObject({
        collectorNumber: "4",
        rarity: "Rare Holo",
        imageUrl: "https://img.test/Charizard.webp",
        set: { name: "Base Set" },
        tcg: { slug: "pokemon" },
      });
    });

    it("sorts by name", async () => {
      expect(names(await request(app).get("/api/cards"))).toEqual([
        "Alakazam",
        "Black Lotus",
        "Blue-Eyes White Dragon",
        "Charizard",
        "Clefable",
      ]);
    });

    it("filters by TCG", async () => {
      expect(names(await request(app).get("/api/cards?tcg=magic"))).toEqual(["Black Lotus"]);
      expect(names(await request(app).get("/api/cards?tcg=yugioh"))).toEqual(["Blue-Eyes White Dragon"]);
    });

    it("filters by set", async () => {
      const res = await request(app).get(`/api/cards?setId=${seed.sets.jungle.id}`);
      expect(names(res)).toEqual(["Clefable"]);
    });

    it("searches by name, case-insensitively and by substring", async () => {
      expect(names(await request(app).get("/api/cards?query=CHARI"))).toEqual(["Charizard"]);
      expect(names(await request(app).get("/api/cards?query=blue-eyes"))).toEqual(["Blue-Eyes White Dragon"]);
    });

    it("combines filters", async () => {
      expect(names(await request(app).get("/api/cards?tcg=pokemon&query=cl"))).toEqual(["Clefable"]);
      expect(names(await request(app).get("/api/cards?tcg=magic&query=charizard"))).toEqual([]);
    });

    it("paginates and reports totals", async () => {
      const page1 = await request(app).get("/api/cards?limit=2&page=1");
      const page3 = await request(app).get("/api/cards?limit=2&page=3");
      expect(page1.body.data.pagination).toEqual({ page: 1, limit: 2, total: 5, totalPages: 3 });
      expect(names(page1)).toEqual(["Alakazam", "Black Lotus"]);
      expect(names(page3)).toEqual(["Clefable"]);
      expect(names(await request(app).get("/api/cards?limit=2&page=4"))).toEqual([]);
    });

    it("keeps cards without an image (imageUrl null) so the UI can show a fallback", async () => {
      const res = await request(app).get("/api/cards?query=clefable");
      expect(res.body.data.data[0].imageUrl).toBeNull();
    });

    it.each([
      ["a non-numeric page", "page=abc"],
      ["page 0", "page=0"],
      ["a limit over 100", "limit=101"],
      ["a non-uuid setId", "setId=not-a-uuid"],
    ])("rejects %s with a 400", async (_label, qs) => {
      const res = await request(app).get(`/api/cards?${qs}`);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("treats SQL metacharacters in the search as plain text", async () => {
      const res = await request(app).get(`/api/cards?query=${encodeURIComponent("'; DROP TABLE cards; --")}`);
      expect(res.status).toBe(200);
      expect(res.body.data.data).toEqual([]);
      expect((await request(app).get("/api/cards")).body.data.pagination.total).toBe(5);
    });
  });

  describe("GET /api/cards/:id", () => {
    it("returns one card with set, TCG and variants", async () => {
      const res = await request(app).get(`/api/cards/${seed.cards.lotus.id}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        name: "Black Lotus",
        set: { name: "Limited Edition Alpha" },
        tcg: { slug: "magic" },
        variants: [],
      });
    });

    it("returns 404 for an unknown card", async () => {
      const res = await request(app).get("/api/cards/00000000-0000-0000-0000-000000000000");
      expect(res.status).toBe(404);
    });
  });
});
