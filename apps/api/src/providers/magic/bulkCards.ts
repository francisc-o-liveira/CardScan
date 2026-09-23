import zlib from "node:zlib";
import readline from "node:readline";
import axios from "axios";
import { fetchDefaultCardsDownloadUrl, SCRYFALL_USER_AGENT } from "./scryfallClient";
import type { ScryfallCard } from "./scryfall.types";

/**
 * Streams Scryfall's `default_cards` bulk file (gzipped JSONL) one card at a
 * time — it is far too large to parse whole. Used by the catalog sync and by
 * the price sync, which reads each printing's TCGplayer productId from it.
 */
export async function* streamDefaultCards(): AsyncGenerator<ScryfallCard> {
  const downloadUrl = await fetchDefaultCardsDownloadUrl();
  const response = await axios.get<NodeJS.ReadableStream>(downloadUrl, {
    responseType: "stream",
    headers: { "User-Agent": SCRYFALL_USER_AGENT },
    timeout: 0,
  });

  const rl = readline.createInterface({ input: response.data.pipe(zlib.createGunzip()) });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (trimmed) yield JSON.parse(trimmed) as ScryfallCard;
  }
}
