import path from "node:path";
import sharp from "sharp";
import { createWorker, type Worker } from "tesseract.js";
import { env } from "../config/env";

/**
 * Reads the small print of a straightened card (collector number, set code) so reprints that share
 * artwork can be told apart. The look of the card cannot separate them; the number printed on it can.
 *
 * Runs only for ambiguous scans, and any failure (no network for the language data, no text found)
 * just means "no extra evidence": recognition carries on with the visual ranking alone.
 */

/** Where the collector number and set code sit on the card, as [top, bottom] fractions of its height. */
const STRIPS: Record<string, [number, number][]> = {
  // Under the artwork on the right, and the bottom edge for older frames.
  yugioh: [
    [0.58, 0.76],
    [0.86, 1],
  ],
};
const DEFAULT_STRIPS: [number, number][] = [[0.86, 1]];

/** The strips are cut from a card twice the size of the embedding input, so no further enlargement. */
const TARGET_WIDTH = 1952;

let workerPromise: Promise<Worker> | null = null;

const getWorker = (): Promise<Worker> => {
  workerPromise ??= (async () => {
    const worker = await createWorker("eng", 1, { cachePath: path.join(env.RECOGNITION_DIR, "ocr") });
    await worker.setParameters({
      tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789/-·• ",
    });
    return worker;
  })();
  // A failed start (offline first run) is retried on the next scan rather than cached forever.
  workerPromise.catch(() => {
    workerPromise = null;
  });
  return workerPromise;
};

/** Lets a script exit: the OCR worker keeps the process alive until it is terminated. */
export const stopPrintedText = async (): Promise<void> => {
  const worker = await workerPromise?.catch(() => null);
  workerPromise = null;
  await worker?.terminate();
};

export const warmUpPrintedText = async (): Promise<void> => {
  await getWorker();
};

/** All the small print found on the card, joined into one string. */
export const readPrintedText = async (card: Buffer, tcg: string): Promise<string> => {
  const worker = await getWorker();
  const { width = 0, height = 0 } = await sharp(card).metadata();
  if (!width || !height) return "";

  const lines: string[] = [];
  for (const [top, bottom] of STRIPS[tcg] ?? DEFAULT_STRIPS) {
    const region = {
      left: 0,
      top: Math.floor(height * top),
      width,
      height: Math.max(1, Math.floor(height * (bottom - top))),
    };
    const strip = await sharp(card)
      .extract(region)
      .resize({ width: TARGET_WIDTH })
      .greyscale()
      .normalise()
      .sharpen()
      .png()
      .toBuffer();
    // 6 = a single uniform block of text; the small print is a few short lines.
    await worker.setParameters({ tessedit_pageseg_mode: "6" as never });
    lines.push((await worker.recognize(strip)).data.text);
  }
  return lines.join("\n");
};

/** Upper-case letters and digits only, so "LOB - EN 001" and "lob-en001" compare equal. */
const compact = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, "");
const stripZeros = (value: string) => value.replace(/^0+(?=\d)/, "");

export interface PrintedCandidate {
  /** Collector number as stored, e.g. "RA03-EN080", "2" or "129". */
  number: string;
  /** Set code as stored, e.g. "M21" or "sv3"; only short alphanumeric codes are usable. */
  setCode?: string | null;
  /** Cards the set officially holds, printed as the "/131" of "2/131". */
  setTotal?: number | null;
}

/**
 * How much of a candidate's printing the text on the card confirms. 2 for a code-style number
 * ("RA03-EN080") found whole; 1 each for a plain number found next to a "/", a matching "/total",
 * and a set code found as a word. 0 means nothing matched, not that it is wrong.
 */
export const printedEvidence = (text: string, candidate: PrintedCandidate): number => {
  if (!text.trim()) return 0;
  let points = 0;
  const flat = compact(text);
  const number = candidate.number.trim();

  if (/[A-Za-z]/.test(number)) {
    const code = compact(number);
    if (code.length >= 5 && flat.includes(code)) points += 2;
  } else if (number) {
    const wanted = stripZeros(number);
    const fractions = [...text.matchAll(/(\d{1,4})\s*\/\s*(\d{1,4})/g)];
    if (fractions.some((m) => stripZeros(m[1]!) === wanted)) points += 1;
    if (candidate.setTotal && fractions.some((m) => stripZeros(m[1]!) === wanted && Number(m[2]) === candidate.setTotal)) {
      points += 1;
    }
    // Without a "/": the number stands alone as a word (Magic prints "0123" beside the set code).
    if (fractions.length === 0 && new RegExp(`(^|\\D)0*${wanted}(\\D|$)`).test(text)) points += 1;
  }

  const code = candidate.setCode ? compact(candidate.setCode) : "";
  if (code.length >= 2 && code.length <= 6 && new RegExp(`(^|[^A-Z0-9])${code}([^A-Z0-9]|$)`).test(text.toUpperCase())) {
    points += 1;
  }
  return points;
};

/**
 * Orders candidates that the picture cannot separate: those within `tolerance` of the best visual
 * score are ranked by printed evidence first, visual score second. Everything else keeps its place.
 * `confident` is true when one of them is clearly confirmed by the print and the rest are not.
 */
export const rankByPrint = <T extends { score: number }>(
  candidates: T[],
  evidence: (candidate: T) => number,
  tolerance: number,
): { ranked: T[]; confident: boolean } => {
  if (candidates.length < 2) return { ranked: candidates, confident: false };
  const cutoff = candidates[0]!.score - tolerance;
  const tied = candidates.filter((c) => c.score >= cutoff);
  const rest = candidates.filter((c) => c.score < cutoff);

  const points = new Map(tied.map((c) => [c, evidence(c)] as const));
  const ranked = [...tied].sort((a, b) => points.get(b)! - points.get(a)! || b.score - a.score);
  const [first, second] = ranked;
  const confident = points.get(first!)! >= 2 && (second === undefined || points.get(first!)! > points.get(second)!);
  return { ranked: [...ranked, ...rest], confident };
};
