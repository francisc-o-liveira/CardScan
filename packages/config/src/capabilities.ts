import { FEATURE_FLAGS } from "./constants";

/**
 * What the API can actually do today.
 *
 * The UI reads these rather than pretending: a screen backed by a missing
 * endpoint shows an honest "coming" state with a working alternative, instead
 * of a spinner that never resolves or fabricated numbers. Shared by web and mobile.
 */
export const CAPABILITIES = {
  /** GET /tcgs, /sets, /cards are live (Pokemon + Magic imported). */
  catalog: true,
  /** No /collection routes exist yet — schema is in place, API is not. */
  collection: FEATURE_FLAGS.ENABLE_COLLECTION,
  wishlist: FEATURE_FLAGS.ENABLE_WISHLIST,
  scanning: FEATURE_FLAGS.ENABLE_SCANNING,
  decks: FEATURE_FLAGS.ENABLE_DECKS,
  pricing: FEATURE_FLAGS.ENABLE_PRICE_ALERTS,
} as const;

/**
 * Scan results at or above this confidence show the single best card to confirm; below it, the apps show
 * the candidate list and ask which one it is. Calibrated with apps/api scripts/evaluateRecognition.ts.
 */
export const SCAN_CONFIDENT = 0.6;
