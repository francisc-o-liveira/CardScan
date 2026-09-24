"use client";

import { useMemo } from "react";
import type { TcgSlug } from "@cardscan/types";
import { useSets, useCards } from "./useCatalog";
import type { CatalogCard } from "@/services/catalog";

/** Smallest set worth showcasing as "new": skips one-card promos. */
const MIN_SET_CARDS = 30;

/** The API's max page size. */
const MAX_LIMIT = 100;

/**
 * Picks `count` cards spread evenly across `cards`.
 *
 * `/cards` only orders by name, so taking the first N of a set yields runs of
 * near-duplicates — four "Alolan Exeggutor ex" prints in a row, which makes a
 * showcase rail look broken. Sampling across the sorted page gives the variety
 * the rail is there to show, and stays deterministic so the row doesn't
 * reshuffle on every render.
 */
function spread<T>(items: T[], count: number): T[] {
  if (items.length <= count) return items;
  const step = items.length / count;
  return Array.from({ length: count }, (_, i) => items[Math.floor(i * step)]!);
}

/**
 * Cards from a game's most recently released set.
 *
 * The API has no "new cards" endpoint, but `/sets` is ordered by release date,
 * so the newest set's contents is a faithful stand-in — and it is real data
 * rather than a placeholder rail.
 */
export function useLatestSetCards(tcg: TcgSlug, count = 12) {
  const setsQuery = useSets(tcg);

  const latestSet = useMemo(() => {
    const sets = setsQuery.data;
    if (!sets?.length) return undefined;
    // Skip sets that report no cards — they render as an empty rail.
    // Prefer a real set over a one-card promo; fall back to any set with cards.
    return (
      sets.find((set) => (set.totalCards ?? 0) >= MIN_SET_CARDS) ??
      sets.find((set) => (set.totalCards ?? 0) > 0) ??
      sets[0]
    );
  }, [setsQuery.data]);

  const cardsQuery = useCards(
    { tcg, setId: latestSet?.id, limit: MAX_LIMIT },
    Boolean(latestSet?.id),
  );

  const cards: CatalogCard[] = useMemo(
    () => spread(cardsQuery.data?.data ?? [], count),
    [cardsQuery.data, count],
  );

  return {
    set: latestSet,
    cards,
    isLoading: setsQuery.isLoading || (Boolean(latestSet) && cardsQuery.isLoading),
    isError: setsQuery.isError || cardsQuery.isError,
  };
}
