import { env } from "../../config/env";
import type { CatalogProvider, NormalizedCard, NormalizedSet } from "../catalog";
import { createHttpClient, type HttpClient } from "../http";

/** Digimon Card Game via digimoncard.io (https://digimoncard.io/api) — free, no key. */

export interface DigimonCard {
  name: string;
  /** Card number such as "BT3-007", "ST1-01", "P-009". */
  id: string;
  rarity?: string | null;
  /** Every product the card appeared in, e.g. ["BT-03: Booster Union Impact", "Revision Pack 2021"]. */
  set_name?: string[] | null;
}

const IMAGE_BASE = "https://images.digimoncard.io/images/cards";

/** "BT3-007" → "BT3"; "P-009" → "P". */
export const setCodeOf = (id: string): string => id.split("-")[0]?.toUpperCase() || "MISC";

/** "BT-03", "BT03" and "BT3" all describe the same set, so compare them in one canonical form. */
export const canonicalSetCode = (code: string): string | null => {
  const match = /^([A-Za-z]+)-?0*(\d+)$/.exec(code.trim());
  return match ? `${match[1]!.toUpperCase()}${match[2]}` : null;
};

const FALLBACK_NAMES: Record<string, string> = { P: "Promotional cards", MISC: "Other cards" };

/**
 * Card numbers only carry a code ("BT3"); the readable name lives in the card's `set_name` list
 * ("BT-03: Booster Union Impact"). Match the two through the canonical code.
 */
export const setNamesFrom = (cards: DigimonCard[]): Map<string, string> => {
  const names = new Map<string, string>();
  for (const card of cards) {
    const code = setCodeOf(card.id);
    if (names.has(code)) continue;
    const wanted = canonicalSetCode(code);
    for (const entry of card.set_name ?? []) {
      const [head, ...rest] = entry.split(":");
      if (rest.length && wanted && canonicalSetCode(head ?? "") === wanted) {
        names.set(code, entry.trim());
        break;
      }
    }
  }
  return names;
};

export const normalizeDigimon = (cards: DigimonCard[]) => {
  const names = setNamesFrom(cards);
  const counts = new Map<string, number>();
  for (const card of cards) counts.set(setCodeOf(card.id), (counts.get(setCodeOf(card.id)) ?? 0) + 1);

  const sets: NormalizedSet[] = [...counts].map(([code, total]) => ({
    code,
    name: names.get(code) ?? FALLBACK_NAMES[code] ?? code,
    totalCards: total,
  }));

  const normalized: NormalizedCard[] = cards.map((card) => ({
    setCode: setCodeOf(card.id),
    collectorNumber: card.id,
    variant: "",
    name: card.name,
    rarity: card.rarity ? card.rarity.toUpperCase() : null,
    imageUrl: `${IMAGE_BASE}/${encodeURIComponent(card.id)}.jpg`,
    imageKey: card.id,
  }));

  return { sets, cards: normalized };
};

export const createDigimonProvider = (
  client: HttpClient = createHttpClient({ baseURL: env.DIGIMON_API_URL }),
): CatalogProvider => ({
  slug: "digimon",
  name: "Digimon",
  imagePolicy: "hotlink",
  async load() {
    // One request returns every card with its details (the API allows ~15 requests / 10s).
    const cards = await client.getJson<DigimonCard[]>("/search", {
      params: { series: "Digimon Card Game", sort: "name" },
    });
    return normalizeDigimon(cards);
  },
});
