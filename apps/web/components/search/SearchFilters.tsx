"use client";

import { useMemo, useState } from "react";
import { Check, Layers } from "lucide-react";
import { LIVE_TCGS, TCG_COLORS, TCG_SHORT_LABELS } from "@cardscan/config";
import type { TcgSlug } from "@cardscan/types";
import { Sheet } from "@/components/ui/Sheet";
import { ToggleChip } from "@/components/ui/Chip";
import { SearchField } from "@/components/ui/SearchField";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useSets } from "@/hooks/useCatalog";
import { cn } from "@/lib/cn";

export interface SearchFilterState {
  game: TcgSlug | "all";
  setId: string | null;
  setName: string | null;
}

export const NO_FILTERS: SearchFilterState = { game: "all", setId: null, setName: null };

/**
 * Game and set filters for search. Both are backed by real query parameters
 * (`tcg`, `setId`), so nothing here is decorative.
 *
 * Edits go to a draft that only commits on "Show results" — a filter sheet
 * that re-runs the query on every tap makes the grid thrash while you are
 * still deciding.
 */
export function SearchFilters({
  open,
  onClose,
  value,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  value: SearchFilterState;
  onApply: (next: SearchFilterState) => void;
}) {
  const [draft, setDraft] = useState<SearchFilterState>(value);
  const [setQuery, setSetQuery] = useState("");

  // Only load sets once a single game is chosen: "all games" would mean
  // fetching ~1,270 sets to populate a picker nobody can scan.
  const singleGame = draft.game === "all" ? undefined : draft.game;
  const setsQuery = useSets(singleGame, Boolean(singleGame) && open);

  const sets = useMemo(() => {
    const all = setsQuery.data ?? [];
    const needle = setQuery.trim().toLowerCase();
    const filtered = needle
      ? all.filter(
          (set) =>
            set.name.toLowerCase().includes(needle) || set.code.toLowerCase().includes(needle),
        )
      : all;
    // Long lists are unusable in a sheet; search narrows, this caps.
    return filtered.slice(0, 60);
  }, [setsQuery.data, setQuery]);

  // Re-sync the draft each time the sheet opens.
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setDraft(value);
      setSetQuery("");
    }
  }

  const chooseGame = (game: TcgSlug | "all") => {
    // A set belongs to one game, so changing game invalidates the set.
    setDraft({ game, setId: null, setName: null });
    setSetQuery("");
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Filters"
      footer={
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={() => setDraft(NO_FILTERS)}>
            Reset
          </Button>
          <Button
            variant="primary"
            className="flex-[2]"
            onClick={() => {
              onApply(draft);
              onClose();
            }}
          >
            Show results
          </Button>
        </div>
      }
    >
      <fieldset className="py-2">
        <legend className="mb-3 text-meta font-medium text-muted">Game</legend>
        <div className="flex flex-wrap gap-2">
          <ToggleChip selected={draft.game === "all"} onClick={() => chooseGame("all")}>
            All games
          </ToggleChip>
          {LIVE_TCGS.map((slug) => (
            <ToggleChip
              key={slug}
              selected={draft.game === slug}
              accent={TCG_COLORS[slug]}
              onClick={() => chooseGame(slug)}
            >
              {TCG_SHORT_LABELS[slug]}
            </ToggleChip>
          ))}
        </div>
      </fieldset>

      <div className="my-2 h-px bg-hairline" aria-hidden />

      <fieldset className="py-2">
        <legend className="mb-3 text-meta font-medium text-muted">Set</legend>

        {!singleGame ? (
          <p className="text-meta text-faint">Pick a game first to filter by set.</p>
        ) : (
          <>
            <SearchField
              label="Filter sets"
              placeholder="Find a set"
              value={setQuery}
              onValueChange={setSetQuery}
              className="mb-3"
            />

            {setsQuery.isLoading ? (
              <div className="flex flex-col gap-1.5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-11 rounded-lg" />
                ))}
              </div>
            ) : (
              <ul className="flex flex-col gap-0.5">
                <li>
                  <button
                    type="button"
                    onClick={() => setDraft((current) => ({ ...current, setId: null, setName: null }))}
                    className={cn(
                      "flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-left text-body transition-colors duration-fast",
                      draft.setId === null
                        ? "bg-primary/12 text-primary"
                        : "text-muted hover:bg-base-200 hover:text-base-content",
                    )}
                  >
                    <Layers className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="flex-1">All sets</span>
                    {draft.setId === null && <Check className="h-4 w-4 shrink-0" aria-hidden />}
                  </button>
                </li>

                {sets.map((set) => {
                  const selected = draft.setId === set.id;
                  return (
                    <li key={set.id}>
                      <button
                        type="button"
                        onClick={() =>
                          setDraft((current) => ({ ...current, setId: set.id, setName: set.name }))
                        }
                        className={cn(
                          "flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-left transition-colors duration-fast",
                          selected
                            ? "bg-primary/12 text-primary"
                            : "text-muted hover:bg-base-200 hover:text-base-content",
                        )}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-body">{set.name}</span>
                          <span className="block truncate text-meta text-faint">
                            {set.code.toUpperCase()}
                          </span>
                        </span>
                        {selected && <Check className="h-4 w-4 shrink-0" aria-hidden />}
                      </button>
                    </li>
                  );
                })}

                {setQuery.trim() && sets.length === 0 && (
                  <li className="px-3 py-3 text-meta text-faint">No sets match that.</li>
                )}
              </ul>
            )}
          </>
        )}
      </fieldset>
    </Sheet>
  );
}
