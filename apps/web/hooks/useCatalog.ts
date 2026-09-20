"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { TcgSlug } from "@cardscan/types";
import { api } from "@/services/api";
import type { ListCardsParams } from "@/services/catalog";

/** Catalog data is effectively static between syncs, so cache it generously. */
const CATALOG_STALE_TIME = 10 * 60 * 1000;

export const catalogKeys = {
  tcgs: ["catalog", "tcgs"] as const,
  sets: (tcg?: TcgSlug) => ["catalog", "sets", tcg ?? "all"] as const,
  set: (id: string) => ["catalog", "set", id] as const,
  cards: (params: ListCardsParams) => ["catalog", "cards", params] as const,
  card: (id: string) => ["catalog", "card", id] as const,
};

export function useTcgs() {
  return useQuery({
    queryKey: catalogKeys.tcgs,
    queryFn: () => api.catalog.listTcgs(),
    staleTime: CATALOG_STALE_TIME,
  });
}

export function useSets(tcg?: TcgSlug, enabled = true) {
  return useQuery({
    queryKey: catalogKeys.sets(tcg),
    queryFn: () => api.catalog.listSets(tcg),
    staleTime: CATALOG_STALE_TIME,
    enabled,
  });
}

export function useSet(id: string | undefined) {
  return useQuery({
    queryKey: catalogKeys.set(id ?? ""),
    queryFn: () => api.catalog.getSet(id!),
    staleTime: CATALOG_STALE_TIME,
    enabled: Boolean(id),
  });
}

/**
 * `placeholderData: keepPreviousData` keeps the previous page's cards on screen
 * while the next page loads, so paging and filtering never flash an empty grid.
 */
export function useCards(params: ListCardsParams, enabled = true) {
  return useQuery({
    queryKey: catalogKeys.cards(params),
    queryFn: () => api.catalog.listCards(params),
    staleTime: CATALOG_STALE_TIME,
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useCard(id: string | undefined) {
  return useQuery({
    queryKey: catalogKeys.card(id ?? ""),
    queryFn: () => api.catalog.getCard(id!),
    staleTime: CATALOG_STALE_TIME,
    enabled: Boolean(id),
  });
}
