export type Theme = "cardscan-dark" | "cardscan-light";

const STORAGE_KEY = "cardscan-theme";

export const getStoredTheme = (): Theme => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "cardscan-light" ? "cardscan-light" : "cardscan-dark";
  } catch {
    return "cardscan-dark";
  }
};

export const applyTheme = (theme: Theme) => {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Private browsing / blocked storage — theme just won't persist across reloads.
  }
};

/** Inline script string, inlined in <head> to set the theme before first paint and avoid a flash. */
export const THEME_INIT_SCRIPT = `
(function() {
  try {
    var theme = window.localStorage.getItem("${STORAGE_KEY}");
    document.documentElement.setAttribute("data-theme", theme === "cardscan-light" ? "cardscan-light" : "cardscan-dark");
  } catch (e) {}
})();
`;
