import type { CardQueryInput } from "@cardscan/validation";
import { prisma } from "../config/prisma";
import { Errors } from "../utils/AppError";

export const listTcgs = () => prisma.tcg.findMany({ orderBy: { name: "asc" } });

export const listSets = (tcgSlug?: string) =>
  prisma.cardSet.findMany({
    where: tcgSlug ? { tcg: { slug: tcgSlug } } : undefined,
    include: { tcg: true },
    orderBy: [{ releaseDate: "desc" }, { name: "asc" }],
  });

export const getSetWithCards = async (setId: string) => {
  const set = await prisma.cardSet.findUnique({
    where: { id: setId },
    include: {
      tcg: true,
      cards: { orderBy: { collectorNumber: "asc" } },
    },
  });
  if (!set) {
    throw Errors.notFound("Set not found");
  }
  return set;
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
      include: { set: true, tcg: true },
      orderBy: { name: "asc" },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
    }),
    prisma.card.count({ where }),
  ]);

  return { data, total };
};

export const getCardById = async (id: string) => {
  const card = await prisma.card.findUnique({
    where: { id },
    include: { set: true, tcg: true, variants: true },
  });
  if (!card) {
    throw Errors.notFound("Card not found");
  }
  return card;
};
