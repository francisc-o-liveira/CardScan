import type { Prisma } from "../../generated/prisma";
import type {
  CardMarketPrice,
  CardPrice,
  CardPriceHistory,
  PriceHistoryRange,
} from "@cardscan/types";
import type { CardQueryInput } from "@cardscan/validation";
import { prisma } from "../config/prisma";
import { Errors } from "../utils/AppError";
import { PRICE_SOURCE } from "./priceSyncService";
import { backfillFromTcgplayer } from "./tcgplayerHistoryService";

export const listTcgs = () => prisma.tcg.findMany({ orderBy: { name: "asc" } });

export const listSets = (tcgSlug?: string) =>
  prisma.cardSet.findMany({
    where: tcgSlug ? { tcg: { slug: tcgSlug } } : undefined,
    include: { tcg: true },
    orderBy: [{ releaseDate: "desc" }, { name: "asc" }],
  });

/** Grids only need each finish's market price to pick the headline figure. */
const priceSummary = {
  where: { source: PRICE_SOURCE },
  select: { subType: true, market: true, currency: true },
} satisfies Prisma.Card$pricesArgs;

type PriceRow = { subType: string; market: Prisma.Decimal | null; currency: string };

const toNumber = (value: Prisma.Decimal | null) => (value === null ? null : value.toNumber());

/**
 * Reverse holos and Magic foils are the alternate finish of a card, not the
 * card itself; ranking them last makes the headline the price most people mean.
 */
const finishRank = (subType: string) => {
  const s = subType.toLowerCase();
  if (s.includes("reverse")) return 2;
  if (s.includes("foil") && !s.includes("holofoil")) return 1;
  return 0;
};

/** The main finish's market price; ties (1st Edition vs Unlimited) take the cheaper. */
export const pickMarketPrice = (prices: PriceRow[]): CardMarketPrice | null => {
  const [best] = prices
    .filter((price) => price.market !== null)
    .map((price) => ({ ...price, amount: price.market!.toNumber() }))
    .sort((a, b) => finishRank(a.subType) - finishRank(b.subType) || a.amount - b.amount);
  return best ? { amount: best.amount, currency: best.currency, subType: best.subType } : null;
};

const withMarketPrice = <T extends { prices: PriceRow[] }>({ prices, ...card }: T) => ({
  ...card,
  marketPrice: pickMarketPrice(prices),
});

export const getSetWithCards = async (setId: string) => {
  const set = await prisma.cardSet.findUnique({
    where: { id: setId },
    include: {
      tcg: true,
      cards: { orderBy: { collectorNumber: "asc" }, include: { prices: priceSummary } },
    },
  });
  if (!set) {
    throw Errors.notFound("Set not found");
  }
  return { ...set, cards: set.cards.map(withMarketPrice) };
};

export const listCards = async (params: CardQueryInput) => {
  const where = {
    ...(params.tcg ? { tcg: { slug: params.tcg } } : {}),
    ...(params.setId ? { setId: params.setId } : {}),
    ...(params.query
      ? { name: { contains: params.query, mode: "insensitive" as const } }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.card.findMany({
      where,
      include: { set: true, tcg: true, prices: priceSummary },
      orderBy: { name: "asc" },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
    }),
    prisma.card.count({ where }),
  ]);

  return { data: data.map(withMarketPrice), total };
};

export const getCardById = async (id: string) => {
  const card = await prisma.card.findUnique({
    where: { id },
    include: {
      set: true,
      tcg: true,
      variants: true,
      prices: { where: { source: PRICE_SOURCE }, orderBy: { subType: "asc" } },
    },
  });
  if (!card) {
    throw Errors.notFound("Card not found");
  }

  const prices: CardPrice[] = card.prices
    .map((price) => ({
      source: price.source,
      subType: price.subType,
      market: toNumber(price.market),
      low: toNumber(price.low),
      mid: toNumber(price.average),
      high: toNumber(price.high),
      currency: price.currency,
      externalId: price.externalId,
      updatedAt: price.updatedAt.toISOString(),
    }))
    .sort((a, b) => finishRank(a.subType) - finishRank(b.subType));

  return { ...card, marketPrice: pickMarketPrice(card.prices), prices };
};

const RANGE_MONTHS: Record<PriceHistoryRange, number> = { "1m": 1, "3m": 3, "6m": 6, "1y": 12 };

export const getCardPriceHistory = async (
  id: string,
  range: PriceHistoryRange,
): Promise<CardPriceHistory> => {
  const card = await prisma.card.findUnique({ where: { id }, select: { id: true } });
  if (!card) {
    throw Errors.notFound("Card not found");
  }

  await backfillFromTcgplayer(id, range);

  const since = new Date();
  since.setUTCMonth(since.getUTCMonth() - RANGE_MONTHS[range]);
  since.setUTCHours(0, 0, 0, 0);

  const [rows, first] = await Promise.all([
    prisma.priceHistory.findMany({
      where: { cardId: id, source: PRICE_SOURCE, recordedAt: { gte: since } },
      orderBy: { recordedAt: "asc" },
    }),
    prisma.priceHistory.findFirst({
      where: { cardId: id, source: PRICE_SOURCE },
      orderBy: { recordedAt: "asc" },
      select: { recordedAt: true },
    }),
  ]);

  const bySubType = new Map<string, typeof rows>();
  for (const row of rows) {
    const bucket = bySubType.get(row.subType);
    if (bucket) bucket.push(row);
    else bySubType.set(row.subType, [row]);
  }

  const series = [...bySubType.entries()]
    .map(([subType, subRows]) => {
      const points = subRows.map((row) => ({
        date: row.recordedAt.toISOString(),
        market: row.price.toNumber(),
      }));
      const values = points.map((point) => point.market);
      const firstValue = values[0]!;
      const lastValue = values[values.length - 1]!;
      return {
        subType,
        currency: subRows[0]!.currency,
        points,
        change:
          points.length >= 2 && firstValue > 0
            ? {
                amount: Number((lastValue - firstValue).toFixed(2)),
                percent: Number((((lastValue - firstValue) / firstValue) * 100).toFixed(2)),
              }
            : null,
        low: Math.min(...values),
        high: Math.max(...values),
      };
    })
    // Same order as the card's price table: the main finish first.
    .sort((a, b) => finishRank(a.subType) - finishRank(b.subType) || a.subType.localeCompare(b.subType));

  return {
    range,
    source: PRICE_SOURCE,
    trackedSince: first?.recordedAt.toISOString() ?? null,
    series,
  };
};
