import type { ApiResponse, CatalogCard, CatalogSet, CatalogTcg, PaginatedResponse } from "@cardscan/types";
import { apiClient } from "@/lib/api-client";

const unwrap = <T>(response: ApiResponse<T>): T => {
  if (!response.success) {
    throw new Error(response.error.message);
  }
  return response.data;
};

export interface CardListParams {
  tcg?: string;
  setId?: string;
  query?: string;
  page?: number;
  limit?: number;
}

export const catalogApi = {
  listTcgs: async () => {
    const { data } = await apiClient.get<ApiResponse<CatalogTcg[]>>("/tcgs");
    return unwrap(data);
  },
  listSets: async (tcg?: string) => {
    const { data } = await apiClient.get<ApiResponse<CatalogSet[]>>("/sets", { params: tcg ? { tcg } : undefined });
    return unwrap(data);
  },
  listCards: async (params: CardListParams) => {
    const { data } = await apiClient.get<ApiResponse<PaginatedResponse<CatalogCard>>>("/cards", { params });
    return unwrap(data);
  },
};
