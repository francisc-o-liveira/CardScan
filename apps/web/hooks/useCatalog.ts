import { keepPreviousData, useQuery } from "@tanstack/react-query";
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

export const useCards = (params: CardListParams) =>
  useQuery({
    queryKey: ["catalog", "cards", params],
    queryFn: () => api.catalog.listCards(params),
    placeholderData: keepPreviousData,
  });
