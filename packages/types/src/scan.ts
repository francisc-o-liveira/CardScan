import type { CatalogCard } from "./card";

export type ScanStatus = "pending" | "processing" | "completed" | "failed";

/** One possible match for a scanned card. */
export interface ScanCandidate {
  card: CatalogCard;
  /** Visual similarity to the photo. Only meaningful compared with the other candidates of the same scan. */
  score: number;
}

/** A photo the user scanned, and what CardScan recognised in it. Returned by /api/scans. */
export interface Scan {
  id: string;
  imageUrl: string;
  status: ScanStatus;
  /** 0..1: how sure CardScan is that the first candidate is the exact printing. */
  confidence: number | null;
  /** False when no card outline was found and the centre of the photo was matched instead. */
  cardFound: boolean;
  /** Best match first. */
  candidates: ScanCandidate[];
  /** The card the user confirmed, once they have. */
  selectedCard: CatalogCard | null;
  createdAt: string;
}
