import { COLORS, RADIUS, SPACING, TYPE_SCALE, TOUCH_TARGET } from "@cardscan/config";

/**
 * Mobile's view of the shared design tokens.
 *
 * Colours are not constants any more: web has a Dark/Light toggle, so the palette depends on the chosen
 * theme. Read it with `useColors()` (providers/ThemeProvider) and build StyleSheets from it with
 * `createStyles(C)`. Everything else (radius, spacing, type scale) is theme-independent.
 */
export type ThemeName = "dark" | "light";

/** Same keys as the shared palette, with plain string values so dark and light are interchangeable. */
export type Palette = { [Token in keyof typeof COLORS.dark]: string };

export const PALETTES: Record<ThemeName, Palette> = {
  dark: COLORS.dark,
  light: COLORS.light,
};

export const R = RADIUS;
export const S = SPACING;
export const T = TYPE_SCALE;
export const MIN_TOUCH = TOUCH_TARGET;

/** Screen side margin. 16px, the same as the web app's mobile layout (px-4). */
export const GUTTER = 16;

/** Card artwork aspect ratio — 63x88mm. */
export const CARD_ASPECT = 2.5 / 3.5;
