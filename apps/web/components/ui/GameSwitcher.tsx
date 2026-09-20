"use client";

import { TCG_COLORS, TCG_SHORT_LABELS, TCG_CATALOG_STATUS } from "@cardscan/config";
import type { TcgSlug } from "@cardscan/types";
import { cn } from "@/lib/cn";

export type GameFilter = TcgSlug | "all";

interface GameSwitcherProps {
  value: GameFilter;
  onChange: (value: GameFilter) => void;
  /** Which games to offer. Defaults to games with a live catalog. */
  games: readonly TcgSlug[];
  /** Per-game counts, shown under the label when known. */
  counts?: Partial<Record<GameFilter, number>>;
  className?: string;
}

/**
 * The single place users switch between games — §18's mental model. One
 * horizontally scrollable row at every breakpoint so the interaction is
 * identical on phone and desktop; only the density changes.
 */
export function GameSwitcher({ value, onChange, games, counts, className }: GameSwitcherProps) {
  const options: GameFilter[] = ["all", ...games];

  return (
    <div
      role="radiogroup"
      aria-label="Filter by game"
      className={cn("scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0", className)}
    >
      {options.map((option) => {
        const isAll = option === "all";
        const selected = value === option;
        const accent = isAll ? undefined : TCG_COLORS[option];
        const label = isAll ? "All games" : TCG_SHORT_LABELS[option];
        const count = counts?.[option];
        const planned = !isAll && TCG_CATALOG_STATUS[option] === "planned";

        return (
          <button
            key={option}
            role="radio"
            type="button"
            aria-checked={selected}
            onClick={() => onChange(option)}
            className={cn(
              "flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-meta font-medium transition-all duration-fast ease-standard",
              selected
                ? "border-transparent bg-base-content text-base-100 shadow-sm"
                : "border-hairline bg-base-200 text-muted hover:border-strong hover:text-base-content",
            )}
            style={
              selected && accent
                ? { backgroundColor: accent, color: "#0A0A0D", borderColor: accent }
                : undefined
            }
          >
            {!isAll && !selected && (
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: accent }}
                aria-hidden
              />
            )}
            {label}
            {typeof count === "number" && (
              <span className={cn("tabular-nums", selected ? "opacity-70" : "text-faint")}>
                {count.toLocaleString()}
              </span>
            )}
            {planned && !selected && (
              <span className="text-[0.625rem] uppercase tracking-wide text-faint">Soon</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
