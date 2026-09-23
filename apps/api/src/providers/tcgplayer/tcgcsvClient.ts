import fs from "node:fs/promises";
import path from "node:path";
import { env } from "../../config/env";
import { createHttpClient } from "../http";
import type {
  TcgcsvGroup,
  TcgcsvPrice,
  TcgcsvProduct,
  TcgcsvResponse,
} from "./tcgcsv.types";

const client = createHttpClient({ baseURL: env.TCGPLAYER_PRICES_URL });

/**
 * tcgcsv refreshes once a day and asks that each file be fetched at most once
 * per 24 hours, so responses are kept on disk and reused while younger than
 * this. Re-running a sync (say, after tuning the matcher) then costs nothing.
 */
const CACHE_MAX_AGE_MS = 20 * 60 * 60 * 1000;

const getCached = async <T>(urlPath: string): Promise<T> => {
  const file = path.join(env.TCGPLAYER_CACHE_DIR, `${urlPath.replace(/^\//, "").replace(/\//g, "_")}.json`);
  try {
    const stat = await fs.stat(file);
    if (Date.now() - stat.mtimeMs < CACHE_MAX_AGE_MS) {
      return JSON.parse(await fs.readFile(file, "utf8")) as T;
    }
  } catch {
    // Not cached yet.
  }
  const data = await client.getJson<T>(urlPath);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data));
  return data;
};

export const fetchGroups = async (categoryId: number): Promise<TcgcsvGroup[]> =>
  (await getCached<TcgcsvResponse<TcgcsvGroup>>(`/${categoryId}/groups`)).results;

export const fetchProducts = async (
  categoryId: number,
  groupId: number,
): Promise<TcgcsvProduct[]> =>
  (await getCached<TcgcsvResponse<TcgcsvProduct>>(`/${categoryId}/${groupId}/products`)).results;

export const fetchPrices = async (categoryId: number, groupId: number): Promise<TcgcsvPrice[]> =>
  (await getCached<TcgcsvResponse<TcgcsvPrice>>(`/${categoryId}/${groupId}/prices`)).results;
