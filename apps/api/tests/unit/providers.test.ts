import { describe, expect, it } from "vitest";
import { buildAssetUrl, buildCardImageUrl } from "../../src/providers/pokemon/image";
import { getCardImageUrl } from "../../src/providers/magic/image";
import type { ScryfallCard } from "../../src/providers/magic/scryfall.types";
import { NO_SET, slugifySetName, toPrintings } from "../../src/providers/yugioh/normalize";
import type { YgoCard } from "../../src/providers/yugioh/ygoprodeck.types";

describe("TCGdex image URLs", () => {
  it("appends quality and format to card images", () => {
    expect(buildCardImageUrl("https://assets.tcgdex.net/en/base/base1/4")).toBe(
      "https://assets.tcgdex.net/en/base/base1/4/high.webp",
    );
    expect(buildCardImageUrl("https://x/1", "low", "png")).toBe("https://x/1/low.png");
  });

  it("appends only the format to set logos/symbols", () => {
    expect(buildAssetUrl("https://assets.tcgdex.net/en/base/base1/logo")).toBe(
      "https://assets.tcgdex.net/en/base/base1/logo.webp",
    );
  });
});

describe("Scryfall image selection", () => {
  const card = (extra: Partial<ScryfallCard>): ScryfallCard => ({
    id: "1", name: "X", lang: "en", set: "lea", set_name: "Alpha", collector_number: "1",
    rarity: "rare", digital: false, layout: "normal", ...extra,
  });

  it("prefers the top-level image at the requested size", () => {
    expect(getCardImageUrl(card({ image_uris: { large: "L", normal: "N" } }))).toBe("L");
    expect(getCardImageUrl(card({ image_uris: { large: "L", normal: "N" } }), "normal")).toBe("N");
  });

  it("falls back to the first face with an image for double-faced cards", () => {
    const dfc = card({
      layout: "transform",
      card_faces: [{ name: "Front" }, { name: "Back", image_uris: { large: "BACK" } }],
    });
    expect(getCardImageUrl(dfc)).toBe("BACK");
  });

  it("returns null when there is no image at all", () => {
    expect(getCardImageUrl(card({}))).toBeNull();
    expect(getCardImageUrl(card({ image_uris: { small: "S" } }))).toBeNull();
  });
});

describe("YGOPRODeck normalization", () => {
  const card: YgoCard = {
    id: 46986414,
    name: "Dark Magician",
    type: "Normal Monster",
    card_images: [
      { id: 46986414, image_url: "https://img/46986414.jpg" },
      { id: 46986415, image_url: "https://img/alt.jpg" },
    ],
    card_sets: [
      { set_name: "Duelist Pack: Yugi", set_code: "DPYG-EN001", set_rarity: "Rare" },
      { set_name: "Duelist Pack: Yugi", set_code: "DPYG-EN001", set_rarity: "Ultra Rare" },
      { set_name: "Dark Beginning 1", set_code: "DB1-EN102", set_rarity: "Ultra Rare" },
    ],
  };

  it("creates one printing per card_sets entry using the default artwork", () => {
    const printings = toPrintings(card);
    expect(printings).toHaveLength(3);
    expect(printings.every((p) => p.sourceImageUrl === "https://img/46986414.jpg")).toBe(true);
    expect(printings[0]).toMatchObject({
      setCode: "duelist-pack-yugi",
      collectorNumber: "DPYG-EN001",
      rarity: "Rare",
      variant: "Rare",
    });
  });

  it("keeps different rarities of the same print code distinct via `variant`", () => {
    const [rare, ultra] = toPrintings(card);
    expect(rare!.collectorNumber).toBe(ultra!.collectorNumber);
    expect(rare!.variant).not.toBe(ultra!.variant);
  });

  it("groups cards without any set under the pseudo-set", () => {
    const [printing] = toPrintings({ ...card, card_sets: undefined });
    expect(printing).toMatchObject({ setCode: NO_SET.code, collectorNumber: "46986414", variant: "", rarity: null });
  });

  it("slugifies set names into stable, unique-per-name codes", () => {
    expect(slugifySetName("2-Player Starter Deck: Yuya & Declan")).toBe("2-player-starter-deck-yuya-and-declan");
    expect(slugifySetName("Légende  d'Or!")).toBe("legende-d-or");
    expect(slugifySetName("Absolute Powerforce")).not.toBe(slugifySetName("Absolute Powerforce: Special Edition"));
  });

  it("tolerates a card with no images", () => {
    const [printing] = toPrintings({ ...card, card_images: [] });
    expect(printing!.sourceImageUrl).toBeNull();
  });
});
