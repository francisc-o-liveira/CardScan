import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../../src/config/prisma";
import { syncPokemonCatalog } from "../../src/services/pokemonSyncService";
import * as tcgdex from "../../src/providers/pokemon/tcgdexClient";
import { resetDatabase } from "../helpers/db";

vi.mock("../../src/providers/pokemon/tcgdexClient");

const brief = (id: string, name: string) => ({ id, name, cardCount: { total: 2, official: 2 } });
const detail = (id: string, name: string, extra = {}) => ({
  ...brief(id, name),
  serie: { id: "base", name: "Base" },
  releaseDate: "1999-01-09",
  logo: `https://assets.tcgdex.net/en/base/${id}/logo`,
  cards: [
    { id: `${id}-1`, localId: "1", name: "Alakazam", image: `https://assets.tcgdex.net/en/base/${id}/1` },
    { id: `${id}-2`, localId: "2", name: "Energy without art" },
  ],
  ...extra,
});

describe("Pokémon (TCGdex) sync", () => {
  beforeEach(async () => {
    await resetDatabase();
    vi.resetAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(tcgdex.fetchSets).mockResolvedValue([brief("base1", "Base Set"), brief("base2", "Jungle")]);
    vi.mocked(tcgdex.fetchSetDetail).mockImplementation(async (id) =>
      id === "base1" ? detail("base1", "Base Set") : detail("base2", "Jungle"),
    );
  });

  it("imports sets and cards with full high-quality webp image URLs", async () => {
    const result = await syncPokemonCatalog();
    expect(result).toEqual({ setsProcessed: 2, setsSkipped: 0, setsFailed: 0, cardsUpserted: 4 });

    expect(await prisma.cardSet.count()).toBe(2);
    const set = await prisma.cardSet.findFirstOrThrow({ where: { code: "base1" } });
    expect(set).toMatchObject({ name: "Base Set", totalCards: 2, symbolUrl: "https://assets.tcgdex.net/en/base/base1/logo.webp" });

    const card = await prisma.card.findFirstOrThrow({ where: { setId: set.id, collectorNumber: "1" } });
    expect(card).toMatchObject({ name: "Alakazam", imageUrl: "https://assets.tcgdex.net/en/base/base1/1/high.webp", variant: "" });
  });

  it("stores cards that TCGdex has no artwork for with a null image", async () => {
    await syncPokemonCatalog();
    const card = await prisma.card.findFirstOrThrow({ where: { name: "Energy without art" } });
    expect(card.imageUrl).toBeNull();
  });

  it("is idempotent — re-running never duplicates rows", async () => {
    await syncPokemonCatalog();
    await syncPokemonCatalog();
    expect(await prisma.card.count()).toBe(4);
    expect(await prisma.cardSet.count()).toBe(2);
    expect(await prisma.tcg.count()).toBe(1);
  });

  it("skips digital-only Pokémon TCG Pocket sets", async () => {
    vi.mocked(tcgdex.fetchSets).mockResolvedValue([brief("base1", "Base Set"), brief("A1", "Genetic Apex")]);
    vi.mocked(tcgdex.fetchSetDetail).mockImplementation(async (id) =>
      id === "A1" ? detail("A1", "Genetic Apex", { serie: { id: "tcgp", name: "Pokémon TCG Pocket" } }) : detail("base1", "Base Set"),
    );
    const result = await syncPokemonCatalog();
    expect(result).toMatchObject({ setsProcessed: 1, setsSkipped: 1, cardsUpserted: 2 });
    expect(await prisma.cardSet.findFirst({ where: { code: "A1" } })).toBeNull();
    expect(await prisma.card.count({ where: { set: { code: "A1" } } })).toBe(0);
  });

  it("keeps going when one set fails and reports it", async () => {
    vi.mocked(tcgdex.fetchSetDetail).mockImplementation(async (id) => {
      if (id === "base1") throw new Error("TCGdex is down");
      return detail("base2", "Jungle");
    });
    const result = await syncPokemonCatalog();
    expect(result).toMatchObject({ setsProcessed: 1, setsFailed: 1 });
    expect(await prisma.cardSet.count()).toBe(1);
  });
});
