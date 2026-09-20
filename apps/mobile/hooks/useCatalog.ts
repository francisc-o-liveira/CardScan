import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import type { CardListParams } from "@/services/catalog";

export const useTcgs = () =>
  useQuery({ queryKey: ["catalog", "tcgs"], queryFn: () => api.catalog.listTcgs(), staleTime: 5 * 60_000 });

export const useSets = (tcg?: string) =>
  useQuery({
    queryKey: ["catalog", "sets", tcg ?? "all"],
    queryFn: () => api.catalog.listSets(tcg),
    enabled: Boolean(tcg),
    staleTime: 5 * 60_000,
  });

/** Infinite scroll: each page is fetched when the list reaches its end. */
export const useInfiniteCards = (filters: Omit<CardListParams, "page">) =>
  useInfiniteQuery({
    queryKey: ["catalog", "cards", "infinite", filters],
    queryFn: ({ pageParam }) => api.catalog.listCards({ ...filters, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.pagination.page < last.pagination.totalPages ? last.pagination.page + 1 : undefined),
  });
