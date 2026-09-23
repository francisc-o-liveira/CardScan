import type {
  ApiResponse,
  CardPrice,
  CardPriceHistory,
  CatalogCard,
  PriceHistoryRange,
  CatalogSet,
  CatalogTcg,
  PaginatedResponse,
  TcgSlug,
} from "@cardscan/types";
import { apiClient } from "@/lib/api-client";

/**
 * The catalog endpoints' response shapes live in @cardscan/types so web, mobile
 * and the API can't drift; they are re-exported here because components read
 * them from the service they came from.
 */
export type { CatalogCard, CatalogSet, CatalogTcg };

export interface CatalogCardVariant {
  id: string;
  cardId: string;
  language: string;
  name: string;
  imageUrl: string | null;
}

export interface CatalogCardDetail extends CatalogCard {
  set: CatalogSet;
  tcg: CatalogTcg;
  variants: CatalogCardVariant[];
  prices: CardPrice[];
}

export interface CatalogSetDetail extends CatalogSet {
  tcg: CatalogTcg;
  cards: CatalogCard[];
}

export interface ListCardsParams {
  query?: string;
  tcg?: TcgSlug;
  setId?: string;
  page?: number;
  limit?: number;
}

/** Unwraps the API envelope, turning a `success: false` body into a throw. */
const unwrap = <T>(body: ApiResponse<T>): T => {
  if (!body.success) throw new Error(body.error.message);
  return body.data;
};

export const catalogApi = {
  async listTcgs(): Promise<CatalogTcg[]> {
    const { data } = await apiClient.get<ApiResponse<CatalogTcg[]>>("/tcgs");
    return unwrap(data);
  },

  async listSets(tcg?: TcgSlug): Promise<CatalogSet[]> {
    const { data } = await apiClient.get<ApiResponse<CatalogSet[]>>("/sets", {
      params: tcg ? { tcg } : undefined,
    });
    return unwrap(data);
  },

  async getSet(id: string): Promise<CatalogSetDetail> {
    const { data } = await apiClient.get<ApiResponse<CatalogSetDetail>>(`/sets/${id}`);
    return unwrap(data);
  },

  async listCards(params: ListCardsParams): Promise<PaginatedResponse<CatalogCard>> {
    const { data } = await apiClient.get<ApiResponse<PaginatedResponse<CatalogCard>>>("/cards", {
      // Drop empty values so the API's optional-param validation stays happy.
      params: Object.fromEntries(
        Object.entries(params).filter(([, value]) => value !== undefined && value !== ""),
      ),
    });
    return unwrap(data);
  },

  async getPriceHistory(id: string, range: PriceHistoryRange): Promise<CardPriceHistory> {
    const { data } = await apiClient.get<ApiResponse<CardPriceHistory>>(
      `/cards/${id}/price-history`,
      { params: { range } },
    );
    return unwrap(data);
  },

  async getCard(id: string): Promise<CatalogCardDetail> {
    const { data } = await apiClient.get<ApiResponse<CatalogCardDetail>>(`/cards/${id}`);
    return unwrap(data);
  },
};
