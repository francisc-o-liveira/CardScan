import { describe, expect, it } from "vitest";
import { printedEvidence, rankByPrint } from "../../src/recognition/printedText";

describe("printedEvidence", () => {
  it("finds a code-style collector number whatever the spacing or case", () => {
    expect(printedEvidence("RA03 - EN080 \n", { number: "RA03-EN080" })).toBe(2);
    expect(printedEvidence("lob-en001", { number: "LOB-EN001" })).toBe(2);
    expect(printedEvidence("RA03-EN079", { number: "RA03-EN080" })).toBe(0);
  });

  it("matches a plain number next to a slash, and the set total as a second point", () => {
    expect(printedEvidence("002/131 R", { number: "2", setTotal: 131 })).toBe(2);
    expect(printedEvidence("002/131 R", { number: "2", setTotal: 200 })).toBe(1);
    expect(printedEvidence("045/204", { number: "2", setTotal: 131 })).toBe(0);
  });

  it("matches a lone number and a set code as a word", () => {
    expect(printedEvidence("0123 M21 EN", { number: "123", setCode: "m21" })).toBe(2);
    expect(printedEvidence("0123 M21 EN", { number: "124", setCode: "m21" })).toBe(1);
  });

  it("does not take a code inside a longer word for a set code", () => {
    expect(printedEvidence("ILLUS ANIMAL", { number: "9", setCode: "M21" })).toBe(0);
    expect(printedEvidence("STAMPED", { number: "9", setCode: "AM" })).toBe(0);
  });

  it("gives no evidence when nothing could be read", () => {
    expect(printedEvidence("   ", { number: "RA03-EN080" })).toBe(0);
  });
});

describe("rankByPrint", () => {
  const cards = [
    { id: "a", score: 0.9 },
    { id: "b", score: 0.895 },
    { id: "c", score: 0.7 },
  ];

  it("promotes the printing the text confirms among near-identical candidates", () => {
    const { ranked, confident } = rankByPrint(cards, (c) => (c.id === "b" ? 2 : 0), 0.03);
    expect(ranked.map((c) => c.id)).toEqual(["b", "a", "c"]);
    expect(confident).toBe(true);
  });

  it("keeps the visual order when the text confirms nothing, and is not confident", () => {
    const { ranked, confident } = rankByPrint(cards, () => 0, 0.03);
    expect(ranked.map((c) => c.id)).toEqual(["a", "b", "c"]);
    expect(confident).toBe(false);
  });

  it("is not confident when two printings are confirmed equally", () => {
    expect(rankByPrint(cards, (c) => (c.id === "c" ? 0 : 2), 0.03).confident).toBe(false);
  });

  it("never lifts a candidate that looks clearly different", () => {
    const { ranked } = rankByPrint(cards, (c) => (c.id === "c" ? 3 : 0), 0.03);
    expect(ranked[2]!.id).toBe("c");
  });
});
