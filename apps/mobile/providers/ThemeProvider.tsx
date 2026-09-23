import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PALETTES, type Palette, type ThemeName } from "@/theme";

/** Same key and values as the web app, so the two platforms describe the preference identically. */
const STORAGE_KEY = "cardscan-theme";
const STORED_VALUES: Record<ThemeName, string> = { dark: "cardscan-dark", light: "cardscan-light" };

interface ThemeContextValue {
  theme: ThemeName;
  colors: Palette;
  setTheme: (theme: ThemeName) => void;
}

// Dark is the default, so components (and their tests) work without a provider.
const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  colors: PALETTES.dark,
  setTheme: () => undefined,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>("dark");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === STORED_VALUES.light) setThemeState("light");
      })
      .catch(() => undefined)
      .finally(() => setIsReady(true));
  }, []);

  const setTheme = useCallback((next: ThemeName) => {
    setThemeState(next);
    AsyncStorage.setItem(STORAGE_KEY, STORED_VALUES[next]).catch(() => undefined);
  }, []);

  const value = useMemo(() => ({ theme, colors: PALETTES[theme], setTheme }), [theme, setTheme]);

  // Hold the first frame until the saved theme is known, so a light-theme user never sees a dark flash.
  if (!isReady) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
export const useColors = () => useContext(ThemeContext).colors;
