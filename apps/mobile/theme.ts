import { COLORS, RADIUS, SPACING, TYPE_SCALE, TOUCH_TARGET } from "@cardscan/config";

/**
 * Mobile's view of the shared design tokens.
 *
 * The app is dark-only for now (the web theme toggle has no mobile equivalent
 * yet), so this pins the dark palette in one place instead of every StyleSheet
 * reaching for `COLORS.dark`.
 */
export const C = COLORS.dark;
export const R = RADIUS;
export const S = SPACING;
export const T = TYPE_SCALE;
export const MIN_TOUCH = TOUCH_TARGET;

/** Card artwork aspect ratio — 63x88mm. */
export const CARD_ASPECT = 2.5 / 3.5;
