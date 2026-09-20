import { describe, expect, it, vi } from "vitest";
import type { HttpClient } from "../../src/providers/http";
import {
  createLorcanaProvider,
  normalizeLorcastCard,
  normalizeLorcastSet,
  type LorcastCard,
} from "../../src/providers/lorcana/provider";
import { createOnePieceProvider, normalizeOptcgCard, setsFromOptcgCards, type OptcgCard } from "../../src/providers/onepiece/provider";
import {
  canonicalSetCode,
  createDigimonProvider,
  normalizeDigimon,
  setCodeOf,
  type DigimonCard,
} from "../../src/providers/digimon/provider";
import {
  createStarWarsProvider,
  normalizeSwuCard,
  normalizeSwuSet,
  parseSwuDate,
  swuImageUrl,
} from "../../src/providers/starwars/provider";
import {
  createFabProvider,
  fabCardName,
  normalizeFabCards,
  normalizeFabSet,
  type FabCard,
} from "../../src/providers/fab/provider";
import { CATALOG_SLUGS, createProvider, isCatalogSlug } from "../../src/providers/registry";

const fakeClient = (routes: Record<string, unknown>): HttpClient & { getJson: ReturnType<typeof vi.fn> } => ({
  getJson: vi.fn(async (path: string) => {
    if (!(path in routes)) throw new Error(`unexpected request ${path}`);
    const value = routes[path];
    if (value instanceof Error) throw value;
    return value;
  }) as never,
  getBuffer: vi.fn(async () => Buffer.from("img")),
});

describe("Disney Lorcana (Lorcast)", () => {
  const card: LorcastCard = {
    id: "crd_1",
    name: "Goofy",
    version: "Musketeer",
    rarity: "Super_rare",
    collector_number: "4",
    lang: "en",
    image_uris: { digital: { small: "s", normal: "n", large: "https://cards.lorcast.io/large.avif" } },
  };

  it("names cards 'Name - Version', prettifies rarity, and prefers the large image", () => {
    expect(normalizeLorcastCard(card, "1")).toEqual({
      setCode: "1",
      collectorNumber: "4",
      variant: "",
      name: "Goofy - Musketeer",
      rarity: "Super rare",
      imageUrl: "https://cards.lorcast.io/large.avif",
      imageKey: "crd_1",
    });
  });

  it("handles a card without a version, rarity or image", () => {
    const bare = normalizeLorcastCard({ id: "x", name: "Ink", collector_number: "9" }, "P1");
    expect(bare).toMatchObject({ name: "Ink", rarity: null, imageUrl: null });
  });

  it("falls back to smaller images when large is missing", () => {
    const small = normalizeLorcastCard({ ...card, image_uris: { digital: { normal: "N" } } }, "1");
    expect(small.imageUrl).toBe("N");
  });

  it("converts set dates", () => {
    expect(normalizeLorcastSet({ id: "s", name: "The First Chapter", code: "1", released_at: "2023-08-18" }, 216)).toEqual({
      code: "1",
      name: "The First Chapter",
      releaseDate: new Date("2023-08-18"),
      totalCards: 216,
    });
  });

  it("loads every set's cards, keeping English only", async () => {
    const client = fakeClient({
      "/sets": { results: [{ id: "a", name: "First", code: "1" }, { id: "b", name: "Second", code: "2" }] },
      "/sets/1/cards": [card, { ...card, id: "crd_fr", lang: "fr" }],
      "/sets/2/cards": [{ ...card, id: "crd_2", collector_number: "1" }],
    });
    const data = await createLorcanaProvider(client, 0).load();
    expect(data.sets.map((s) => [s.code, s.totalCards])).toEqual([["1", 1], ["2", 1]]);
    expect(data.cards.map((c) => c.imageKey)).toEqual(["crd_1", "crd_2"]);
  });

  it("hotlinks the source CDN", () => {
    expect(createLorcanaProvider(fakeClient({}), 0).imagePolicy).toBe("hotlink");
  });
});

describe("One Piece (OPTCG)", () => {
  const optcg = (over: Partial<OptcgCard>): OptcgCard => ({
    card_name: "Perona",
    set_id: "OP-01",
    set_name: "Romance Dawn",
    rarity: "UC",
    card_set_id: "OP01-077",
    card_image_id: "OP01-077",
    card_image: "https://optcgapi.com/media/static/Card_Images/OP01-077.jpg",
    ...over,
  });

  it("identifies a card by its artwork id so parallel arts are separate cards", () => {
    const base = normalizeOptcgCard(optcg({}));
    const parallel = normalizeOptcgCard(optcg({ card_image_id: "OP01-077_p1", card_image: "https://x/OP01-077_p1.jpg" }));
    expect(base).toMatchObject({ setCode: "OP-01", collectorNumber: "OP01-077", name: "Perona", rarity: "UC" });
    expect(parallel.collectorNumber).toBe("OP01-077_p1");
    expect(parallel.imageKey).not.toBe(base.imageKey);
  });

  it("derives sets (with card counts) from the card rows, since the API has no set list", () => {
    const sets = setsFromOptcgCards([optcg({}), optcg({ card_image_id: "OP01-078" }), optcg({ set_id: "ST-01", set_name: "Starter Deck 1" })]);
    expect(sets).toEqual([
      { code: "OP-01", name: "Romance Dawn", totalCards: 2 },
      { code: "ST-01", name: "Starter Deck 1", totalCards: 1 },
    ]);
  });

  it("loads boosters and starter decks, uses the trailing-slash endpoints, and re-hosts images", async () => {
    const client = fakeClient({
      "/allSetCards/": [optcg({})],
      "/allSTCards/": [optcg({ set_id: "ST-01", set_name: "Starter Deck 1", card_image_id: "ST01-001" })],
    });
    const provider = createOnePieceProvider(client);
    const data = await provider.load();
    expect(data.cards).toHaveLength(2);
    expect(provider.imagePolicy).toBe("rehost");
    await provider.downloadImage!("https://optcgapi.com/x.jpg");
    expect(client.getBuffer).toHaveBeenCalledWith("https://optcgapi.com/x.jpg");
  });
});

describe("Digimon (digimoncard.io)", () => {
  const cards: DigimonCard[] = [
    { name: "Agumon", id: "BT3-007", rarity: "c", set_name: ["BT-03: Booster Union Impact", "BT01-03: Release Special Booster Ver.1.5"] },
    { name: "Gabumon", id: "BT3-020", rarity: "u", set_name: ["BT01-03: Release Special Booster Ver.1.5"] },
    { name: "Agumon", id: "P-009", rarity: "p", set_name: ["Special Box Promotion Pack"] },
    { name: "Starter Mon", id: "ST1-01", rarity: "r", set_name: ["ST-01: Starter Deck Gaia Red"] },
  ];

  it("takes the set code from the card number", () => {
    expect(setCodeOf("BT3-007")).toBe("BT3");
    expect(setCodeOf("P-009")).toBe("P");
    expect(setCodeOf("weird")).toBe("WEIRD");
  });

  it("treats BT-03, BT03 and BT3 as the same set code", () => {
    expect(canonicalSetCode("BT-03")).toBe("BT3");
    expect(canonicalSetCode("BT03")).toBe("BT3");
    expect(canonicalSetCode("BT3")).toBe("BT3");
    expect(canonicalSetCode("BT01-03")).toBeNull();
    expect(canonicalSetCode("Revision Pack 2021")).toBeNull();
  });

  it("names sets from the card's set_name list, even when a card has none for its own set", () => {
    const { sets } = normalizeDigimon(cards);
    const byCode = Object.fromEntries(sets.map((s) => [s.code, s]));
    expect(byCode.BT3).toMatchObject({ name: "BT-03: Booster Union Impact", totalCards: 2 });
    expect(byCode.ST1!.name).toBe("ST-01: Starter Deck Gaia Red");
    expect(byCode.P!.name).toBe("Promotional cards");
  });

  it("builds image URLs from the card number and upper-cases rarity", () => {
    const { cards: out } = normalizeDigimon(cards);
    expect(out[0]).toMatchObject({
      setCode: "BT3",
      collectorNumber: "BT3-007",
      rarity: "C",
      imageUrl: "https://images.digimoncard.io/images/cards/BT3-007.jpg",
      variant: "",
    });
  });

  it("makes a single request for the whole catalog", async () => {
    const client = fakeClient({ "/search": cards });
    const data = await createDigimonProvider(client).load();
    expect(client.getJson).toHaveBeenCalledTimes(1);
    expect(data.cards).toHaveLength(4);
  });
});

describe("Star Wars: Unlimited (SWU-DB)", () => {
  it("parses US m/d/yy release dates", () => {
    expect(parseSwuDate("7/11/25")).toEqual(new Date(Date.UTC(2025, 6, 11)));
    expect(parseSwuDate("12/1/2024")).toEqual(new Date(Date.UTC(2024, 11, 1)));
    expect(parseSwuDate(undefined)).toBeNull();
    expect(parseSwuDate("soon")).toBeNull();
  });

  it("maps sets and cards, joining name and subtitle", () => {
    expect(normalizeSwuSet({ setId: "LOF", fullName: "Legends of the Force", numberCards: 264, releaseDate: "7/11/25" })).toEqual({
      code: "LOF",
      name: "Legends of the Force",
      releaseDate: new Date(Date.UTC(2025, 6, 11)),
      totalCards: 264,
    });
    expect(
      normalizeSwuCard({ Set: "JTL", Number: "016", Name: "Admiral Ackbar", Subtitle: "It's A Trap!", Rarity: "Rare", FrontArt: "https://cdn.swu-db.com/a.png" }, "JTL"),
    ).toMatchObject({ name: "Admiral Ackbar - It's A Trap!", collectorNumber: "016", rarity: "Rare", imageUrl: "https://cdn.swu-db.com/a.png" });
    expect(normalizeSwuCard({ Set: "SOR", Number: "1", Name: "Luke" }, "SOR")).toMatchObject({ name: "Luke", imageUrl: null, rarity: null });
  });

  it("points foil cards at their non-foil artwork, because the CDN has no foil files (403)", () => {
    expect(swuImageUrl({ Number: "059F", FrontArt: "https://cdn.swu-db.com/images/cards/SOR/059F.png" })).toBe(
      "https://cdn.swu-db.com/images/cards/SOR/059.png",
    );
    expect(swuImageUrl({ Number: "324F", FrontArt: "https://cdn.swu-db.com/images/cards/SOR/324F.png" })).toBe(
      "https://cdn.swu-db.com/images/cards/SOR/324.png",
    );
    // Non-foil and unusual numbers are left alone.
    expect(swuImageUrl({ Number: "059", FrontArt: "https://cdn.swu-db.com/images/cards/SOR/059.png" })).toBe(
      "https://cdn.swu-db.com/images/cards/SOR/059.png",
    );
    expect(swuImageUrl({ Number: "059F", FrontArt: "https://cdn.swu-db.com/images/cards/SOR/other.png" })).toBe(
      "https://cdn.swu-db.com/images/cards/SOR/other.png",
    );
    expect(swuImageUrl({ Number: "059F", FrontArt: null })).toBeNull();
    expect(normalizeSwuCard({ Set: "SOR", Number: "059F", Name: "X", FrontArt: "https://cdn.swu-db.com/images/cards/SOR/059F.png" }, "SOR").imageUrl).toBe(
      "https://cdn.swu-db.com/images/cards/SOR/059.png",
    );
  });

  it("skips a set whose cards are not published yet and keeps the rest", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const client = fakeClient({
      "/sets": [
        { setId: "SOR", fullName: "Spark of Rebellion" },
        { setId: "FUT", fullName: "Not out yet" },
      ],
      "/cards/sor": { data: [{ Set: "SOR", Number: "001", Name: "Luke" }] },
      "/cards/fut": new Error("Request failed with status code 404"),
    });
    const data = await createStarWarsProvider(client, 0).load();
    expect(data.sets.map((s) => s.code)).toEqual(["SOR"]);
    expect(data.cards).toHaveLength(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Skipping set FUT"));
    warn.mockRestore();
  });
});

describe("Flesh and Blood (fab-cube dataset)", () => {
  const printing = (over = {}) => ({
    unique_id: "abcdef123",
    id: "WTR001",
    set_id: "WTR",
    edition: "F",
    foiling: "S",
    rarity: "M",
    art_variations: [] as string[],
    image_url: "https://legendstory.example/WTR001.webp",
    ...over,
  });
  const card = (over: Partial<FabCard> = {}): FabCard => ({ unique_id: "c1", name: "Wounded Bull", color: "Red", printings: [printing()], ...over });

  it("adds the pitch colour to the name, since the three pitch versions share one", () => {
    expect(fabCardName(card())).toBe("Wounded Bull (Red)");
    expect(fabCardName(card({ color: "" }))).toBe("Wounded Bull");
    expect(fabCardName(card({ color: undefined }))).toBe("Wounded Bull");
  });

  it("creates one row per printing, with edition/foiling/art in the variant", () => {
    const rows = normalizeFabCards([
      card({ printings: [printing(), printing({ unique_id: "u2", id: "WTR001", edition: "U", foiling: "R", art_variations: ["EA"] })] }),
    ]);
    expect(rows.map((r) => r.variant)).toEqual(["F-S", "U-R-EA"]);
    expect(rows[0]).toMatchObject({ setCode: "WTR", collectorNumber: "WTR001", rarity: "M", imageUrl: "https://legendstory.example/WTR001.webp", imageKey: "abcdef123" });
  });

  it("tells genuinely identical printings apart by their unique id", () => {
    const rows = normalizeFabCards([
      card({ printings: [printing({ unique_id: "aaaaaa1" }), printing({ unique_id: "bbbbbb2" })] }),
    ]);
    expect(rows[0]!.variant).not.toBe(rows[1]!.variant);
    expect(new Set(rows.map((r) => `${r.setCode}|${r.collectorNumber}|${r.variant}`)).size).toBe(2);
    // Order-independent: shuffling the source must not change which row is which.
    const shuffled = normalizeFabCards([card({ printings: [printing({ unique_id: "bbbbbb2" }), printing({ unique_id: "aaaaaa1" })] })]);
    expect(new Set(shuffled.map((r) => r.variant))).toEqual(new Set(rows.map((r) => r.variant)));
  });

  it("stores a missing image as null", () => {
    expect(normalizeFabCards([card({ printings: [printing({ image_url: "" })] })])[0]!.imageUrl).toBeNull();
  });

  it("takes a set's release date from its earliest printing", () => {
    expect(
      normalizeFabSet({
        id: "WTR",
        name: "Welcome to Rathe",
        printings: [{ initial_release_date: "2019-10-11T00:00:00.000Z" }, { initial_release_date: "2019-06-01T00:00:00.000Z" }, { initial_release_date: null }],
      }),
    ).toEqual({ code: "WTR", name: "Welcome to Rathe", releaseDate: new Date("2019-06-01T00:00:00.000Z") });
    expect(normalizeFabSet({ id: "X", name: "No dates" }).releaseDate).toBeNull();
  });

  it("loads cards and sets in parallel from the dataset files", async () => {
    const client = fakeClient({ "/card.json": [card()], "/set.json": [{ id: "WTR", name: "Welcome to Rathe" }] });
    const data = await createFabProvider(client).load();
    expect(data.sets).toHaveLength(1);
    expect(data.cards).toHaveLength(1);
  });
});

describe("provider registry", () => {
  it("offers exactly the five games served by the shared sync", () => {
    expect([...CATALOG_SLUGS].sort()).toEqual(["digimon", "fab", "lorcana", "onepiece", "starwars"]);
  });

  it("recognises valid slugs only", () => {
    expect(isCatalogSlug("lorcana")).toBe(true);
    expect(isCatalogSlug("pokemon")).toBe(false); // has its own dedicated sync
    expect(isCatalogSlug("nope")).toBe(false);
  });

  it("creates a provider whose slug matches", () => {
    for (const slug of CATALOG_SLUGS) expect(createProvider(slug).slug).toBe(slug);
  });
});
