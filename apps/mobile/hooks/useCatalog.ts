import { useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { TcgSlug } from "@cardscan/types";
import { api } from "@/services/api";
import type { ListCardsParams } from "@/services/catalog";

const CATALOG_STALE_TIME = 10 * 60 * 1000;

export function useSets(tcg?: TcgSlug) {
  return useQuery({
    queryKey: ["catalog", "sets", tcg ?? "all"],
    queryFn: () => api.catalog.listSets(tcg),
    staleTime: CATALOG_STALE_TIME,
  });
}

export function useCards(params: ListCardsParams, enabled = true) {
  return useQuery({
    queryKey: ["catalog", "cards", params],
    queryFn: () => api.catalog.listCards(params),
    staleTime: CATALOG_STALE_TIME,
    placeholderData: keepPreviousData,
    enabled,
  });
}

/**
 * Cards from a game's newest set — the API orders /sets by release date, so
 * this is a faithful "what's new" without a dedicated endpoint.
 */
export function useLatestSetCards(tcg: TcgSlug, limit = 10) {
  const setsQuery = useSets(tcg);

  const latestSet = useMemo(() => {
    const sets = setsQuery.data;
    if (!sets?.length) return undefined;
    return sets.find((set) => (set.totalCards ?? 0) > 0) ?? sets[0];
  }, [setsQuery.data]);

  const cardsQuery = useCards({ tcg, setId: latestSet?.id, limit }, Boolean(latestSet?.id));

  return {
    set: latestSet,
    cards: cardsQuery.data?.data ?? [],
    isLoading: setsQuery.isLoading || (Boolean(latestSet) && cardsQuery.isLoading),
  };
}
