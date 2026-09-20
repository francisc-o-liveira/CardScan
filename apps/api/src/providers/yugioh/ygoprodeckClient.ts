import axios from "axios";
import { env } from "../../config/env";
import type { YgoCard, YgoCardInfoResponse, YgoSet } from "./ygoprodeck.types";

const USER_AGENT = "CardScan/0.1 (+https://github.com/cardscan)";

const ygoClient = axios.create({
  baseURL: env.YUGIOH_API_URL,
  timeout: 120_000,
  headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
});

/** One request returns every card (~14.5k) — the API is rate-limited to 20 req/s, so never fetch per card. */
export const fetchAllCards = async (): Promise<YgoCard[]> => {
  const { data } = await ygoClient.get<YgoCardInfoResponse>("/cardinfo.php");
  return data.data;
};

export const fetchAllSets = async (): Promise<YgoSet[]> => {
  const { data } = await ygoClient.get<YgoSet[]>("/cardsets.php");
  return data;
};

/**
 * YGOPRODeck blacklists IPs that hotlink images, so images are downloaded once and re-hosted.
 * Card images are served from a separate CDN host (not the rate-limited API).
 */
export const downloadImage = async (url: string): Promise<Buffer> => {
  const { data } = await axios.get<ArrayBuffer>(url, {
    responseType: "arraybuffer",
    timeout: 30_000,
    headers: { "User-Agent": USER_AGENT },
  });
  return Buffer.from(data);
};
