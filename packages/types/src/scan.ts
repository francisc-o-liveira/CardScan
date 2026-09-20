import type { Card } from "./card";
import type { TcgSlug } from "./tcg";

export type ScanStatus = "pending" | "processing" | "completed" | "failed";

export interface CardCandidate {
  card: Card;
  confidence: number;
}

export interface CardRecognitionResult {
  tcg: TcgSlug;
  cardName?: string;
  setCode?: string;
  collectorNumber?: string;
  confidence: number;
  candidates: CardCandidate[];
}

export interface Scan {
  id: string;
  userId: string;
  imageUrl: string;
  status: ScanStatus;
  result: CardRecognitionResult | null;
  selectedCardId: string | null;
  createdAt: string;
}
