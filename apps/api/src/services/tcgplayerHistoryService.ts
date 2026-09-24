import type { PriceHistoryRange } from "@cardscan/types";
import { env } from "../config/env";
import { prisma } from "../config/prisma";
import { createHttpClient } from "../providers/http";
import { PRICE_SOURCE } from "./priceSyncService";

/**
 * TCGplayer's own price history: the same numbers its card pages chart. It is not part of the
 * documented API, so it is used sparingly and never in bulk: only when someone opens a card's
 * chart, once per card and range per day, and any failure just leaves our own history in place.
 */
const RANGE_PARAM: Record<PriceHistoryRange, string> = {
  "1m": "month",
  "3m": "quarter",
  "6m": "semi-annual",
  "1y": "annual",
};
const RANGE_DAYS: Record<PriceHistoryRange, number> = { "1m": 31, "3m": 92, "6m": 184, "1y": 366 };
const DAY_MS = 24 * 60 * 60 * 1000;

interface TcgplayerSku {
  variant?: string;
  language?: string;
  condition?: string;
  buckets?: { marketPrice?: string; bucketStartDate?: string }[];
}

export interface HistoryPoint {
  date: Date;
  market: number;
}

const client = createHttpClient({
  baseURL: env.TCGPLAYER_HISTORY_URL,
  timeoutMs: 8_000,
  retries: 1,
});
/** The endpoint serves the site's own pages, and turns away requests that do not look like a browser's. */
const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
  Origin: "https://www.tcgplayer.com",
  Referer: "https://www.tcgplayer.com/",
};

const normaliseFinish = (value: string | undefined) => (value && value.trim() ? value.trim().toLowerCase() : "normal");

/**
 * Picks the Near Mint English listing of `subType` (falling back to any of that finish) and turns its
 * buckets into one market-price point per day.
 */
export const parseHistory = (body: { result?: TcgplayerSku[] }, subType: string): HistoryPoint[] => {
  const skus = (body.result ?? []).filter((sku) => normaliseFinish(sku.variant) === normaliseFinish(subType));
  const sku =
    skus.find((s) => s.condition === "Near Mint" && (s.language ?? "English") === "English") ??
    skus.find((s) => s.condition === "Near Mint") ??
    skus[0];
  if (!sku) return [];

  return (sku.buckets ?? [])
    .map((bucket) => ({ date: new Date(`${bucket.bucketStartDate}T00:00:00Z`), market: Number(bucket.marketPrice) }))
    .filter((point) => !Number.isNaN(point.date.getTime()) && Number.isFinite(point.market) && point.market > 0)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
};

/** At most this many requests to TCGplayer per minute, whatever the traffic: past it, the chart uses what is stored. */
const MAX_REQUESTS_PER_MINUTE = 30;
const recentRequests: number[] = [];
const takeRequestSlot = (): boolean => {
  const now = Date.now();
  while (recentRequests.length && now - recentRequests[0]! > 60_000) recentRequests.shift();
  if (recentRequests.length >= MAX_REQUESTS_PER_MINUTE) return false;
  recentRequests.push(now);
  return true;
};

/** A stored history that already reaches back this close to the start of the range needs no fetch. */
const COVERED_SLACK_DAYS = 7;

/** productId + range -> when it was last tried. Keeps a card with little history from being refetched on every view. */
const attempted = new Map<string, number>();

/**
 * Fills the card's stored history with TCGplayer's for the range, replacing our own points before today.
 * Never throws: the chart still works from what is stored.
 */
export const backfillFromTcgplayer = async (cardId: string, range: PriceHistoryRange): Promise<void> => {
  if (!env.TCGPLAYER_HISTORY) return;
  try {
    const prices = await prisma.price.findMany({
      where: { cardId, source: PRICE_SOURCE, externalId: { not: null } },
      select: { subType: true, externalId: true },
    });
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const byProduct = new Map<string, string[]>();
    for (const { subType, externalId } of prices) {
      byProduct.set(externalId!, [...(byProduct.get(externalId!) ?? []), subType]);
    }

    for (const [productId, subTypes] of byProduct) {
      const key = `${productId}:${range}`;
      if (Date.now() - (attempted.get(key) ?? 0) < DAY_MS) continue;

      // Once a card's history reaches back over the range, the daily sync only appends: nothing to fetch.
      const since = new Date(today.getTime() - RANGE_DAYS[range] * DAY_MS);
      const earliest = await prisma.priceHistory.findFirst({
        where: { cardId, source: PRICE_SOURCE, subType: { in: subTypes } },
        orderBy: { recordedAt: "asc" },
        select: { recordedAt: true },
      });
      if (earliest && earliest.recordedAt.getTime() <= since.getTime() + COVERED_SLACK_DAYS * DAY_MS) continue;

      if (!takeRequestSlot()) continue;
      attempted.set(key, Date.now());

      const body = await client.getJson<{ result?: TcgplayerSku[] }>(`/price/history/${productId}/detailed`, {
        params: { range: RANGE_PARAM[range] },
        headers: BROWSER_HEADERS,
      });

      for (const subType of subTypes) {
        const points = parseHistory(body, subType).filter((point) => point.date < today && point.date >= since);
        if (points.length === 0) continue;
        await prisma.$transaction([
          prisma.priceHistory.deleteMany({
            where: { cardId, source: PRICE_SOURCE, subType, recordedAt: { gte: since, lt: today } },
          }),
          prisma.priceHistory.createMany({
            data: points.map((point) => ({
              cardId,
              source: PRICE_SOURCE,
              subType,
              price: point.market,
              currency: "USD",
              recordedAt: point.date,
            })),
          }),
        ]);
      }
    }
  } catch (error) {
    console.warn("[price-history] TCGplayer history unavailable:", error instanceof Error ? error.message : error);
  }
};
