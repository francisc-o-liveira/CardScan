"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { applyTheme, getStoredTheme, type Theme } from "@/lib/theme";
import { cn } from "@/lib/cn";

const OPTIONS: { value: Theme; label: string; icon: typeof Moon }[] = [
  { value: "cardscan-dark", label: "Dark", icon: Moon },
  { value: "cardscan-light", label: "Light", icon: Sun },
];

/**
 * A two-option segmented control rather than a toggle: it shows both states at
 * once, so which one is active never has to be inferred from an icon.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("cardscan-dark");

  useEffect(() => {
    setTheme(getStoredTheme());
  }, []);

  const select = (next: Theme) => {
    setTheme(next);
    applyTheme(next);
  };

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="inline-flex rounded-xl border border-hairline bg-base-100 p-1"
    >
      {OPTIONS.map((option) => {
        const active = theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => select(option.value)}
            className={cn(
              "flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-meta font-medium transition-colors duration-fast",
              active
                ? "bg-base-300 text-base-content shadow-sm"
                : "text-muted hover:text-base-content",
            )}
          >
            <option.icon className="h-3.5 w-3.5" aria-hidden />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
