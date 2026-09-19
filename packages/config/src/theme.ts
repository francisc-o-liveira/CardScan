/**
 * Brand colors shared between the web DaisyUI theme (tailwind.config.ts) and the
 * mobile app's StyleSheet-based styling, so both stay visually in sync.
 */
export const COLORS = {
  dark: {
    primary: "#5B7CFA",
    primaryContent: "#F5F7FF",
    base100: "#0B0C10",
    base200: "#14161D",
    base300: "#1D202B",
    baseContent: "#E6E7EC",
    baseContentMuted: "#9AA0AE",
    border: "#242833",
    error: "#F0555A",
    success: "#3FCF8E",
  },
} as const;
