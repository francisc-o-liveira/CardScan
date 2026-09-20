/**
 * CardScan design tokens.
 *
 * Single source of truth for both clients:
 *  - web  reads these through `tailwind.config.ts` (DaisyUI themes + Tailwind extend)
 *  - mobile reads these directly in StyleSheet objects
 *
 * Web components should prefer semantic Tailwind classes (`bg-surface`,
 * `text-muted`, …) over importing raw hex from here; these exports exist so the
 * two platforms cannot drift.
 */

/** Neutral + intent palette. Dark is the product's default surface. */
export const COLORS = {
  dark: {
    /** Page background — deep, slightly cool near-black so card art pops. */
    base100: "#0A0A0D",
    /** Resting surface: cards, tiles, inputs. */
    base200: "#121318",
    /** Raised surface: popovers, sheets, hover states. */
    base300: "#1B1D24",
    /** Hairline dividers and card outlines. */
    border: "#262932",
    /** Emphasised border — focus rings, selected outlines. */
    borderStrong: "#393E4D",

    baseContent: "#F2F3F7",
    baseContentMuted: "#98A0B0",
    baseContentFaint: "#6A7180",

    primary: "#5B6CFF",
    primaryHover: "#7181FF",
    primaryContent: "#FFFFFF",
    /** Low-alpha primary wash for selected rows and icon chips. */
    primarySoft: "rgba(91,108,255,0.14)",

    /** Reserved for monetary/value emphasis, not for generic success toasts. */
    accent: "#2DD4A7",
    accentContent: "#04231B",

    success: "#34D399",
    warning: "#FBBF24",
    error: "#FB7185",
    info: "#60A5FA",
  },
  light: {
    base100: "#FBFBF9",
    base200: "#FFFFFF",
    base300: "#F3F3EF",
    border: "#E4E4DE",
    borderStrong: "#C9C9C1",

    baseContent: "#16171C",
    baseContentMuted: "#5C6270",
    baseContentFaint: "#858B98",

    primary: "#4353E8",
    primaryHover: "#3746D1",
    primaryContent: "#FFFFFF",
    primarySoft: "rgba(67,83,232,0.10)",

    accent: "#0E9C7B",
    accentContent: "#FFFFFF",

    success: "#0E9C6B",
    warning: "#B4790A",
    error: "#D92D45",
    info: "#2563EB",
  },
} as const;

/**
 * Type scale (px). Deliberately short — five steps cover every screen, which is
 * what keeps hierarchy readable instead of merely varied.
 */
export const TYPE_SCALE = {
  display: 36,
  title: 26,
  section: 19,
  body: 15,
  meta: 13,
} as const;

/** 4px base spacing rhythm. */
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
} as const;

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  full: 999,
} as const;

/** Minimum interactive size, in px — WCAG-comfortable touch target. */
export const TOUCH_TARGET = 44;

/** Motion durations (ms). Anything above `slow` reads as sluggish, not premium. */
export const DURATION = {
  instant: 90,
  fast: 160,
  base: 220,
  slow: 320,
} as const;

export const EASING = {
  /** Default for enter/exit — settles without overshoot. */
  standard: "cubic-bezier(0.22, 0.61, 0.36, 1)",
  /** Elements leaving the screen. */
  exit: "cubic-bezier(0.4, 0, 1, 1)",
  /** Sheets and toggles — a touch of spring. */
  spring: "cubic-bezier(0.34, 1.26, 0.64, 1)",
} as const;
