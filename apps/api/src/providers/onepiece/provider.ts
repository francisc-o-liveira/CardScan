import { env } from "../../config/env";
import type { CatalogProvider, NormalizedCard, NormalizedSet } from "../catalog";
import { createHttpClient, type HttpClient } from "../http";

/** One Piece Card Game via OPTCG API (https://optcgapi.com) — free, no key, hobby-run. */

export interface OptcgCard {
  card_name: string;
  set_id: string;
  set_name: string;
  rarity?: string | null;
  card_set_id: string;
  /** Unique per artwork: parallel/alt arts get their own id (e.g. "OP01-077_p1"). */
  card_image_id: string;
  card_image?: string | null;
}

export const normalizeOptcgCard = (card: OptcgCard): NormalizedCard => ({
  setCode: card.set_id,
  collectorNumber: card.card_image_id,
  variant: "",
  name: card.card_name,
  rarity: card.rarity || null,
  imageUrl: card.card_image || null,
  imageKey: card.card_image_id,
});

export const setsFromOptcgCards = (cards: OptcgCard[]): NormalizedSet[] => {
  const sets = new Map<string, NormalizedSet>();
  const counts = new Map<string, number>();
  for (const card of cards) {
    counts.set(card.set_id, (counts.get(card.set_id) ?? 0) + 1);
    if (!sets.has(card.set_id)) sets.set(card.set_id, { code: card.set_id, name: card.set_name });
  }
  return [...sets.values()].map((set) => ({ ...set, totalCards: counts.get(set.code) ?? null }));
};

export const createOnePieceProvider = (
  client: HttpClient = createHttpClient({ baseURL: env.ONEPIECE_API_URL }),
): CatalogProvider => ({
  slug: "onepiece",
  name: "One Piece",
  // A small hobby-run site: be a good citizen and serve the images ourselves instead of hotlinking.
  imagePolicy: "rehost",
  downloadImage: (url) => client.getBuffer(url),
  async load() {
    // Booster sets and starter decks are separate endpoints (the trailing slash is required).
    const [boosters, starters] = await Promise.all([
      client.getJson<OptcgCard[]>("/allSetCards/"),
      client.getJson<OptcgCard[]>("/allSTCards/"),
    ]);
    const all = [...boosters, ...starters];
    return { sets: setsFromOptcgCards(all), cards: all.map(normalizeOptcgCard) };
  },
});
