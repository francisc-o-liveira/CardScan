import { env } from "../../config/env";
import type { CatalogProvider, NormalizedCard, NormalizedSet } from "../catalog";
import { createHttpClient, type HttpClient } from "../http";

/**
 * Flesh and Blood from the community "the-fab-cube" open dataset
 * (https://github.com/the-fab-cube/flesh-and-blood-cards) — free JSON, no key. Card images are the
 * official Legend Story Studios card-database CDN.
 */

export interface FabPrinting {
  unique_id: string;
  /** Print number such as "ENG025" or "WTR001". */
  id: string;
  set_id: string;
  edition?: string;
  foiling?: string;
  rarity?: string;
  art_variations?: string[];
  image_url?: string | null;
}

export interface FabCard {
  unique_id: string;
  name: string;
  /** Pitch colour ("Red", "Yellow", "Blue") — the three pitch versions of a card share a name. */
  color?: string;
  printings: FabPrinting[];
}

export interface FabSet {
  id: string;
  name: string;
  printings?: { initial_release_date?: string | null }[];
}

export const fabCardName = (card: FabCard) => (card.color ? `${card.name} (${card.color})` : card.name);

const baseVariant = (printing: FabPrinting) =>
  [printing.edition, printing.foiling, ...(printing.art_variations ?? [])].filter(Boolean).join("-");

export const normalizeFabSet = (set: FabSet): NormalizedSet => {
  const dates = (set.printings ?? [])
    .map((p) => (p.initial_release_date ? Date.parse(p.initial_release_date) : NaN))
    .filter((t) => !Number.isNaN(t));
  return { code: set.id, name: set.name, releaseDate: dates.length ? new Date(Math.min(...dates)) : null };
};

/**
 * One row per printing. The same print number appears in several editions and foilings, and the
 * dataset has a few genuinely identical combinations — those are told apart by their unique id.
 */
export const normalizeFabCards = (cards: FabCard[]): NormalizedCard[] => {
  const flat = cards.flatMap((card) => card.printings.map((printing) => ({ card, printing })));

  const groupSize = new Map<string, number>();
  const groupKey = (p: FabPrinting) => `${p.set_id}\u0000${p.id}\u0000${baseVariant(p)}`;
  for (const { printing } of flat) groupSize.set(groupKey(printing), (groupSize.get(groupKey(printing)) ?? 0) + 1);

  return flat.map(({ card, printing }) => {
    const ambiguous = (groupSize.get(groupKey(printing)) ?? 0) > 1;
    return {
      setCode: printing.set_id,
      collectorNumber: printing.id,
      variant: ambiguous ? `${baseVariant(printing)}~${printing.unique_id.slice(0, 6)}` : baseVariant(printing),
      name: fabCardName(card),
      rarity: printing.rarity || null,
      imageUrl: printing.image_url || null,
      imageKey: printing.unique_id,
    };
  });
};

export const createFabProvider = (
  client: HttpClient = createHttpClient({ baseURL: env.FAB_DATA_URL, timeoutMs: 180_000 }),
): CatalogProvider => ({
  slug: "fab",
  name: "Flesh and Blood",
  imagePolicy: "hotlink",
  async load() {
    const [cards, sets] = await Promise.all([client.getJson<FabCard[]>("/card.json"), client.getJson<FabSet[]>("/set.json")]);
    return { sets: sets.map(normalizeFabSet), cards: normalizeFabCards(cards) };
  },
});
