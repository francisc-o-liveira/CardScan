import type {
  ApiResponse,
  BuyLink,
  CardPrice,
  CardPriceHistory,
  CatalogCard,
  CatalogSet,
  CatalogTcg,
  PaginatedResponse,
  PriceHistoryRange,
  TcgSlug,
} from "@cardscan/types";
import { apiClient } from "@/lib/api-client";

/** Shared with web and the API through @cardscan/types, so shapes can't drift. */
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
  buyLinks: BuyLink[];
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
  getSet: async (id: string): Promise<CatalogSetDetail> => {
    const { data } = await apiClient.get<ApiResponse<CatalogSetDetail>>(`/sets/${id}`);
    return unwrap(data);
  },
  getCard: async (id: string): Promise<CatalogCardDetail> => {
    const { data } = await apiClient.get<ApiResponse<CatalogCardDetail>>(`/cards/${id}`);
    return unwrap(data);
  },
  getPriceHistory: async (id: string, range: PriceHistoryRange): Promise<CardPriceHistory> => {
    const { data } = await apiClient.get<ApiResponse<CardPriceHistory>>(`/cards/${id}/price-history`, {
      params: { range },
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
