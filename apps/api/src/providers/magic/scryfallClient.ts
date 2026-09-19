import axios from "axios";
import { env } from "../../config/env";
import type { ScryfallSet, ScryfallSetList, ScryfallBulkDataList } from "./scryfall.types";

/** Scryfall asks API consumers to identify themselves with a descriptive User-Agent. */
const USER_AGENT = "CardScan/0.1 (+https://github.com/cardscan; contact: dev@cardscan.app)";

const scryfallClient = axios.create({
  baseURL: env.MAGIC_API_URL,
  timeout: 30_000,
  headers: {
    "User-Agent": USER_AGENT,
    Accept: "application/json",
  },
});

export const fetchSets = async (): Promise<ScryfallSet[]> => {
  const { data } = await scryfallClient.get<ScryfallSetList>("/sets");
  return data.data;
};

/**
 * Scryfall's own guidance is to use the bulk-data files for full catalog syncs rather than
 * paginating `/cards/search` — one `default_cards` download covers every English print in a
 * single request instead of ~118k individual card lookups.
 */
export const fetchDefaultCardsDownloadUrl = async (): Promise<string> => {
  const { data } = await scryfallClient.get<ScryfallBulkDataList>("/bulk-data");
  const entry = data.data.find((item) => item.type === "default_cards");
  const url = entry?.jsonl_download_uri ?? entry?.download_uri;
  if (!url) {
    throw new Error("Scryfall bulk-data response did not include a default_cards download URL");
  }
  return url;
};

export { USER_AGENT as SCRYFALL_USER_AGENT };
