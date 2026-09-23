import { Prisma } from "../../generated/prisma";
import { prisma } from "../config/prisma";
import { mapWithConcurrency } from "../utils/concurrency";
import { fetchGroups, fetchPrices, fetchProducts } from "../providers/tcgplayer/tcgcsvClient";
import {
  baseProductName,
  createCardMatcher,
  normalizeName,
  matchGroupToSet,
  type GroupMatchOptions,
  type MatchableCard,
  type MatchableSet,
} from "../providers/tcgplayer/match";
import type {
  TcgcsvGroup,
  TcgcsvPrice,
  TcgcsvProduct,
} from "../providers/tcgplayer/tcgcsv.types";
import { streamDefaultCards } from "../providers/magic/bulkCards";

export const PRICE_SOURCE = "tcgplayer";
const CURRENCY = "USD";
const GROUP_FETCH_CONCURRENCY = 6;
const WRITE_CHUNK = 5_000;

interface GameConfig extends GroupMatchOptions {
  categoryId: number;
  /**
   * TCGplayer productId → "setCode|collectorNumber", for catalog sources that
   * publish it. Those cards match exactly; set/name matching only fills gaps.
   */
  productIds?: () => Promise<Map<number, string>>;
}

/** Scryfall records every paper printing's TCGplayer productId in its bulk file. */
const scryfallProductIds = async () => {
  const ids = new Map<number, string>();
  for await (const card of streamDefaultCards()) {
    if (card.tcgplayer_id && !card.digital) {
      ids.set(card.tcgplayer_id, `${card.set}|${card.collector_number}`);
    }
  }
  return ids;
};

/**
 * Pokémon sets TCGplayer names differently enough that no rule reaches them.
 * Trainer kits are left out on purpose: TCGplayer sells both decks as one group
 * whose card numbers repeat, while TCGdex has a set per deck.
 */
const POKEMON_ALIASES: Record<string, string> = {
  "SV: Scarlet & Violet 151": "sv03.5",
  "SM Base Set": "sm1",
  "ME: 30th Celebration Classic Collection": "30th-c",
  "MEE: Mega Evolution Energies": "mee",
  "SVE: Scarlet & Violet Energies": "sve",
  "ME: Mega Evolution Promo": "mep",
  "SV: Scarlet & Violet Promo Cards": "svp",
  "SWSH: Sword & Shield Promo Cards": "swshp",
  "SM Promos": "smp",
  "XY Promos": "xyp",
  "Black and White Promos": "bwp",
  "HGSS Promos": "hgssp",
  "Diamond and Pearl Promos": "dpp",
  "Nintendo Promos": "np",
  "WoTC Promo": "basep",
  "Best of Promos": "bog",
  "Rumble": "ru1",
  "Expedition": "ecard1",
  "McDonald's Promos 2011": "2011bw",
  "McDonald's Promos 2012": "2012bw",
  "McDonald's Promos 2014": "2014xy",
  "McDonald's Promos 2015": "2015xy",
  "McDonald's Promos 2016": "2016xy",
  "McDonald's Promos 2017": "2017sm",
  "McDonald's Promos 2018": "2018sm",
  "McDonald's Promos 2019": "2019sm",
  "McDonald's 25th Anniversary Promos": "2021swsh",
  "McDonald's Promos 2022": "2022swsh",
  "McDonald's Promos 2023": "2023sv",
  "McDonald's Promos 2024": "2024sv",
};

/** TCGplayer category per game (https://tcgcsv.com/tcgplayer/categories). */
export const PRICE_GAMES: Record<string, GameConfig> = {
  pokemon: { categoryId: 3, matchByCode: false, aliases: POKEMON_ALIASES },
  magic: { categoryId: 1, matchByCode: true, productIds: scryfallProductIds },
  yugioh: { categoryId: 2, matchByCode: false },
  lorcana: { categoryId: 71, matchByCode: false },
  onepiece: { categoryId: 68, matchByCode: true },
  digimon: { categoryId: 63, matchByCode: true },
  starwars: { categoryId: 79, matchByCode: true },
  fab: { categoryId: 62, matchByCode: true },
};

export interface PriceSyncResult {
  groups: number;
  groupsMatched: number;
  groupsFailed: number;
  products: number;
  productsMatched: number;
  cardsPriced: number;
  cardsInCatalog: number;
  pricesWritten: number;
  unmatchedGroups: string[];
  /** Matches whose names differ beyond formatting ("Pikachu" ← "Pikachu ex - 25/102") — worth eyeballing. */
  looseMatches: string[];
}

const toDecimal = (value: number | null | undefined) =>
  value === null || value === undefined ? null : new Prisma.Decimal(value.toFixed(2));

export const syncPrices = async (
  slug: string,
  log: (message: string) => void = console.log,
): Promise<PriceSyncResult> => {
  const game = PRICE_GAMES[slug];
  if (!game) throw new Error(`No TCGplayer category configured for "${slug}"`);

  const tcg = await prisma.tcg.findUnique({ where: { slug } });
  if (!tcg) throw new Error(`"${slug}" has no catalog yet — run its catalog sync first`);

  const sets: MatchableSet[] = await prisma.cardSet.findMany({
    where: { tcgId: tcg.id },
    select: { id: true, code: true, name: true },
  });
  const cards = await prisma.card.findMany({
    where: { tcgId: tcg.id },
    select: { id: true, name: true, collectorNumber: true, setId: true },
  });
  const cardsBySet = new Map<string, MatchableCard[]>();
  for (const card of cards) {
    const bucket = cardsBySet.get(card.setId);
    if (bucket) bucket.push(card);
    else cardsBySet.set(card.setId, [card]);
  }

  // Exact TCGplayer productIds, where the catalog source publishes them.
  const cardByKnownProduct = new Map<number, MatchableCard>();
  if (game.productIds) {
    const setCodeById = new Map(sets.map((set) => [set.id, set.code]));
    const cardByKey = new Map(
      cards.map((card) => [`${setCodeById.get(card.setId)}|${card.collectorNumber}`, card]),
    );
    for (const [productId, key] of await game.productIds()) {
      const card = cardByKey.get(key);
      if (card) cardByKnownProduct.set(productId, card);
    }
    log(`[price-sync:${slug}] ${cardByKnownProduct.size} cards with a known TCGplayer productId`);
  }

  const groups = await fetchGroups(game.categoryId);
  log(`[price-sync:${slug}] ${groups.length} TCGplayer groups, ${sets.length} sets in catalog`);

  const targets: { group: TcgcsvGroup; set: MatchableSet | null }[] = [];
  const unmatchedGroups: string[] = [];
  for (const group of groups) {
    const set = matchGroupToSet(group, sets, game);
    if (!set) unmatchedGroups.push(group.name);
    // Without known productIds an unmatched group has nothing to offer.
    if (set || game.productIds) targets.push({ group, set });
  }

  const fetched: { set: MatchableSet | null; products: TcgcsvProduct[]; prices: TcgcsvPrice[] }[] =
    [];
  let groupsFailed = 0;
  await mapWithConcurrency(targets, GROUP_FETCH_CONCURRENCY, async ({ group, set }) => {
    try {
      const [products, prices] = await Promise.all([
        fetchProducts(game.categoryId, group.groupId),
        fetchPrices(game.categoryId, group.groupId),
      ]);
      // Keep only what matching reads — extendedData carries full rules text.
      const slim = products.map((product) => ({
        ...product,
        extendedData: product.extendedData.filter((field) => field.name === "Number"),
      }));
      fetched.push({ set, products: slim, prices });
    } catch (error) {
      groupsFailed++;
      log(
        `[price-sync:${slug}] Failed group "${group.name}": ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  });

  // Two products landing on one card (a card and its stamped promo, say): the
  // first keeps it, so a card never shows a blend of two listings' prices.
  // Exact productIds are assigned before any name/number match can claim a card.
  const cardByProduct = new Map<number, string>();
  const productByCard = new Map<string, number>();
  const looseMatches: string[] = [];
  const claim = (productId: number, cardId: string) => {
    if (productByCard.has(cardId) || cardByProduct.has(productId)) return false;
    productByCard.set(cardId, productId);
    cardByProduct.set(productId, cardId);
    return true;
  };

  let products = 0;
  for (const group of fetched) {
    products += group.products.length;
    for (const product of group.products) {
      const card = cardByKnownProduct.get(product.productId);
      if (card) claim(product.productId, card.id);
    }
  }
  for (const group of fetched) {
    if (!group.set) continue;
    const matchCard = createCardMatcher(cardsBySet.get(group.set.id) ?? []);
    for (const product of group.products) {
      if (cardByProduct.has(product.productId)) continue;
      const card = matchCard(product);
      if (!card) continue;
      const loose =
        normalizeName(baseProductName(card.name)) !== normalizeName(baseProductName(product.name));
      // With exact ids available, a card left over by them is usually one
      // TCGplayer doesn't sell on its own, and a loosely-named product is a
      // different item ("… (Display Commander) - Thick Stock") — don't borrow its price.
      if (loose && game.productIds) continue;
      if (!claim(product.productId, card.id)) continue;
      if (loose) looseMatches.push(`${card.name} #${card.collectorNumber} ← ${product.name}`);
    }
  }

  const rows: Prisma.PriceCreateManyInput[] = [];
  for (const group of fetched) {
    for (const price of group.prices) {
      const cardId = cardByProduct.get(price.productId);
      if (!cardId) continue;
      rows.push({
        cardId,
        source: PRICE_SOURCE,
        subType: price.subTypeName ?? "",
        low: toDecimal(price.lowPrice),
        average: toDecimal(price.midPrice),
        high: toDecimal(price.highPrice),
        market: toDecimal(price.marketPrice),
        currency: CURRENCY,
        externalId: String(price.productId),
      });
    }
  }
  const productsMatched = cardByProduct.size;

  const data = rows;
  const tcgCards = { card: { tcgId: tcg.id } };
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  // A day's history is one point per card and finish: re-running replaces
  // today's point instead of stacking duplicates.
  const history: Prisma.PriceHistoryCreateManyInput[] = data
    .filter((row) => row.market !== null)
    .map((row) => ({
      cardId: row.cardId,
      source: PRICE_SOURCE,
      subType: row.subType,
      price: row.market!,
      currency: CURRENCY,
    }));

  await prisma.$transaction(
    async (tx) => {
      await tx.price.deleteMany({ where: { source: PRICE_SOURCE, ...tcgCards } });
      for (let i = 0; i < data.length; i += WRITE_CHUNK) {
        await tx.price.createMany({ data: data.slice(i, i + WRITE_CHUNK) });
      }
      await tx.priceHistory.deleteMany({
        where: { source: PRICE_SOURCE, recordedAt: { gte: startOfDay }, ...tcgCards },
      });
      for (let i = 0; i < history.length; i += WRITE_CHUNK) {
        await tx.priceHistory.createMany({ data: history.slice(i, i + WRITE_CHUNK) });
      }
    },
    { timeout: 10 * 60_000, maxWait: 60_000 },
  );

  return {
    groups: groups.length,
    groupsMatched: groups.length - unmatchedGroups.length,
    groupsFailed,
    products,
    productsMatched,
    cardsPriced: new Set(data.map((row) => row.cardId)).size,
    cardsInCatalog: cards.length,
    pricesWritten: data.length,
    unmatchedGroups,
    looseMatches,
  };
};
