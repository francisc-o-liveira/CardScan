import { useMemo } from "react";
import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type { PriceHistoryRange, TcgSlug } from "@cardscan/types";
import { api } from "@/services/api";
import type { ListCardsParams } from "@/services/catalog";

/** Smallest set worth showcasing as "new": skips one-card promos. */
const MIN_SET_CARDS = 30;
/** The API's max page size. */
const MAX_PAGE = 100;

/**
 * Picks `count` items spread evenly across `items`. Cards come sorted by name, so the first N are runs of
 * near-duplicates; sampling across the set gives a rail with variety. Same as the web app.
 */
function spread<T>(items: T[], count: number): T[] {
  if (items.length <= count) return items;
  const step = items.length / count;
  return Array.from({ length: count }, (_, i) => items[Math.floor(i * step)]!);
}

const CATALOG_STALE_TIME = 10 * 60 * 1000;

export function useTcgs() {
  return useQuery({
    queryKey: ["catalog", "tcgs"],
    queryFn: () => api.catalog.listTcgs(),
    staleTime: CATALOG_STALE_TIME,
  });
}

export function useSets(tcg?: TcgSlug, enabled = true) {
  return useQuery({
    queryKey: ["catalog", "sets", tcg ?? "all"],
    queryFn: () => api.catalog.listSets(tcg),
    staleTime: CATALOG_STALE_TIME,
    enabled,
  });
}

export function useSet(id: string | undefined) {
  return useQuery({
    queryKey: ["catalog", "set", id ?? ""],
    queryFn: () => api.catalog.getSet(id!),
    staleTime: CATALOG_STALE_TIME,
    enabled: Boolean(id),
  });
}

export function useCard(id: string | undefined) {
  return useQuery({
    queryKey: ["catalog", "card", id ?? ""],
    queryFn: () => api.catalog.getCard(id!),
    staleTime: CATALOG_STALE_TIME,
    enabled: Boolean(id),
  });
}

/** Prices change once a day, so the history is cached like the rest of the catalog. */
export function usePriceHistory(id: string | undefined, range: PriceHistoryRange) {
  return useQuery({
    queryKey: ["catalog", "card", id ?? "", "price-history", range],
    queryFn: () => api.catalog.getPriceHistory(id!, range),
    staleTime: CATALOG_STALE_TIME,
    placeholderData: keepPreviousData,
    enabled: Boolean(id),
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

/** Infinite scroll: each page is fetched when the list reaches its end. */
export function useInfiniteCards(filters: Omit<ListCardsParams, "page">) {
  return useInfiniteQuery({
    queryKey: ["catalog", "cards", "infinite", filters],
    queryFn: ({ pageParam }) => api.catalog.listCards({ ...filters, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.pagination.page < last.pagination.totalPages ? last.pagination.page + 1 : undefined,
    staleTime: CATALOG_STALE_TIME,
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
    // Prefer a real set over a one-card promo; fall back to any set with cards.
    return (
      sets.find((set) => (set.totalCards ?? 0) >= MIN_SET_CARDS) ??
      sets.find((set) => (set.totalCards ?? 0) > 0) ??
      sets[0]
    );
  }, [setsQuery.data]);

  const cardsQuery = useCards({ tcg, setId: latestSet?.id, limit: MAX_PAGE }, Boolean(latestSet?.id));
  const cards = useMemo(() => spread(cardsQuery.data?.data ?? [], limit), [cardsQuery.data, limit]);

  return {
    set: latestSet,
    cards,
    isLoading: setsQuery.isLoading || (Boolean(latestSet) && cardsQuery.isLoading),
  };
}
