import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { detectPitchColor, pitchOf } from "../../src/recognition/pitchColor";

/** A card-sized image with a coloured line where Flesh and Blood puts it, along the top of the title bar. */
const cardWithLine = (color: string | null) =>
  sharp({ create: { width: 488, height: 680, channels: 3, background: "#e8e0d0" } })
    .composite(color ? [{ input: { create: { width: 250, height: 4, channels: 3, background: color } }, left: 120, top: 30 }] : [])
    .png()
    .toBuffer();

describe("Flesh and Blood pitch colour", () => {
  it("reads the pitch from the card name", () => {
    expect(pitchOf("Voltic Bolt (Red)")).toBe("Red");
    expect(pitchOf("Voltic Bolt (Blue)")).toBe("Blue");
    expect(pitchOf("Command and Conquer")).toBeNull();
    expect(pitchOf("Ira, Crimson Haze")).toBeNull();
  });

  it("detects the colour of the line on the card", async () => {
    expect(await detectPitchColor(await cardWithLine("#d02030"))).toBe("Red");
    expect(await detectPitchColor(await cardWithLine("#e8c020"))).toBe("Yellow");
    expect(await detectPitchColor(await cardWithLine("#2060d0"))).toBe("Blue");
  });

  it("says nothing when there is no coloured line", async () => {
    expect(await detectPitchColor(await cardWithLine(null))).toBeNull();
  });
});
