import type {
  ApiResponse,
  CardCondition,
  CardLanguage,
  CollectionEntry,
  CollectionSummary,
  PaginatedResponse,
} from "@cardscan/types";
import { apiClient } from "@/lib/api-client";

const unwrap = <T>(body: ApiResponse<T>): T => {
  if (!body.success) throw new Error(body.error.message);
  return body.data;
};

export interface CollectionParams {
  query?: string;
  tcg?: string;
  condition?: CardCondition;
  page?: number;
  limit?: number;
}

export interface AddToCollectionInput {
  cardId: string;
  quantity?: number;
  condition?: CardCondition;
  language?: CardLanguage;
  /** Confirms this scan as the card in the same request. */
  scanId?: string;
}

export interface UpdateCollectionItemInput {
  quantity?: number;
  condition?: CardCondition;
  language?: CardLanguage;
}

export const collectionApi = {
  async list(params: CollectionParams): Promise<PaginatedResponse<CollectionEntry>> {
    const { data } = await apiClient.get<ApiResponse<PaginatedResponse<CollectionEntry>>>("/collection", {
      params: Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== "")),
    });
    return unwrap(data);
  },

  async summary(): Promise<CollectionSummary> {
    const { data } = await apiClient.get<ApiResponse<CollectionSummary>>("/collection/summary");
    return unwrap(data);
  },

  /** Copies owned per card id, for the given cards only. */
  async owned(cardIds: string[]): Promise<Record<string, number>> {
    const { data } = await apiClient.get<ApiResponse<Record<string, number>>>("/collection/owned", {
      params: { cardIds: cardIds.join(",") },
    });
    return unwrap(data);
  },

  /** The user's copies of one card, or null when they own none. */
  async cardEntry(cardId: string): Promise<CollectionEntry | null> {
    const { data } = await apiClient.get<ApiResponse<CollectionEntry | null>>(`/collection/cards/${cardId}`);
    return unwrap(data);
  },

  async add(input: AddToCollectionInput): Promise<CollectionEntry> {
    const { data } = await apiClient.post<ApiResponse<CollectionEntry>>("/collection/items", input);
    return unwrap(data);
  },

  async update(itemId: string, input: UpdateCollectionItemInput): Promise<CollectionEntry | null> {
    const { data } = await apiClient.patch<ApiResponse<CollectionEntry | null>>(`/collection/items/${itemId}`, input);
    return unwrap(data);
  },

  async remove(itemId: string): Promise<CollectionEntry | null> {
    const { data } = await apiClient.delete<ApiResponse<CollectionEntry | null>>(`/collection/items/${itemId}`);
    return unwrap(data);
  },
};
