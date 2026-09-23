"use client";

import { useState } from "react";
import { Compass, Layers, ScanLine, SearchX, SlidersHorizontal } from "lucide-react";
import { CARD_CONDITIONS, CARD_CONDITION_LABELS, LIVE_TCGS, TCG_COLORS, TCG_SHORT_LABELS } from "@cardscan/config";
import type { CardCondition, TcgSlug } from "@cardscan/types";
import { PageShell, PageHeader } from "@/components/layout/PageShell";
import { CardGrid } from "@/components/cards/CardGrid";
import { SearchField } from "@/components/ui/SearchField";
import { GameSwitcher, type GameFilter } from "@/components/ui/GameSwitcher";
import { FilterChip, ToggleChip } from "@/components/ui/Chip";
import { Sheet } from "@/components/ui/Sheet";
import { Pagination } from "@/components/ui/Pagination";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { SkeletonCardGrid } from "@/components/ui/Skeleton";
import { useCollection, useCollectionSummary } from "@/hooks/useCollection";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

const PAGE_SIZE = 48;

/**
 * Everything the user owns, per docs/design-system.md 5.4: title and count, search and Filters, the game
 * switcher, removable active-filter chips, then the grid. An empty collection shows only the empty state,
 * with no search or filter chrome over nothing.
 */
export default function CollectionPage() {
  const [query, setQuery] = useState("");
  const [game, setGame] = useState<GameFilter>("all");
  const [condition, setCondition] = useState<CardCondition | null>(null);
  // The sheet edits a draft; "Show results" commits it, so the grid never thrashes mid-edit.
  const [draftCondition, setDraftCondition] = useState<CardCondition | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [page, setPage] = useState(1);

  const debounced = useDebouncedValue(query).trim();
  const summary = useCollectionSummary();
  const { data, isLoading, isError, refetch } = useCollection({
    query: debounced || undefined,
    tcg: game === "all" ? undefined : game,
    condition: condition ?? undefined,
    page,
    limit: PAGE_SIZE,
  });

  const filtered = Boolean(debounced) || game !== "all" || condition !== null;
  const entries = data?.data ?? [];
  const quantities = Object.fromEntries(entries.map((entry) => [entry.card.id, entry.quantity]));

  const clearAll = () => {
    setQuery("");
    setGame("all");
    setCondition(null);
    setPage(1);
  };

  if (summary.data?.totalCards === 0) {
    return (
      <PageShell width="narrow">
        <PageHeader title="My collection" />
        <EmptyState
          icon={Layers}
          title="Your collection is empty"
          description="Scan a card to add your first one. Everything you own — quantities, condition and sets — is tracked here."
          action={
            <ButtonLink href="/scan" variant="primary" size="lg">
              <ScanLine className="h-[1.1rem] w-[1.1rem]" aria-hidden />
              Scan your first card
            </ButtonLink>
          }
          secondaryAction={
            <ButtonLink href="/discover" variant="outline" size="lg">
              <Compass className="h-[1.1rem] w-[1.1rem]" aria-hidden />
              Browse the catalog
            </ButtonLink>
          }
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="My collection"
        meta={
          summary.data ? (
            <p className="text-meta text-muted">
              {summary.data.totalCards.toLocaleString()} {summary.data.totalCards === 1 ? "card" : "cards"} ·{" "}
              {summary.data.uniqueCards.toLocaleString()} unique · {summary.data.totalSets.toLocaleString()}{" "}
              {summary.data.totalSets === 1 ? "set" : "sets"}
            </p>
          ) : undefined
        }
      />

      <div className="flex gap-2.5">
        <SearchField
          className="flex-1"
          label="Search your collection"
          placeholder="Search your collection"
          value={query}
          onValueChange={(value) => {
            setQuery(value);
            setPage(1);
          }}
        />
        <Button
          variant="outline"
          onClick={() => {
            setDraftCondition(condition);
            setSheetOpen(true);
          }}
          aria-label={condition ? "Filters, 1 active" : "Filters"}
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Filters</span>
          {condition && (
            <span className="rounded-full bg-primary px-1.5 text-[0.6875rem] font-semibold text-primary-content">1</span>
          )}
        </Button>
      </div>

      <div className="mt-3">
        <GameSwitcher
          value={game}
          onChange={(next) => {
            setGame(next);
            setPage(1);
          }}
          games={LIVE_TCGS}
        />
      </div>

      {filtered && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {debounced && <FilterChip label="Search" value={`"${debounced}"`} onRemove={() => setQuery("")} />}
          {game !== "all" && (
            <FilterChip
              label="Game"
              value={TCG_SHORT_LABELS[game as TcgSlug]}
              accent={TCG_COLORS[game as TcgSlug]}
              onRemove={() => setGame("all")}
            />
          )}
          {condition && (
            <FilterChip label="Condition" value={CARD_CONDITION_LABELS[condition]} onRemove={() => setCondition(null)} />
          )}
          <button type="button" onClick={clearAll} className="text-meta font-semibold text-primary hover:underline">
            Clear all
          </button>
        </div>
      )}

      <div className="mt-6">
        {isLoading ? (
          <SkeletonCardGrid count={12} />
        ) : isError ? (
          <ErrorState title="We couldn't load your collection" onRetry={() => refetch()} />
        ) : entries.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="Nothing in your collection matches"
            description="Try a shorter search, another game, or clear the filters."
            action={
              <Button variant="primary" size="lg" onClick={clearAll}>
                Clear all
              </Button>
            }
          />
        ) : (
          <>
            <CardGrid cards={entries.map((entry) => entry.card)} quantities={quantities} showGame={game === "all"} />
            <div className="mt-8">
              <Pagination
                page={page}
                totalPages={data?.pagination.totalPages ?? 1}
                total={data?.pagination.total ?? 0}
                onPageChange={(next) => {
                  setPage(next);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            </div>
          </>
        )}
      </div>

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Filters"
        footer={
          <div className="flex gap-2.5">
            <Button variant="ghost" size="lg" onClick={() => setDraftCondition(null)}>
              Clear
            </Button>
            <Button
              variant="primary"
              size="lg"
              block
              onClick={() => {
                setCondition(draftCondition);
                setPage(1);
                setSheetOpen(false);
              }}
            >
              Show results
            </Button>
          </div>
        }
      >
        <h3 className="mb-2.5 text-meta font-semibold uppercase tracking-wide text-faint">Condition</h3>
        <div className="flex flex-wrap gap-2">
          {CARD_CONDITIONS.map((value) => (
            <ToggleChip
              key={value}
              selected={draftCondition === value}
              onClick={() => setDraftCondition(draftCondition === value ? null : value)}
            >
              {CARD_CONDITION_LABELS[value]}
            </ToggleChip>
          ))}
        </div>
      </Sheet>
    </PageShell>
  );
}
