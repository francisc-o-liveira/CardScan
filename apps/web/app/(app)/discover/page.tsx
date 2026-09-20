"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Compass } from "lucide-react";
import { LIVE_TCGS, TCG_LABELS } from "@cardscan/config";
import type { TcgSlug } from "@cardscan/types";
import { PageShell, PageHeader } from "@/components/layout/PageShell";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { GameSwitcher, type GameFilter } from "@/components/ui/GameSwitcher";
import { SearchField } from "@/components/ui/SearchField";
import { SetTile } from "@/components/cards/SetTile";
import { CardRail } from "@/components/cards/CardRail";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useSets } from "@/hooks/useCatalog";
import { useLatestSetCards } from "@/hooks/useLatestSetCards";

const isLiveGame = (value: string | null): value is TcgSlug =>
  Boolean(value) && (LIVE_TCGS as readonly string[]).includes(value as string);

function DiscoverContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const gameParam = searchParams.get("game");
  const game: GameFilter = isLiveGame(gameParam) ? gameParam : "pokemon";
  const [setQuery, setSetQuery] = useState("");

  const setsQuery = useSets(game as TcgSlug);
  const newest = useLatestSetCards(game as TcgSlug, 12);

  // Sets are ordered release-date desc by the API; filtering client-side is
  // fine because one game returns at most ~1k sets in a single response.
  const sets = useMemo(() => {
    const all = setsQuery.data ?? [];
    const needle = setQuery.trim().toLowerCase();
    if (!needle) return all;
    return all.filter(
      (set) =>
        set.name.toLowerCase().includes(needle) || set.code.toLowerCase().includes(needle),
    );
  }, [setsQuery.data, setQuery]);

  const changeGame = (next: GameFilter) => {
    setSetQuery("");
    router.replace(next === "all" ? "/discover" : `/discover?game=${next}`, { scroll: false });
  };

  return (
    <PageShell>
      <PageHeader
        title="Discover"
        description="Browse every set and card in the games CardScan has imported."
      />

      <GameSwitcher
        value={game}
        onChange={changeGame}
        games={LIVE_TCGS}
        className="mb-8"
      />

      <div className="flex flex-col gap-10">
        {/* Newest release first — the thing collectors check for. */}
        <section>
          <SectionHeader
            title="Recently released"
            subtitle={newest.set?.name ?? "Loading the latest set"}
            href={newest.set ? `/sets/${newest.set.id}` : undefined}
            linkLabel="View set"
          />
          {newest.isError ? (
            <ErrorState description="We couldn't load the latest set." />
          ) : (
            <CardRail cards={newest.cards} isLoading={newest.isLoading} />
          )}
        </section>

        <section>
          <SectionHeader
            title="All sets"
            subtitle={
              setsQuery.data
                ? `${setsQuery.data.length.toLocaleString()} ${TCG_LABELS[game as TcgSlug]} sets`
                : undefined
            }
          />

          <SearchField
            label={`Filter ${TCG_LABELS[game as TcgSlug]} sets`}
            placeholder="Filter sets by name or code"
            value={setQuery}
            onValueChange={setSetQuery}
            className="mb-4 max-w-md"
          />

          {setsQuery.isLoading && (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <Skeleton key={i} className="h-[4.75rem] rounded-panel" />
              ))}
            </div>
          )}

          {setsQuery.isError && (
            <ErrorState onRetry={() => setsQuery.refetch()} />
          )}

          {setsQuery.data && sets.length === 0 && (
            <EmptyState
              icon={Compass}
              title="No sets match that"
              description={`Nothing in ${TCG_LABELS[game as TcgSlug]} matches "${setQuery}". Try a shorter search or a set code like BS or LEA.`}
            />
          )}

          {sets.length > 0 && (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {sets.map((set) => (
                <li key={set.id}>
                  <SetTile set={set} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </PageShell>
  );
}

export default function DiscoverPage() {
  return (
    <Suspense
      fallback={
        <PageShell>
          <Skeleton className="h-9 w-48" />
          <Skeleton className="mt-8 h-11 w-full max-w-md rounded-full" />
        </PageShell>
      }
    >
      <DiscoverContent />
    </Suspense>
  );
}
