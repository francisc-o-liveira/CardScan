import type { Config } from "tailwindcss";
import daisyui from "daisyui";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: ["class", '[data-theme="cardscan-dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [daisyui],
  daisyui: {
    themes: [
      {
        "cardscan-dark": {
          primary: "#5B7CFA",
          "primary-content": "#F5F7FF",
          secondary: "#7C7FF2",
          accent: "#5B7CFA",
          neutral: "#1A1D26",
          "base-100": "#0B0C10",
          "base-200": "#14161D",
          "base-300": "#1D202B",
          "base-content": "#E6E7EC",
          info: "#5B9DFA",
          success: "#3FCF8E",
          warning: "#F5A623",
          error: "#F0555A",
        },
      },
      {
        "cardscan-light": {
          primary: "#3E63DD",
          "primary-content": "#FFFFFF",
          secondary: "#5B5FC7",
          accent: "#3E63DD",
          neutral: "#E7E9F0",
          "base-100": "#FFFFFF",
          "base-200": "#F5F6FA",
          "base-300": "#E7E9F0",
          "base-content": "#181A21",
          info: "#3E86DD",
          success: "#1FA971",
          warning: "#D68A0C",
          error: "#D93B41",
        },
      },
    ],
    darkTheme: "cardscan-dark",
  },
};

export default config;
