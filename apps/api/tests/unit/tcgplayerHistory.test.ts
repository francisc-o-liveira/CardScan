import { describe, expect, it } from "vitest";
import { parseHistory } from "../../src/services/tcgplayerHistoryService";

const bucket = (date: string, price: string) => ({ bucketStartDate: date, marketPrice: price });

const body = {
  result: [
    { variant: "Holofoil", language: "English", condition: "Moderately Played", buckets: [bucket("2026-09-01", "20")] },
    {
      variant: "Holofoil",
      language: "English",
      condition: "Near Mint",
      buckets: [bucket("2026-09-02", "31.5"), bucket("2026-09-01", "30"), bucket("2026-09-03", "0")],
    },
    { variant: "Normal", condition: "Near Mint", buckets: [bucket("2026-09-01", "1")] },
  ],
};

describe("TCGplayer history parsing", () => {
  it("uses the Near Mint listing of the finish, oldest first, and drops empty buckets", () => {
    const points = parseHistory(body, "Holofoil");
    expect(points.map((p) => p.market)).toEqual([30, 31.5]);
    expect(points[0]!.date.toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });

  it("treats an empty finish as Normal, ignoring case", () => {
    expect(parseHistory(body, "").map((p) => p.market)).toEqual([1]);
    expect(parseHistory(body, "holofoil")).toHaveLength(2);
  });

  it("returns nothing for a finish TCGplayer does not list", () => {
    expect(parseHistory(body, "Reverse Holofoil")).toEqual([]);
    expect(parseHistory({}, "Normal")).toEqual([]);
  });
});
