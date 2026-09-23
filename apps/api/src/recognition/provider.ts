import sharp from "sharp";
import { embedImages, warmUpEmbedder } from "./embedder";
import { DEFAULT_WEIGHTS, getIndex, type IndexedCard, type SearchWeights } from "./indexStore";
import { rectifyCard } from "./rectify";

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
  timings: { rectifyMs: number; embedMs: number; searchMs: number };
}

export interface RecognizeOptions {
  weights?: SearchWeights;
  candidates?: number;
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
  async recognize(photo, { weights = DEFAULT_WEIGHTS, candidates = 5 } = {}) {
    const index = await getIndex();
    if (index.size === 0) throw new RecognitionUnavailableError();

    let start = Date.now();
    const { image, found } = await rectifyCard(photo);
    // Cards are often held or photographed upside down; embedding both ways costs one extra image.
    const flipped = await sharp(image).rotate(180).png().toBuffer();
    const rectifyMs = Date.now() - start;

    start = Date.now();
    const [upright, upsideDown] = await embedImages([image, flipped]);
    const embedMs = Date.now() - start;

    start = Date.now();
    const best = new Map<number, number>();
    for (const query of [upright!, upsideDown!]) {
      for (const hit of index.search(query, SEARCH_DEPTH, weights)) {
        best.set(hit.index, Math.max(best.get(hit.index) ?? -Infinity, hit.score));
      }
    }
    const ranked = [...best.entries()].sort((a, b) => b[1] - a[1]).slice(0, candidates);
    const searchMs = Date.now() - start;

    return {
      candidates: ranked.map(([i, score]) => ({ card: index.cards[i]!, score })),
      confidence: confidenceFromScores(ranked[0]![1], ranked[1]?.[1]),
      cardFound: found,
      timings: { rectifyMs, embedMs, searchMs },
    };
  },
};

/** Loads the model and the index in the background at startup, so the first scan is as fast as the rest. */
export const warmUpRecognition = async (): Promise<void> => {
  const [index] = await Promise.all([getIndex(), warmUpEmbedder()]);
  console.log(
    index.size
      ? `[recognition] Ready: ${index.size} cards indexed.`
      : "[recognition] No index yet. Build it with: pnpm --filter @cardscan/api recognition:index all",
  );
};
