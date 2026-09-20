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

/** Card as returned by `GET /api/cards` — a single printing with its set and TCG attached. */
export interface CatalogCard {
  id: string;
  tcgId: string;
  setId: string;
  name: string;
  collectorNumber: string;
  rarity: string | null;
  variant: string | null;
  imageUrl: string | null;
  set: { id: string; code: string; name: string };
  tcg: { id: string; slug: TcgSlug; name: string };
}

export interface CatalogSet {
  id: string;
  tcgId: string;
  code: string;
  name: string;
  releaseDate: string | null;
  totalCards: number | null;
  symbolUrl: string | null;
  tcg: { id: string; slug: TcgSlug; name: string };
}

export interface CatalogTcg {
  id: string;
  slug: TcgSlug;
  name: string;
  isEnabled: boolean;
}
