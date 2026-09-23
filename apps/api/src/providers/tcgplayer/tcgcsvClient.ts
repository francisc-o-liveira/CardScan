import { env } from "../../config/env";
import { createHttpClient } from "../http";
import type {
  TcgcsvGroup,
  TcgcsvPrice,
  TcgcsvProduct,
  TcgcsvResponse,
} from "./tcgcsv.types";

const client = createHttpClient({ baseURL: env.TCGPLAYER_PRICES_URL });

export const fetchGroups = async (categoryId: number): Promise<TcgcsvGroup[]> =>
  (await client.getJson<TcgcsvResponse<TcgcsvGroup>>(`/${categoryId}/groups`)).results;

export const fetchProducts = async (
  categoryId: number,
  groupId: number,
): Promise<TcgcsvProduct[]> =>
  (await client.getJson<TcgcsvResponse<TcgcsvProduct>>(`/${categoryId}/${groupId}/products`))
    .results;

export const fetchPrices = async (categoryId: number, groupId: number): Promise<TcgcsvPrice[]> =>
  (await client.getJson<TcgcsvResponse<TcgcsvPrice>>(`/${categoryId}/${groupId}/prices`)).results;
