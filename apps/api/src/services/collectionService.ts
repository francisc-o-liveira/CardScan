import type {
  CardLanguage,
  CatalogCard,
  CollectionEntry,
  CollectionItem as CollectionItemDto,
  CollectionSummary,
  TcgSlug,
} from "@cardscan/types";
import type {
  AddCollectionItemInput,
  CollectionQueryInput,
  UpdateCollectionItemInput,
} from "@cardscan/validation";
import type { CollectionItem as CollectionItemRow, Language, Prisma } from "../../generated/prisma";
import { prisma } from "../config/prisma";
import { Errors } from "../utils/AppError";
import * as scanService from "./scanService";

const cardInclude = { set: true, tcg: true } as const;
type CardWithRelations = Prisma.CardGetPayload<{ include: typeof cardInclude }>;

// The API speaks the lowercase codes used everywhere else in the apps; the database enum is uppercase.
const toDbLanguage = (language: CardLanguage) => language.toUpperCase() as Language;
const toApiLanguage = (language: Language) => language.toLowerCase() as CardLanguage;

const toItemDto = (item: CollectionItemRow): CollectionItemDto => ({
  id: item.id,
  cardId: item.cardId,
  quantity: item.quantity,
  condition: item.condition,
  language: toApiLanguage(item.language),
  variant: item.variant || null,
  notes: item.notes,
  createdAt: item.createdAt.toISOString(),
  updatedAt: item.updatedAt.toISOString(),
});

const toEntry = (card: CardWithRelations, items: CollectionItemRow[]): CollectionEntry => ({
  card: card as unknown as CatalogCard,
  quantity: items.reduce((sum, item) => sum + item.quantity, 0),
  items: items.map(toItemDto),
});

/** Every account gets a collection at sign-up; this also covers accounts created before that. */
const collectionIdFor = async (userId: string): Promise<string> =>
  (await prisma.collection.upsert({ where: { userId }, create: { userId }, update: {}, select: { id: true } })).id;

/** The user's copies of one card, or null when they have none. */
export const getCardEntry = async (userId: string, cardId: string): Promise<CollectionEntry | null> => {
  const collectionId = await collectionIdFor(userId);
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: { ...cardInclude, collectionItems: { where: { collectionId }, orderBy: { createdAt: "asc" } } },
  });
  if (!card) throw Errors.notFound("Card not found");
  return card.collectionItems.length ? toEntry(card, card.collectionItems) : null;
};

/** Copies owned per card id, for the given cards only; cards the user does not own are left out. */
export const getOwnedQuantities = async (userId: string, cardIds: string[]): Promise<Record<string, number>> => {
  const collectionId = await collectionIdFor(userId);
  const rows = await prisma.collectionItem.groupBy({
    by: ["cardId"],
    where: { collectionId, cardId: { in: cardIds } },
    _sum: { quantity: true },
  });
  return Object.fromEntries(rows.map((row) => [row.cardId, row._sum.quantity ?? 0]));
};

export const listCollection = async (userId: string, params: CollectionQueryInput) => {
  const collectionId = await collectionIdFor(userId);
  const where: Prisma.CardWhereInput = {
    collectionItems: { some: { collectionId, ...(params.condition ? { condition: params.condition } : {}) } },
    ...(params.tcg ? { tcg: { slug: params.tcg } } : {}),
    ...(params.setId ? { setId: params.setId } : {}),
    ...(params.query ? { name: { contains: params.query, mode: "insensitive" } } : {}),
  };

  const [cards, total] = await Promise.all([
    prisma.card.findMany({
      where,
      include: { ...cardInclude, collectionItems: { where: { collectionId }, orderBy: { createdAt: "asc" } } },
      orderBy: [{ name: "asc" }, { collectorNumber: "asc" }],
      skip: (params.page - 1) * params.limit,
      take: params.limit,
    }),
    prisma.card.count({ where }),
  ]);
  return { data: cards.map((card) => toEntry(card, card.collectionItems)), total };
};

export const getSummary = async (userId: string): Promise<CollectionSummary> => {
  const collectionId = await collectionIdFor(userId);
  const [totals, perGame, scans] = await Promise.all([
    prisma.$queryRaw<Array<{ total: bigint; unique: bigint; sets: bigint }>>`
      SELECT COALESCE(SUM(ci.quantity), 0) AS total,
             COUNT(DISTINCT ci."cardId") AS unique,
             COUNT(DISTINCT c."setId") AS sets
      FROM collection_items ci
      JOIN cards c ON c.id = ci."cardId"
      WHERE ci."collectionId" = ${collectionId}`,
    prisma.$queryRaw<Array<{ slug: string; total: bigint }>>`
      SELECT t.slug, SUM(ci.quantity) AS total
      FROM collection_items ci
      JOIN cards c ON c.id = ci."cardId"
      JOIN tcgs t ON t.id = c."tcgId"
      WHERE ci."collectionId" = ${collectionId}
      GROUP BY t.slug`,
    prisma.scan.count({ where: { userId, status: "COMPLETED" } }),
  ]);

  const row = totals[0];
  return {
    totalCards: Number(row?.total ?? 0),
    uniqueCards: Number(row?.unique ?? 0),
    totalSets: Number(row?.sets ?? 0),
    perGame: Object.fromEntries(perGame.map((game) => [game.slug as TcgSlug, Number(game.total)])),
    scans,
  };
};

/**
 * Adds copies of a card. Copies that match an existing group (same card, condition and language) are
 * added to it rather than creating a second row.
 */
export const addItem = async (userId: string, input: AddCollectionItemInput): Promise<CollectionEntry> => {
  // Check the scan first, so a bad scan id never leaves a half-done request behind.
  if (input.scanId) await scanService.getScan(userId, input.scanId);
  if (!(await prisma.card.findUnique({ where: { id: input.cardId }, select: { id: true } }))) {
    throw Errors.notFound("Card not found");
  }

  const collectionId = await collectionIdFor(userId);
  const group = {
    collectionId,
    cardId: input.cardId,
    condition: input.condition,
    language: toDbLanguage(input.language),
    variant: "",
  };
  // The unique key on `group` makes a duplicate impossible, so two requests racing to create the same
  // group cannot both succeed: the loser hits the key and falls back to adding to the winner's row.
  const addToExisting = () =>
    prisma.collectionItem.updateMany({ where: group, data: { quantity: { increment: input.quantity } } });
  if ((await addToExisting()).count === 0) {
    try {
      await prisma.collectionItem.create({ data: { ...group, quantity: input.quantity } });
    } catch (error) {
      if ((error as { code?: string }).code !== "P2002") throw error;
      await addToExisting();
    }
  }

  if (input.scanId) await scanService.confirmScan(userId, input.scanId, input.cardId);
  return (await getCardEntry(userId, input.cardId))!;
};

const findOwnItem = async (userId: string, itemId: string): Promise<CollectionItemRow> => {
  const item = await prisma.collectionItem.findFirst({ where: { id: itemId, collection: { userId } } });
  if (!item) throw Errors.notFound("Collection item not found");
  return item;
};

/**
 * Changes a group of copies. A quantity of 0 removes it; moving it to a condition and language the card
 * already has merges the two groups.
 */
export const updateItem = async (
  userId: string,
  itemId: string,
  input: UpdateCollectionItemInput,
): Promise<CollectionEntry | null> => {
  const item = await findOwnItem(userId, itemId);
  const quantity = input.quantity ?? item.quantity;

  if (quantity === 0) {
    await prisma.collectionItem.delete({ where: { id: item.id } });
    return getCardEntry(userId, item.cardId);
  }

  const condition = input.condition ?? item.condition;
  const language = input.language ? toDbLanguage(input.language) : item.language;
  const twin = await prisma.collectionItem.findFirst({
    where: {
      collectionId: item.collectionId,
      cardId: item.cardId,
      condition,
      language,
      variant: item.variant,
      id: { not: item.id },
    },
    select: { id: true },
  });

  if (twin) {
    await prisma.$transaction([
      prisma.collectionItem.update({ where: { id: twin.id }, data: { quantity: { increment: quantity } } }),
      prisma.collectionItem.delete({ where: { id: item.id } }),
    ]);
  } else {
    await prisma.collectionItem.update({ where: { id: item.id }, data: { quantity, condition, language } });
  }
  return getCardEntry(userId, item.cardId);
};

export const removeItem = async (userId: string, itemId: string): Promise<CollectionEntry | null> => {
  const item = await findOwnItem(userId, itemId);
  await prisma.collectionItem.delete({ where: { id: item.id } });
  return getCardEntry(userId, item.cardId);
};
