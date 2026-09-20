import { env } from "../../config/env";
import type { CatalogProvider, NormalizedCard, NormalizedSet } from "../catalog";
import { createHttpClient, sleep, type HttpClient } from "../http";

/** Star Wars: Unlimited via SWU-DB (https://www.swu-db.com/api) — free, no key. */

export interface SwuSet {
  setId: string;
  fullName: string;
  numberCards?: number;
  /** "7/11/25" (US month/day/two-digit year). */
  releaseDate?: string;
  parentSetId?: string;
}

export interface SwuCard {
  Set: string;
  Number: string;
  Name: string;
  Subtitle?: string | null;
  Rarity?: string | null;
  FrontArt?: string | null;
}

const REQUEST_SPACING_MS = 150;

export const parseSwuDate = (value: string | undefined): Date | null => {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(value?.trim() ?? "");
  if (!match) return null;
  const year = Number(match[3]) < 100 ? 2000 + Number(match[3]) : Number(match[3]);
  return new Date(Date.UTC(year, Number(match[1]) - 1, Number(match[2])));
};

export const normalizeSwuSet = (set: SwuSet): NormalizedSet => ({
  code: set.setId,
  name: set.fullName,
  releaseDate: parseSwuDate(set.releaseDate),
  totalCards: set.numberCards ?? null,
});

/**
 * Foil versions are numbered with an "F" ("059F") and the API points them at "…/059F.png" — a file
 * the CDN does not have (403). A foil is the same artwork as its non-foil, which lives at "…/059.png".
 */
export const swuImageUrl = (card: Pick<SwuCard, "Number" | "FrontArt">): string | null => {
  const art = card.FrontArt;
  if (!art) return null;
  if (!/F$/.test(card.Number)) return art;
  return art.replace(new RegExp(`${card.Number}(\\.\\w+)$`), `${card.Number.slice(0, -1)}$1`);
};

export const normalizeSwuCard = (card: SwuCard, setCode: string): NormalizedCard => ({
  setCode,
  // Numbers are unique within a set; foil/hyperspace/showcase versions carry their own number.
  collectorNumber: card.Number,
  variant: "",
  name: card.Subtitle ? `${card.Name} - ${card.Subtitle}` : card.Name,
  rarity: card.Rarity || null,
  imageUrl: swuImageUrl(card),
  imageKey: `${setCode}-${card.Number}`,
});

export const createStarWarsProvider = (
  client: HttpClient = createHttpClient({ baseURL: env.STARWARS_API_URL }),
  spacingMs = REQUEST_SPACING_MS,
): CatalogProvider => ({
  slug: "starwars",
  name: "Star Wars: Unlimited",
  imagePolicy: "hotlink",
  async load() {
    const swuSets = await client.getJson<SwuSet[]>("/sets");
    const sets: NormalizedSet[] = [];
    const cards: NormalizedCard[] = [];

    for (const set of swuSets) {
      try {
        const { data } = await client.getJson<{ data: SwuCard[] }>(`/cards/${encodeURIComponent(set.setId.toLowerCase())}`);
        sets.push(normalizeSwuSet(set));
        cards.push(...data.map((card) => normalizeSwuCard(card, set.setId)));
      } catch (error) {
        // A set that is announced but not published yet answers 404 — skip it, keep the rest.
        console.warn(`[starwars-sync] Skipping set ${set.setId}: ${error instanceof Error ? error.message : error}`);
      }
      await sleep(spacingMs);
    }
    return { sets, cards };
  },
});
