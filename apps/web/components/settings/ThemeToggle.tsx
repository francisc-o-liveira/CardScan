"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { applyTheme, getStoredTheme, type Theme } from "@/lib/theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("cardscan-dark");

  useEffect(() => {
    setTheme(getStoredTheme());
  }, []);

  const toggle = () => {
    const next: Theme = theme === "cardscan-dark" ? "cardscan-light" : "cardscan-dark";
    setTheme(next);
    applyTheme(next);
  };

  const isDark = theme === "cardscan-dark";

  return (
    <button
      type="button"
      onClick={toggle}
      className="btn btn-outline btn-sm gap-2"
      aria-pressed={!isDark}
    >
      {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      {isDark ? "Dark" : "Light"}
    </button>
  );
}
