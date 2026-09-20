import type { SupportedTcg } from "@cardscan/config";

/** A set/expansion, normalized from whatever a source calls it. `code` must be unique within its game. */
export interface NormalizedSet {
  code: string;
  name: string;
  releaseDate?: Date | null;
  totalCards?: number | null;
  symbolUrl?: string | null;
}

/**
 * One printing of a card. (setCode, collectorNumber, variant) is its identity, so a source that
 * has several rows for one collector number (foils, alternate art, rarities) must tell them apart
 * through `variant`. Use "" — never null — when there is no variant (Postgres treats NULLs as distinct).
 */
export interface NormalizedCard {
  setCode: string;
  collectorNumber: string;
  variant: string;
  name: string;
  rarity: string | null;
  /** Remote image URL, or null when the source has none. */
  imageUrl: string | null;
  /** Stable, unique-per-image id used as the file name when images are re-hosted. */
  imageKey: string;
}

export interface CatalogData {
  sets: NormalizedSet[];
  cards: NormalizedCard[];
}

/**
 * A card game's data source. Adding a game means writing one of these — the sync, storage,
 * upserts and API are shared.
 */
export interface CatalogProvider {
  slug: SupportedTcg;
  name: string;
  /**
   * `hotlink`: store the source's image URL as-is (official CDNs meant for this).
   * `rehost`: download each image once and serve it from our own /assets (for hobby-run sources).
   */
  imagePolicy: "hotlink" | "rehost";
  load(): Promise<CatalogData>;
  /** Only needed for `rehost`. */
  downloadImage?(url: string): Promise<Buffer>;
  log?: (message: string) => void;
}
