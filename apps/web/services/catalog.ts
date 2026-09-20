import type { ApiResponse, PaginatedResponse, TcgSlug } from "@cardscan/types";
import { apiClient } from "@/lib/api-client";

/**
 * Shapes returned by the read-only catalog endpoints. These mirror the Prisma
 * rows the API sends (which include joined `set`/`tcg`), rather than the
 * narrower domain types in @cardscan/types.
 */
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

  async getCard(id: string): Promise<CatalogCardDetail> {
    const { data } = await apiClient.get<ApiResponse<CatalogCardDetail>>(`/cards/${id}`);
    return unwrap(data);
  },
};
