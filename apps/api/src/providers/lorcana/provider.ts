import { env } from "../../config/env";
import type { CatalogProvider, NormalizedCard, NormalizedSet } from "../catalog";
import { createHttpClient, sleep, type HttpClient } from "../http";

/** Disney Lorcana via Lorcast (https://lorcast.com/docs/api) — free, no key, official card art CDN. */

export interface LorcastSet {
  id: string;
  name: string;
  code: string;
  released_at?: string | null;
}

export interface LorcastCard {
  id: string;
  name: string;
  /** Lorcana cards are "Name - Version" (e.g. "Goofy - Musketeer"). */
  version?: string | null;
  rarity?: string | null;
  collector_number: string;
  lang?: string;
  image_uris?: { digital?: { small?: string; normal?: string; large?: string } };
}

const REQUEST_SPACING_MS = 120; // Lorcast asks for 50–100ms between requests.

export const normalizeLorcastSet = (set: LorcastSet, cardCount?: number): NormalizedSet => ({
  code: set.code,
  name: set.name,
  releaseDate: set.released_at ? new Date(set.released_at) : null,
  totalCards: cardCount ?? null,
});

const prettyRarity = (rarity: string | null | undefined) =>
  rarity ? rarity.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()) : null;

export const normalizeLorcastCard = (card: LorcastCard, setCode: string): NormalizedCard => {
  const art = card.image_uris?.digital;
  return {
    setCode,
    collectorNumber: card.collector_number,
    variant: "",
    name: card.version ? `${card.name} - ${card.version}` : card.name,
    rarity: prettyRarity(card.rarity),
    // Lorcast only serves AVIF; every current browser supports it.
    imageUrl: art?.large ?? art?.normal ?? art?.small ?? null,
    imageKey: card.id,
  };
};

export const createLorcanaProvider = (
  client: HttpClient = createHttpClient({ baseURL: env.LORCANA_API_URL }),
  spacingMs = REQUEST_SPACING_MS,
): CatalogProvider => ({
  slug: "lorcana",
  name: "Disney Lorcana",
  imagePolicy: "hotlink",
  async load() {
    const { results: lorcastSets } = await client.getJson<{ results: LorcastSet[] }>("/sets");
    const sets: NormalizedSet[] = [];
    const cards: NormalizedCard[] = [];

    for (const set of lorcastSets) {
      const list = await client.getJson<LorcastCard[]>(`/sets/${encodeURIComponent(set.code)}/cards`);
      const english = list.filter((card) => !card.lang || card.lang === "en");
      sets.push(normalizeLorcastSet(set, english.length));
      cards.push(...english.map((card) => normalizeLorcastCard(card, set.code)));
      await sleep(spacingMs);
    }
    return { sets, cards };
  },
});
