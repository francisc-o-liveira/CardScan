import { describe, expect, it } from "vitest";
import { buildBuyLinks } from "../../src/services/affiliateService";

const card = { name: "Charizard", setName: "Base Set", gameName: "Pokémon", gameSlug: "pokemon", prices: [{ externalId: "42346" }] };

describe("buy links", () => {
  it("links to the TCGplayer product and an eBay search, unmarked without affiliate ids", () => {
    const [tcgplayer, cardmarket, cardtrader, ebay] = buildBuyLinks(card, {});
    expect(cardmarket).toEqual({
      marketplace: "cardmarket",
      label: "Cardmarket",
      url: "https://www.cardmarket.com/en/Pokemon/Products/Search?searchString=Charizard",
      affiliate: false,
    });
    expect(cardtrader!.url).toBe("https://www.cardtrader.com/en/search?q=Charizard");
    expect(tcgplayer).toEqual({
      marketplace: "tcgplayer",
      label: "TCGplayer",
      url: "https://www.tcgplayer.com/product/42346",
      affiliate: false,
    });
    expect(new URL(ebay!.url).searchParams.get("_nkw")).toBe("Charizard Base Set Pokémon");
    expect(ebay!.affiliate).toBe(false);
    expect(new URL(ebay!.url).searchParams.has("campid")).toBe(false);
  });

  it("wraps the TCGplayer page in the affiliate link and adds the eBay campaign when configured", () => {
    const [tcgplayer, cardmarket, , ebay] = buildBuyLinks(card, {
      tcgplayerTemplate: "https://tcgplayer.pxf.io/c/123/456/789?u={url}",
      cardmarketTemplate: "https://aff.example/cm?u={url}",
      ebayCampaignId: "5338000000",
    });
    expect(cardmarket!.url).toBe(`https://aff.example/cm?u=${encodeURIComponent("https://www.cardmarket.com/en/Pokemon/Products/Search?searchString=Charizard")}`);
    expect(cardmarket!.affiliate).toBe(true);
    expect(tcgplayer!.url).toBe(
      `https://tcgplayer.pxf.io/c/123/456/789?u=${encodeURIComponent("https://www.tcgplayer.com/product/42346")}`,
    );
    expect(tcgplayer!.affiliate).toBe(true);
    expect(new URL(ebay!.url).searchParams.get("campid")).toBe("5338000000");
    expect(ebay!.affiliate).toBe(true);
  });

  it("skips TCGplayer for a card it has no product for", () => {
    const links = buildBuyLinks({ ...card, prices: [] }, {});
    expect(links.map((link) => link.marketplace)).toEqual(["cardmarket", "cardtrader", "ebay"]);
  });

  it("skips Cardmarket for a game whose pages could not be verified", () => {
    const links = buildBuyLinks({ ...card, gameSlug: "lorcana", prices: [] }, {});
    expect(links.map((link) => link.marketplace)).toEqual(["cardtrader", "ebay"]);
  });
});
