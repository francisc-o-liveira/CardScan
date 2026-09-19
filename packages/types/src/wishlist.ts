import type { Card } from "./card";

export interface WishlistItem {
  id: string;
  userId: string;
  cardId: string;
  card?: Card;
  priority: number;
  targetPrice: number | null;
  notes: string | null;
  createdAt: string;
}
