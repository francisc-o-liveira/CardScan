import type { Card } from "./card";
import type { CardLanguage } from "./card";

export type CardCondition = "NM" | "LP" | "MP" | "HP" | "DMG";

export interface CollectionItem {
  id: string;
  userId: string;
  cardId: string;
  card?: Card;
  quantity: number;
  condition: CardCondition;
  language: CardLanguage;
  variant: string | null;
  notes: string | null;
  purchasePrice: number | null;
  purchaseDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionStats {
  totalCards: number;
  uniqueCards: number;
  estimatedValue: number;
  totalSets: number;
  wishlistCount: number;
}
