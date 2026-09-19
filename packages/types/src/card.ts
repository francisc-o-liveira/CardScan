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
