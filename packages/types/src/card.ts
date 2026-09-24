import type { TcgSlug } from "./tcg";

export type CardLanguage = "en" | "pt" | "ja" | "es" | "fr" | "de" | "it";

export interface CardVariant {
  id: string;
  cardId: string;
  name: string;
  language: CardLanguage;
  imageUrl: string | null;
}

export interface Card {
  id: string;
  tcgId: string;
  tcg: TcgSlug;
  setId: string;
  name: string;
  collectorNumber: string;
  rarity: string | null;
  imageUrl: string | null;
  variants: CardVariant[];
}

export interface CardSearchParams {
  query?: string;
  tcg?: TcgSlug;
  setId?: string;
  rarity?: string;
  language?: CardLanguage;
  page?: number;
  limit?: number;
  sortBy?: "name" | "price" | "rarity" | "releaseDate";
}

/**
 * One finish's price from one source. TCGplayer prices each finish separately
 * ("Normal", "Holofoil", "Reverse Holofoil", "1st Edition" …); amounts are in
 * `currency` and `null` when the source has no sales/listings for that figure.
 */
export interface CardPrice {
  source: string;
  subType: string;
  market: number | null;
  low: number | null;
  mid: number | null;
  high: number | null;
  currency: string;
  /** TCGplayer productId — links to https://www.tcgplayer.com/product/{id}. */
  externalId: string | null;
  updatedAt: string;
}

export type PriceHistoryRange = "1m" | "3m" | "6m" | "1y";

/** One finish's market-price series over the requested range, one point per day recorded. */
export interface PriceHistorySeries {
  subType: string;
  currency: string;
  points: { date: string; market: number }[];
  /** Latest point in the range vs the first one; null with fewer than two points. */
  change: { amount: number; percent: number } | null;
  low: number;
  high: number;
}

/** `GET /api/cards/:id/price-history?range=3m` */
export interface CardPriceHistory {
  range: PriceHistoryRange;
  source: string;
  /** The first day any history exists for this card — it only grows from the first price sync. */
  trackedSince: string | null;
  series: PriceHistorySeries[];
}

/** The single figure shown on tiles and headers: the card's main finish's market price. */
export interface CardMarketPrice {
  amount: number;
  currency: string;
  subType: string;
}

/** A place to buy the card. `affiliate` is true when the link earns a commission, which the apps must disclose. */
export interface BuyLink {
  marketplace: "tcgplayer" | "cardmarket" | "cardtrader" | "ebay";
  label: string;
  url: string;
  affiliate: boolean;
}

/**
 * Card as returned by `GET /api/cards` — a single printing with its set and
 * TCG attached. Both are absent on the bare card rows nested inside
 * `GET /api/sets/:id`, which is why they are optional here.
 */
export interface CatalogCard {
  id: string;
  tcgId: string;
  setId: string;
  name: string;
  collectorNumber: string;
  rarity: string | null;
  variant: string | null;
  imageUrl: string | null;
  set?: CatalogSet;
  tcg?: CatalogTcg;
  /** `null` when no source prices this card. */
  marketPrice: CardMarketPrice | null;
  /** Every finish's full price row — only on `GET /api/cards/:id`. */
  prices?: CardPrice[];
  /** Where to buy it — only on `GET /api/cards/:id`. */
  buyLinks?: BuyLink[];
}

export interface CatalogSet {
  id: string;
  tcgId: string;
  code: string;
  name: string;
  releaseDate: string | null;
  totalCards: number | null;
  symbolUrl: string | null;
  tcg?: CatalogTcg;
}

export interface CatalogTcg {
  id: string;
  slug: TcgSlug;
  name: string;
  isEnabled: boolean;
}
