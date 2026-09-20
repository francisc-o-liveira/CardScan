import type {
  ApiResponse,
  CatalogCard,
  CatalogSet,
  CatalogTcg,
  PaginatedResponse,
  TcgSlug,
} from "@cardscan/types";
import { apiClient } from "@/lib/api-client";

/** Shared with web and the API through @cardscan/types, so shapes can't drift. */
export type { CatalogCard, CatalogSet, CatalogTcg };

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
  listTcgs: async (): Promise<CatalogTcg[]> => {
    const { data } = await apiClient.get<ApiResponse<CatalogTcg[]>>("/tcgs");
    return unwrap(data);
  },
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
