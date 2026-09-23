import crypto from "node:crypto";
import sharp from "sharp";
import type { Scan as ScanDto, ScanStatus } from "@cardscan/types";
import type { Prisma, Scan as ScanRow } from "../../generated/prisma";
import { prisma } from "../config/prisma";
import { imageStorage } from "../storage/imageStorage";
import {
  localRecognitionProvider,
  RecognitionUnavailableError,
  type CardRecognitionProvider,
} from "../recognition/provider";
import { Errors } from "../utils/AppError";

/** What is kept in Scan.result: candidate ids and scores, resolved to full cards when read. */
interface StoredResult {
  candidates: Array<{ cardId: string; score: number }>;
  cardFound: boolean;
}

const HISTORY_LIMIT = 50;
/** Scan photos are kept at a size that is still sharp on a phone but cheap to store. */
const STORED_PHOTO_SIZE = 1600;

const cardInclude = { set: true, tcg: true } as const;
type CardWithRelations = Prisma.CardGetPayload<{ include: typeof cardInclude }>;

const readResult = (scan: ScanRow): StoredResult =>
  (scan.result as unknown as StoredResult | null) ?? { candidates: [], cardFound: false };

/** Turns stored scans into API responses, fetching every referenced card in one query. */
const hydrate = async (scans: ScanRow[]): Promise<ScanDto[]> => {
  const ids = new Set<string>();
  for (const scan of scans) {
    for (const candidate of readResult(scan).candidates) ids.add(candidate.cardId);
    if (scan.selectedCardId) ids.add(scan.selectedCardId);
  }
  const cards = new Map<string, CardWithRelations>(
    (await prisma.card.findMany({ where: { id: { in: [...ids] } }, include: cardInclude })).map((card) => [card.id, card]),
  );

  return scans.map((scan) => {
    const result = readResult(scan);
    return {
      id: scan.id,
      imageUrl: scan.imageUrl,
      status: scan.status.toLowerCase() as ScanStatus,
      confidence: scan.confidence,
      cardFound: result.cardFound,
      // A card can disappear in a later catalog sync; drop it rather than return a dangling id.
      candidates: result.candidates.flatMap(({ cardId, score }) => {
        const card = cards.get(cardId);
        return card ? [{ card: card as unknown as ScanDto["candidates"][number]["card"], score }] : [];
      }),
      selectedCard: (scan.selectedCardId && (cards.get(scan.selectedCardId) as unknown as ScanDto["selectedCard"])) || null,
      createdAt: scan.createdAt.toISOString(),
    };
  });
};

/**
 * Stores the photo, runs recognition and records the result. Runs inline: recognition takes well under
 * a second, so a queue would only add moving parts.
 */
export const createScan = async (
  userId: string,
  photo: Buffer,
  provider: CardRecognitionProvider = localRecognitionProvider,
): Promise<ScanDto> => {
  let normalised: Buffer;
  try {
    normalised = await sharp(photo)
      .rotate()
      .resize(STORED_PHOTO_SIZE, STORED_PHOTO_SIZE, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
  } catch {
    throw Errors.validation("That file is not an image CardScan can read");
  }

  const id = crypto.randomUUID();
  const key = `scans/${id}.jpg`;
  await imageStorage.put(key, normalised);
  const imageUrl = imageStorage.publicUrl(key);

  let recognition;
  try {
    recognition = await provider.recognize(normalised);
  } catch (error) {
    await prisma.scan.create({ data: { id, userId, imageUrl, status: "FAILED" } });
    if (error instanceof RecognitionUnavailableError) {
      throw Errors.serviceUnavailable("Card recognition is not set up on this server yet");
    }
    throw error;
  }

  const result: StoredResult = {
    candidates: recognition.candidates.map(({ card, score }) => ({ cardId: card.id, score: Number(score.toFixed(4)) })),
    cardFound: recognition.cardFound,
  };
  const scan = await prisma.scan.create({
    data: {
      id,
      userId,
      imageUrl,
      status: "COMPLETED",
      confidence: Number(recognition.confidence.toFixed(4)),
      result: result as unknown as Prisma.InputJsonValue,
    },
  });
  return (await hydrate([scan]))[0]!;
};

export const listScans = async (userId: string): Promise<ScanDto[]> =>
  hydrate(
    await prisma.scan.findMany({
      where: { userId, status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      take: HISTORY_LIMIT,
    }),
  );

const findOwnScan = async (userId: string, scanId: string): Promise<ScanRow> => {
  const scan = await prisma.scan.findFirst({ where: { id: scanId, userId } });
  if (!scan) throw Errors.notFound("Scan not found");
  return scan;
};

export const getScan = async (userId: string, scanId: string): Promise<ScanDto> =>
  (await hydrate([await findOwnScan(userId, scanId)]))[0]!;

/**
 * Records which card the photo really showed. Any catalog card is accepted, not just the candidates,
 * because the user may have found it by searching. Every confirmation is kept as feedback: it is the
 * dataset for measuring and improving recognition on real photos.
 */
export const confirmScan = async (userId: string, scanId: string, cardId: string): Promise<ScanDto> => {
  const scan = await findOwnScan(userId, scanId);
  if (!(await prisma.card.findUnique({ where: { id: cardId }, select: { id: true } }))) {
    throw Errors.notFound("Card not found");
  }

  const [updated] = await prisma.$transaction([
    prisma.scan.update({ where: { id: scan.id }, data: { selectedCardId: cardId } }),
    prisma.recognitionFeedback.create({
      data: {
        scanId: scan.id,
        predictedCardId: readResult(scan).candidates[0]?.cardId ?? null,
        actualCardId: cardId,
        confidence: scan.confidence,
      },
    }),
  ]);
  return (await hydrate([updated]))[0]!;
};
