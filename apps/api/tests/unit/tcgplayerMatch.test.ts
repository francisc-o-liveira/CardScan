import { describe, expect, it } from "vitest";
import {
  baseProductName,
  createCardMatcher,
  groupNameCandidates,
  matchGroupToSet,
  normalizeName,
  normalizeNumber,
} from "../../src/providers/tcgplayer/match";
import type { TcgcsvGroup, TcgcsvProduct } from "../../src/providers/tcgplayer/tcgcsv.types";

const group = (name: string, abbreviation: string | null = null): TcgcsvGroup => ({
  groupId: 1,
  name,
  abbreviation,
  isSupplemental: false,
  publishedOn: "2026-01-01",
  categoryId: 3,
});

const product = (name: string, number?: string, productId = 1): TcgcsvProduct => ({
  productId,
  name,
  cleanName: name,
  imageUrl: "",
  groupId: 1,
  url: "",
  extendedData: number ? [{ name: "Number", displayName: "Card Number", value: number }] : [],
});

describe("normalizeNumber", () => {
  it.each([
    ["021/128", "21"],
    ["021", "21"],
    ["TG01/TG30", "tg1"],
    ["LOB-EN001", "loben1"],
    ["SWSH138", "swsh138"],
    ["0", "0"],
  ])("%s → %s", (input, expected) => {
    expect(normalizeNumber(input)).toBe(expected);
  });
});

describe("baseProductName", () => {
  it("drops the number suffix and bracketed qualifiers", () => {
    expect(baseProductName("Greninja ex - 021/128")).toBe("Greninja ex");
    expect(baseProductName("Professor's Research [Professor Magnolia] (Secret)")).toBe(
      "Professor's Research",
    );
  });

  it("keeps a dash that is part of the name", () => {
    expect(baseProductName("Stitch - Experiment 626")).toBe("Stitch - Experiment 626");
  });
});

describe("groupNameCandidates", () => {
  it("reads both halves of a series prefix", () => {
    expect(groupNameCandidates("SV03: Obsidian Flames")).toContain(normalizeName("Obsidian Flames"));
    expect(groupNameCandidates("SM - Cosmic Eclipse")).toContain(normalizeName("Cosmic Eclipse"));
  });

  it("treats a series' Base Set as the series itself before anything looser", () => {
    const candidates = groupNameCandidates("XY Base Set");
    expect(candidates.indexOf("xy")).toBeGreaterThanOrEqual(0);
    expect(candidates.indexOf("xy")).toBeLessThan(candidates.indexOf("baseset"));
  });

  it("drops a leading all-caps series code", () => {
    expect(groupNameCandidates("EX Emerald")).toContain("emerald");
  });
});

describe("matchGroupToSet", () => {
  const sets = [
    { id: "a", code: "30th", name: "30th Celebration" },
    { id: "b", code: "xy1", name: "XY" },
    { id: "c", code: "base1", name: "Base Set" },
    { id: "d", code: "lea", name: "Limited Edition Alpha" },
  ];

  it("matches by name through the series prefix", () => {
    expect(matchGroupToSet(group("ME: 30th Celebration"), sets, { matchByCode: false })?.id).toBe("a");
  });

  it("prefers the series over the generic Base Set", () => {
    expect(matchGroupToSet(group("XY Base Set"), sets, { matchByCode: false })?.id).toBe("b");
  });

  it("matches by abbreviation only when the game's codes line up", () => {
    expect(matchGroupToSet(group("Alpha Edition", "LEA"), sets, { matchByCode: true })?.id).toBe("d");
    expect(matchGroupToSet(group("Alpha Edition", "LEA"), sets, { matchByCode: false })).toBeNull();
  });

  it("follows an alias to the set code", () => {
    const aliases = { "WoTC Promo": "base1" };
    expect(matchGroupToSet(group("WoTC Promo"), sets, { matchByCode: false, aliases })?.id).toBe("c");
  });
});

describe("createCardMatcher", () => {
  const match = createCardMatcher([
    { id: "greninja", name: "Greninja ex", collectorNumber: "021" },
    { id: "charizard", name: "Charizard", collectorNumber: "001" },
    { id: "delcatty-renumbered", name: "Pikachu", collectorNumber: "005" },
    { id: "pikachu-a", name: "Pikachu", collectorNumber: "010" },
  ]);

  it("matches on collector number when the names agree", () => {
    expect(match(product("Greninja ex - 021/128", "021/128"))?.id).toBe("greninja");
  });

  it("refuses a number match whose name disagrees", () => {
    // TCGplayer keeps a reprint's original number; ours was renumbered.
    expect(match(product("Delcatty", "5/109"))).toBeNull();
  });

  it("falls back to a name that is unique in the set", () => {
    expect(match(product("Charizard", "4/102"))?.id).toBe("charizard");
  });

  it("leaves an ambiguous name unmatched", () => {
    expect(match(product("Pikachu"))).toBeNull();
  });

  it("ignores sealed products", () => {
    expect(match(product("30th Celebration Booster Pack"))).toBeNull();
  });
});
