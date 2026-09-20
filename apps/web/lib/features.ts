import { FEATURE_FLAGS } from "@cardscan/config";

/**
 * What the API can actually do today.
 *
 * The UI reads these rather than pretending: a screen backed by a missing
 * endpoint shows an honest "coming" state with a working alternative, instead
 * of a spinner that never resolves or fabricated numbers.
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
