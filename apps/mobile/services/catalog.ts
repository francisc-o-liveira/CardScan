import type { ApiResponse, PaginatedResponse, TcgSlug } from "@cardscan/types";
import { apiClient } from "@/lib/api-client";

/** Mirrors apps/web/services/catalog.ts so both clients read the same shapes. */
export interface CatalogTcg {
  id: string;
  slug: TcgSlug;
  name: string;
  isEnabled: boolean;
}

export interface CatalogSet {
  id: string;
  tcgId: string;
  code: string;
  name: string;
  releaseDate: string | null;
  totalCards: number | null;
  symbolUrl: string | null;
  tcg?: CatalogTcg;
}

export interface CatalogCard {
  id: string;
  tcgId: string;
  setId: string;
  name: string;
  collectorNumber: string;
  rarity: string | null;
  variant: string | null;
  imageUrl: string | null;
  set?: CatalogSet;
  tcg?: CatalogTcg;
}

export interface ListCardsParams {
  query?: string;
  tcg?: TcgSlug;
  setId?: string;
  page?: number;
  limit?: number;
}

const unwrap = <T>(body: ApiResponse<T>): T => {
  if (!body.success) throw new Error(body.error.message);
  return body.data;
};

export const catalogApi = {
  listSets: async (tcg?: TcgSlug): Promise<CatalogSet[]> => {
    const { data } = await apiClient.get<ApiResponse<CatalogSet[]>>("/sets", {
      params: tcg ? { tcg } : undefined,
    });
    return unwrap(data);
  },
  listCards: async (params: ListCardsParams): Promise<PaginatedResponse<CatalogCard>> => {
    const { data } = await apiClient.get<ApiResponse<PaginatedResponse<CatalogCard>>>("/cards", {
      params: Object.fromEntries(
        Object.entries(params).filter(([, value]) => value !== undefined && value !== ""),
      ),
    });
    return unwrap(data);
  },
};
