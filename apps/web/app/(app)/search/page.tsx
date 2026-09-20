"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, SearchX, SlidersHorizontal } from "lucide-react";
import { LIVE_TCGS, TCG_COLORS, TCG_SHORT_LABELS } from "@cardscan/config";
import type { TcgSlug } from "@cardscan/types";
import { PageShell, PageHeader } from "@/components/layout/PageShell";
import { SearchField } from "@/components/ui/SearchField";
import { GameSwitcher, type GameFilter } from "@/components/ui/GameSwitcher";
import { FilterChip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { CardGrid } from "@/components/cards/CardGrid";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton, SkeletonCardGrid } from "@/components/ui/Skeleton";
import {
  SearchFilters,
  NO_FILTERS,
  type SearchFilterState,
} from "@/components/search/SearchFilters";
import { useCards } from "@/hooks/useCatalog";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

const PAGE_SIZE = 30;

/** Concrete, recognisable starting points — better than an empty screen. */
const SUGGESTIONS = ["Charizard", "Pikachu", "Black Lotus", "Lightning Bolt", "Mewtwo", "Sol Ring"];

const isLiveGame = (value: string | null): value is TcgSlug =>
  Boolean(value) && (LIVE_TCGS as readonly string[]).includes(value as string);

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [filters, setFilters] = useState<SearchFilterState>({
    ...NO_FILTERS,
    game: isLiveGame(searchParams.get("game")) ? (searchParams.get("game") as TcgSlug) : "all",
  });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [page, setPage] = useState(1);

  const debouncedQuery = useDebouncedValue(query);
  const hasQuery = debouncedQuery.trim().length >= 2;
  const activeFilterCount = (filters.game !== "all" ? 1 : 0) + (filters.setId ? 1 : 0);

  // Arriving from the header shortcut should put the cursor where it belongs.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Keep the URL shareable without pushing a history entry per keystroke.
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQuery.trim()) params.set("q", debouncedQuery.trim());
    if (filters.game !== "all") params.set("game", filters.game);
    if (filters.setId) params.set("set", filters.setId);
    const next = params.toString();
    router.replace(next ? `/search?${next}` : "/search", { scroll: false });
  }, [debouncedQuery, filters, router]);

  const { data, isLoading, isFetching, isError, refetch } = useCards(
    {
      query: debouncedQuery.trim(),
      tcg: filters.game === "all" ? undefined : filters.game,
      setId: filters.setId ?? undefined,
      page,
      limit: PAGE_SIZE,
    },
    hasQuery,
  );

  const results = data?.data ?? [];
  const pagination = data?.pagination;

  const onQueryChange = (value: string) => {
    setQuery(value);
    setPage(1);
  };

  const applyFilters = (next: SearchFilterState) => {
    setFilters(next);
    setPage(1);
  };

  return (
    <PageShell>
      <PageHeader title="Search" />

      <div className="mb-4 flex gap-2">
        <SearchField
          ref={inputRef}
          size="lg"
          label="Search cards by name, set or number"
          placeholder="Search cards, sets, or collections…"
          value={query}
          onValueChange={onQueryChange}
          isLoading={hasQuery && isFetching}
          className="flex-1"
        />
        <Button
          variant="outline"
          size="lg"
          onClick={() => setSheetOpen(true)}
          aria-expanded={sheetOpen}
          // The visible "Filters" text is hidden on phones, which would leave an icon-only, unnamed button.
          aria-label={activeFilterCount > 0 ? `Filters, ${activeFilterCount} active` : "Filters"}
          className="shrink-0"
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Filters</span>
          {activeFilterCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[0.6875rem] font-semibold text-primary-content">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      <GameSwitcher
        value={filters.game}
        onChange={(game: GameFilter) =>
          // Changing game invalidates any chosen set: a set belongs to one game.
          applyFilters({ game, setId: null, setName: null })
        }
        games={LIVE_TCGS}
        className="mb-4"
      />

      {/* Active filters: always visible, always removable. */}
      {activeFilterCount > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {filters.game !== "all" && (
            <FilterChip
              label="Game"
              value={TCG_SHORT_LABELS[filters.game]}
              accent={TCG_COLORS[filters.game]}
              onRemove={() => applyFilters({ game: "all", setId: null, setName: null })}
            />
          )}
          {filters.setId && filters.setName && (
            <FilterChip
              label="Set"
              value={filters.setName}
              onRemove={() =>
                applyFilters({ ...filters, setId: null, setName: null })
              }
            />
          )}
          <button
            type="button"
            onClick={() => applyFilters(NO_FILTERS)}
            className="min-h-9 rounded-full px-3 text-meta font-medium text-muted transition-colors duration-fast hover:text-base-content"
          >
            Clear all
          </button>
        </div>
      )}

      {!hasQuery && (
        <div>
          <p className="mb-3 text-meta font-medium text-muted">Try searching for</p>
          <ul className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((suggestion) => (
              <li key={suggestion}>
                <button
                  type="button"
                  onClick={() => onQueryChange(suggestion)}
                  className="min-h-9 rounded-full border border-hairline bg-base-200 px-4 text-meta text-muted transition-colors duration-fast hover:border-strong hover:text-base-content"
                >
                  {suggestion}
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-10">
            <EmptyState
              tone="inline"
              icon={Search}
              title="Find any card in seconds"
              description="Search 130,000+ Pokémon and Magic cards by name, set or collector number."
            />
          </div>
        </div>
      )}

      {hasQuery && isLoading && <SkeletonCardGrid count={12} />}

      {hasQuery && isError && (
        <ErrorState
          title="Search didn't come back"
          description="We couldn't reach the card catalog. Check your connection and try again."
          onRetry={() => refetch()}
        />
      )}

      {hasQuery && !isLoading && !isError && results.length === 0 && (
        <EmptyState
          icon={SearchX}
          title={`No cards match "${debouncedQuery.trim()}"`}
          description={
            activeFilterCount > 0
              ? "Nothing matches inside these filters. Try clearing them, or search across all games."
              : "Check the spelling, or try part of the name — searching 'chariz' works as well as the full card name."
          }
          action={
            activeFilterCount > 0 ? (
              <Button variant="primary" onClick={() => applyFilters(NO_FILTERS)}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      )}

      {hasQuery && results.length > 0 && (
        <>
          <p className="mb-5 text-meta text-muted" aria-live="polite">
            <span className="font-medium text-base-content tabular-nums">
              {pagination?.total.toLocaleString()}
            </span>{" "}
            {pagination?.total === 1 ? "card" : "cards"} found
          </p>
          <CardGrid cards={results} showGame={filters.game === "all"} />
          {pagination && (
            <div className="mt-8">
              <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                total={pagination.total}
                isFetching={isFetching}
                onPageChange={(next) => {
                  setPage(next);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            </div>
          )}
        </>
      )}

      <SearchFilters
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        value={filters}
        onApply={applyFilters}
      />
    </PageShell>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <PageShell>
          <Skeleton className="h-9 w-40" />
          <Skeleton className="mt-6 h-13 w-full rounded-xl" />
        </PageShell>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
