import type { CardLanguage, CatalogCard } from "./card";
import type { TcgSlug } from "./tcg";

export type CardCondition = "NM" | "LP" | "MP" | "HP" | "DMG";

/** One group of identical copies: same card, condition, language and variant. */
export interface CollectionItem {
  id: string;
  cardId: string;
  quantity: number;
  condition: CardCondition;
  language: CardLanguage;
  variant: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A card the user owns, with every group of copies of it. Returned by GET /api/collection. */
export interface CollectionEntry {
  card: CatalogCard;
  /** Copies across all conditions and languages. */
  quantity: number;
  items: CollectionItem[];
}

/** Totals for Home and Profile. Returned by GET /api/collection/summary. */
export interface CollectionSummary {
  /** Copies, counting duplicates. */
  totalCards: number;
  /** Distinct cards. */
  uniqueCards: number;
  totalSets: number;
  perGame: Partial<Record<TcgSlug, number>>;
  scans: number;
}
