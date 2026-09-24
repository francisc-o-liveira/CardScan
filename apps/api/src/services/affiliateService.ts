import type { BuyLink, CardPrice } from "@cardscan/types";
import { env } from "../config/env";

interface AffiliateConfig {
  /** Deep-link template of the TCGplayer affiliate program, with `{url}` where the product page goes. */
  tcgplayerTemplate?: string;
  /** eBay Partner Network campaign id. */
  ebayCampaignId?: string;
  /** Deep-link templates (with `{url}`) of the Cardmarket and CardTrader affiliate programs. */
  cardmarketTemplate?: string;
  cardtraderTemplate?: string;
}

interface BuyableCard {
  name: string;
  setName?: string | null;
  gameName?: string | null;
  /** The game's slug, for the marketplaces that have one page tree per game. */
  gameSlug?: string | null;
  prices: Pick<CardPrice, "externalId">[];
}

const TCGPLAYER_PRODUCT = "https://www.tcgplayer.com/product/";

const fromEnv = (): AffiliateConfig => ({
  tcgplayerTemplate: env.AFFILIATE_TCGPLAYER_URL,
  ebayCampaignId: env.AFFILIATE_EBAY_CAMPAIGN_ID,
  cardmarketTemplate: env.AFFILIATE_CARDMARKET_URL,
  cardtraderTemplate: env.AFFILIATE_CARDTRADER_URL,
});

/**
 * Cardmarket keeps a page tree per game. Only these are listed: their search pages cannot be checked
 * automatically (the site turns away scripts), and a wrong path would send people to a 404.
 */
const CARDMARKET_GAMES: Record<string, string> = { magic: "Magic", pokemon: "Pokemon", yugioh: "YuGiOh" };

const wrap = (template: string | undefined, url: string) =>
  template ? template.replace("{url}", encodeURIComponent(url)) : url;

/**
 * Where to buy a card. The links work without any affiliate account (they just earn nothing); each one is
 * marked `affiliate: true` only when a tracking id is configured, so the apps show the commission notice
 * exactly when there is a commission.
 */
export const buildBuyLinks = (card: BuyableCard, config: AffiliateConfig = fromEnv()): BuyLink[] => {
  const links: BuyLink[] = [];

  // The product id TCGplayer gave us for this printing; any of the card's finishes shares one page.
  const productId = card.prices.find((price) => price.externalId)?.externalId;
  if (productId) {
    const page = `${TCGPLAYER_PRODUCT}${encodeURIComponent(productId)}`;
    const template = config.tcgplayerTemplate;
    links.push({
      marketplace: "tcgplayer",
      label: "TCGplayer",
      url: template ? template.replace("{url}", encodeURIComponent(page)) : page,
      affiliate: Boolean(template),
    });
  }

  const cardmarketGame = card.gameSlug ? CARDMARKET_GAMES[card.gameSlug] : undefined;
  if (cardmarketGame) {
    const search = new URL(`https://www.cardmarket.com/en/${cardmarketGame}/Products/Search`);
    search.searchParams.set("searchString", card.name);
    links.push({
      marketplace: "cardmarket",
      label: "Cardmarket",
      url: wrap(config.cardmarketTemplate, search.toString()),
      affiliate: Boolean(config.cardmarketTemplate),
    });
  }

  const cardtrader = new URL("https://www.cardtrader.com/en/search");
  cardtrader.searchParams.set("q", card.name);
  links.push({
    marketplace: "cardtrader",
    label: "CardTrader",
    url: wrap(config.cardtraderTemplate, cardtrader.toString()),
    affiliate: Boolean(config.cardtraderTemplate),
  });

  const query = [card.name, card.setName, card.gameName].filter(Boolean).join(" ");
  const ebay = new URL("https://www.ebay.com/sch/i.html");
  ebay.searchParams.set("_nkw", query);
  if (config.ebayCampaignId) {
    // The parameters the eBay Partner Network reads to credit a click.
    ebay.searchParams.set("mkcid", "1");
    ebay.searchParams.set("mkrid", "711-53200-19255-0");
    ebay.searchParams.set("siteid", "0");
    ebay.searchParams.set("campid", config.ebayCampaignId);
    ebay.searchParams.set("toolid", "10001");
    ebay.searchParams.set("mkevt", "1");
  }
  links.push({ marketplace: "ebay", label: "eBay", url: ebay.toString(), affiliate: Boolean(config.ebayCampaignId) });

  return links;
};
