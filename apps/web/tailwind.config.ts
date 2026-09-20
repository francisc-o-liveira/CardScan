import type { Config } from "tailwindcss";
import daisyui from "daisyui";
import { COLORS } from "@cardscan/config";

const { dark, light } = COLORS;

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: ["class", '[data-theme="cardscan-dark"]'],
  theme: {
    extend: {
      fontFamily: {
        // --font-sans is defined in globals.css; the inline fallback keeps the
        // declaration valid even if that stylesheet hasn't applied yet.
        sans: [
          "var(--font-sans, 'Segoe UI Variable Text')",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Inter",
          "Roboto",
          "Helvetica Neue",
          "sans-serif",
        ],
      },
      // Five-step scale — see packages/config/src/theme.ts.
      fontSize: {
        meta: ["0.8125rem", { lineHeight: "1.15rem", letterSpacing: "0" }],
        body: ["0.9375rem", { lineHeight: "1.45rem" }],
        section: ["1.1875rem", { lineHeight: "1.6rem", letterSpacing: "-0.01em" }],
        title: ["1.625rem", { lineHeight: "2rem", letterSpacing: "-0.02em" }],
        display: ["2.25rem", { lineHeight: "2.5rem", letterSpacing: "-0.03em" }],
      },
      colors: {
        // Semantic aliases so components never hardcode hex.
        hairline: "var(--border-hairline)",
        strong: "var(--border-strong)",
        muted: "var(--text-muted)",
        faint: "var(--text-faint)",
      },
      borderRadius: {
        card: "0.65rem",
        panel: "1.125rem",
        hero: "1.5rem",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        card: "var(--shadow-card)",
        sheen: "var(--surface-sheen)",
      },
      transitionTimingFunction: {
        standard: "cubic-bezier(0.22, 0.61, 0.36, 1)",
        spring: "cubic-bezier(0.34, 1.26, 0.64, 1)",
      },
      transitionDuration: {
        fast: "160ms",
        base: "220ms",
      },
      spacing: {
        // Minimum comfortable touch target.
        touch: "2.75rem",
      },
      animation: {
        "fade-in-up": "fade-in-up 220ms cubic-bezier(0.22, 0.61, 0.36, 1) both",
        "sheet-up": "sheet-up 280ms cubic-bezier(0.34, 1.26, 0.64, 1) both",
        "scan-sweep": "scan-sweep 2.4s cubic-bezier(0.45, 0, 0.55, 1) infinite",
        "pop-in": "pop-in 320ms cubic-bezier(0.34, 1.26, 0.64, 1) both",
      },
      maxWidth: {
        content: "78rem",
      },
    },
  },
  plugins: [daisyui],
  daisyui: {
    logs: false,
    themes: [
      {
        "cardscan-dark": {
          primary: dark.primary,
          "primary-content": dark.primaryContent,
          secondary: dark.base300,
          "secondary-content": dark.baseContent,
          accent: dark.accent,
          "accent-content": dark.accentContent,
          neutral: dark.base200,
          "neutral-content": dark.baseContent,
          "base-100": dark.base100,
          "base-200": dark.base200,
          "base-300": dark.base300,
          "base-content": dark.baseContent,
          info: dark.info,
          success: dark.success,
          warning: dark.warning,
          error: dark.error,
          "--rounded-box": "1.125rem",
          "--rounded-btn": "0.7rem",
          "--rounded-badge": "999px",
          "--border-btn": "1px",
          "--animation-btn": "0.16s",
          "--btn-focus-scale": "0.985",
        },
      },
      {
        "cardscan-light": {
          primary: light.primary,
          "primary-content": light.primaryContent,
          secondary: light.base300,
          "secondary-content": light.baseContent,
          accent: light.accent,
          "accent-content": light.accentContent,
          neutral: light.baseContent,
          "neutral-content": light.base100,
          "base-100": light.base100,
          "base-200": light.base200,
          "base-300": light.base300,
          "base-content": light.baseContent,
          info: light.info,
          success: light.success,
          warning: light.warning,
          error: light.error,
          "--rounded-box": "1.125rem",
          "--rounded-btn": "0.7rem",
          "--rounded-badge": "999px",
          "--border-btn": "1px",
          "--animation-btn": "0.16s",
          "--btn-focus-scale": "0.985",
        },
      },
    ],
    darkTheme: "cardscan-dark",
  },
};

export default config;
