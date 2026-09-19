import type { Card } from "./card";
import type { TcgSlug } from "./tcg";

export interface DeckItem {
  id: string;
  deckId: string;
  cardId: string;
  card?: Card;
  quantity: number;
}

export interface Deck {
  id: string;
  userId: string;
  name: string;
  tcg: TcgSlug;
  items: DeckItem[];
  createdAt: string;
  updatedAt: string;
}
