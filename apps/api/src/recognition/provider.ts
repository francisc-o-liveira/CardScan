import sharp from "sharp";
import { env } from "../config/env";
import { prisma } from "../config/prisma";
import { embedImages, warmUpEmbedder } from "./embedder";
import { DEFAULT_WEIGHTS, getIndex, type IndexedCard, type SearchWeights } from "./indexStore";
import { detectPitchColor, pitchOf } from "./pitchColor";
import { printedEvidence, rankByPrint, readPrintedText, warmUpPrintedText } from "./printedText";
import { rectifyCard, rectifyForPrint, type RectifyResult } from "./rectify";

export interface RecognitionCandidate {
  card: IndexedCard;
  /** Visual similarity to the photo, 0..1. Comparable between candidates of one scan, not across scans. */
  score: number;
}

export interface RecognitionResult {
  /** Best match first. */
  candidates: RecognitionCandidate[];
  /** How sure the top candidate is the exact printing, 0..1. Low means "ask the user to pick". */
  confidence: number;
  /** Whether a card outline was found; when false the centre of the photo was used. */
  cardFound: boolean;
  timings: { rectifyMs: number; embedMs: number; searchMs: number; ocrMs?: number };
}

export interface RecognizeOptions {
  weights?: SearchWeights;
  candidates?: number;
  /** Read the printed number to separate reprints. Defaults to RECOGNITION_READ_PRINT. */
  readPrint?: boolean;
  /** Only look among the cards of this game, when the user knows which one it is. */
  tcg?: string;
}

/**
 * Turns a photo into ranked catalog candidates. Implementations can be swapped (a cloud vision model,
 * a different local model) without the API routes or the apps noticing.
 */
export interface CardRecognitionProvider {
  recognize(photo: Buffer, options?: RecognizeOptions): Promise<RecognitionResult>;
}

export class RecognitionUnavailableError extends Error {
  constructor() {
    super("The card recognition index has not been built yet");
    this.name = "RecognitionUnavailableError";
  }
}

const SEARCH_DEPTH = 25;

/** Candidates this close to the best visual score are told apart by the number printed on the card. */
const PRINT_TIE_TOLERANCE = 0.03;
/**
 * Flesh and Blood versions of one card differ only in pitch colour. Among candidates that look the same,
 * puts the ones whose colour matches the line on the photographed card first. Untouched when the colour
 * cannot be read or the candidates do not differ by pitch.
 */
const refineByPitch = async <T extends { card: IndexedCard; score: number }>(
  ranked: T[],
  cardImage: Buffer,
): Promise<T[]> => {
  if (ranked[0]?.card.tcg !== "fab") return ranked;
  const tied = ranked.filter((c) => c.score >= ranked[0]!.score - PRINT_TIE_TOLERANCE);
  if (new Set(tied.map((c) => pitchOf(c.card.name))).size < 2) return ranked;

  const color = await detectPitchColor(cardImage).catch(() => null);
  if (!color) return ranked;
  const matching = tied.filter((c) => pitchOf(c.card.name) === color);
  if (matching.length === 0) return ranked;
  return [...matching, ...tied.filter((c) => !matching.includes(c)), ...ranked.filter((c) => !tied.includes(c))];
};

/** Reading the print must never hold a scan up for long. */
const OCR_TIMEOUT_MS = 6_000;
/** Confidence given when the printed number confirms one printing and no other. */
const PRINT_CONFIDENCE = 0.9;

/**
 * Among candidates that look the same (reprints), promotes the one whose printed number and set code
 * match the text on the card. Returns the input untouched when there is nothing to separate or the text
 * cannot be read.
 */
const refineByPrint = async (
  ranked: { card: IndexedCard; score: number }[],
  photo: Buffer,
  outline: RectifyResult["outline"],
  flipped: boolean,
): Promise<{ ranked: { card: IndexedCard; score: number }[]; confident: boolean; ms: number }> => {
  const start = Date.now();
  const unchanged = { ranked, confident: false, ms: 0 };
  const tied = ranked.filter((c) => c.score >= ranked[0]!.score - PRINT_TIE_TOLERANCE);
  if (tied.length < 2) return unchanged;

  try {
    const text = await Promise.race([
      (async () => {
        const upright = await rectifyForPrint(photo, outline);
        return readPrintedText(flipped ? await sharp(upright).rotate(180).png().toBuffer() : upright, ranked[0]!.card.tcg);
      })(),
      new Promise<string>((_, reject) => setTimeout(() => reject(new Error("OCR timed out")), OCR_TIMEOUT_MS)),
    ]);
    const sets = await prisma.cardSet.findMany({
      where: { id: { in: [...new Set(tied.map((c) => c.card.setId))] } },
      select: { id: true, code: true, totalCards: true },
    });
    const bySet = new Map(sets.map((set) => [set.id, set]));
    const result = rankByPrint(
      ranked,
      ({ card }) =>
        printedEvidence(text, {
          number: card.number,
          setCode: bySet.get(card.setId)?.code,
          setTotal: bySet.get(card.setId)?.totalCards,
        }),
      PRINT_TIE_TOLERANCE,
    );
    return { ...result, ms: Date.now() - start };
  } catch {
    return { ...unchanged, ms: Date.now() - start };
  }
};

/**
 * Gap between the top two scores that maps to full confidence. Calibrated on 300 simulated photos against
 * the full catalog: every scan with a gap of 0.02 or more had the right card first (172 of 172), while
 * below 0.01 only 62% did, mostly reprints sharing artwork. With this scale a gap of 0.02 is a confidence
 * of 0.6, the SCAN_CONFIDENT threshold where the apps stop showing the candidate list.
 */
export const CONFIDENT_MARGIN = 0.033;

/**
 * How far the best match stands out from the runner-up. Calibrated against the synthetic benchmark
 * (scripts/evaluateRecognition.ts): a larger gap means the top candidate is right more often.
 */
export const confidenceFromScores = (best: number, runnerUp: number | undefined): number => {
  if (runnerUp === undefined) return 1;
  return Math.max(0, Math.min(1, (best - runnerUp) / CONFIDENT_MARGIN));
};

export const localRecognitionProvider: CardRecognitionProvider = {
  async recognize(photo, { weights = DEFAULT_WEIGHTS, candidates = 5, readPrint = env.RECOGNITION_READ_PRINT, tcg } = {}) {
    const index = await getIndex();
    if (index.size === 0) throw new RecognitionUnavailableError();

    let start = Date.now();
    const { image, found, outline } = await rectifyCard(photo);
    // Cards are often held or photographed upside down; embedding both ways costs one extra image.
    const flipped = await sharp(image).rotate(180).png().toBuffer();
    const rectifyMs = Date.now() - start;

    start = Date.now();
    const [upright, upsideDown] = await embedImages([image, flipped]);
    const embedMs = Date.now() - start;

    start = Date.now();
    const best = new Map<number, { score: number; flipped: boolean }>();
    for (const [query, isFlipped] of [[upright!, false], [upsideDown!, true]] as const) {
      for (const hit of index.search(query, SEARCH_DEPTH, weights, tcg)) {
        if (hit.score > (best.get(hit.index)?.score ?? -Infinity)) best.set(hit.index, { score: hit.score, flipped: isFlipped });
      }
    }
    const ranked = [...best.entries()].sort((a, b) => b[1].score - a[1].score).slice(0, candidates);
    const searchMs = Date.now() - start;

    let list = ranked.map(([i, { score }]) => ({ card: index.cards[i]!, score }));
    let confidence = confidenceFromScores(list[0]!.score, list[1]?.score);

    // Same card in another pitch colour looks identical to the model; the colour of the title line decides.
    const byPitch = await refineByPitch(list, ranked[0]![1].flipped ? flipped : image);
    if (byPitch !== list) {
      list = byPitch;
      const top = pitchOf(list[0]!.card.name);
      const rival = list.slice(1).find((c) => pitchOf(c.card.name) === top);
      confidence = confidenceFromScores(list[0]!.score, rival?.score);
    }

    // Reprints look alike: when the picture cannot pick one, the number printed on the card can.
    let ocrMs: number | undefined;
    if (readPrint && confidence < PRINT_CONFIDENCE) {
      const refined = await refineByPrint(list, photo, outline, ranked[0]![1].flipped);
      ocrMs = refined.ms;
      list = refined.ranked;
      if (refined.confident) confidence = Math.max(confidence, PRINT_CONFIDENCE);
    }

    return {
      candidates: list,
      confidence,
      cardFound: found,
      timings: { rectifyMs, embedMs, searchMs, ...(ocrMs !== undefined && { ocrMs }) },
    };
  },
};

/** Loads the model and the index in the background at startup, so the first scan is as fast as the rest. */
export const warmUpRecognition = async (): Promise<void> => {
  const [index] = await Promise.all([getIndex(), warmUpEmbedder(), env.RECOGNITION_READ_PRINT ? warmUpPrintedText().catch(() => undefined) : undefined]);
  console.log(
    index.size
      ? `[recognition] Ready: ${index.size} cards indexed.`
      : "[recognition] No index yet. Build it with: pnpm --filter @cardscan/api recognition:index all",
  );
};
