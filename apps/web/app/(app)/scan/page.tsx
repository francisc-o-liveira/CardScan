"use client";

import { useState } from "react";
import Link from "next/link";
import { Camera, ChevronRight, SearchX } from "lucide-react";
import { LIVE_TCGS } from "@cardscan/config";
import { PageShell, PageHeader } from "@/components/layout/PageShell";
import { ScanFrame } from "@/components/scan/ScanFrame";
import { SearchField } from "@/components/ui/SearchField";
import { GameSwitcher, type GameFilter } from "@/components/ui/GameSwitcher";
import { CardImage } from "@/components/cards/CardImage";
import { GameBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useCards } from "@/hooks/useCatalog";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { CAPABILITIES } from "@/lib/features";
import type { TcgSlug } from "@cardscan/types";

/**
 * Identify a card.
 *
 * Camera recognition needs a /scans endpoint and a recognition model, neither
 * of which exists yet (Future / Requires Backend Support — the full capture →
 * confirm → next flow is specified in docs/design-system.md).
 *
 * So this screen ships the other half of the same job and ships it working:
 * type a name, see the real card with its artwork, open it. The destination —
 * "I found my card" — is identical, which means the flow, the copy and the
 * result layout are all already in place when the camera arrives.
 */
export default function ScanPage() {
  const [query, setQuery] = useState("");
  const [game, setGame] = useState<GameFilter>("all");

  const debounced = useDebouncedValue(query);
  const hasQuery = debounced.trim().length >= 2;

  const { data, isLoading, isFetching, isError, refetch } = useCards(
    {
      query: debounced.trim(),
      tcg: game === "all" ? undefined : game,
      limit: 8,
    },
    hasQuery,
  );

  const matches = data?.data ?? [];

  return (
    <PageShell width="narrow">
      <PageHeader
        title="Identify a card"
        description="Find any card in the catalog, or scan one with your camera once that ships."
      />

      <ScanFrame
        caption={
          CAPABILITIES.scanning
            ? "Position your card inside the frame"
            : "Camera scanning is in development"
        }
      >
        {!CAPABILITIES.scanning && (
          <div className="flex flex-col items-center gap-2 text-center">
            <Camera className="h-7 w-7 text-white/35" aria-hidden />
            <span className="text-meta text-white/45">Coming soon</span>
          </div>
        )}
      </ScanFrame>

      {/* The working path, given the same weight the camera will have. */}
      <section className="mt-8" aria-labelledby="find-by-name">
        <h2 id="find-by-name" className="mb-3 text-section font-semibold">
          Find it by name
        </h2>

        <SearchField
          size="lg"
          label="Find a card by name"
          placeholder="Type a card name, like Charizard"
          value={query}
          onValueChange={setQuery}
          isLoading={hasQuery && isFetching}
        />

        <div className="mt-3">
          <GameSwitcher value={game} onChange={setGame} games={LIVE_TCGS} />
        </div>

        <div className="mt-6">
          {!hasQuery && (
            <p className="text-meta text-faint">
              Start typing to search 130,000+ Pokémon and Magic cards.
            </p>
          )}

          {hasQuery && isLoading && (
            <ul className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <li key={i}>
                  <Skeleton className="h-[5.25rem] rounded-panel" />
                </li>
              ))}
            </ul>
          )}

          {hasQuery && isError && (
            <ErrorState
              title="We couldn't identify that card"
              description="The catalog didn't respond. Check your connection and try again."
              onRetry={() => refetch()}
            />
          )}

          {hasQuery && !isLoading && !isError && matches.length === 0 && (
            <EmptyState
              tone="inline"
              icon={SearchX}
              title="No card by that name"
              description="Try a shorter search — part of the name is enough, and spelling counts more than capitals."
            />
          )}

          {matches.length > 0 && (
            <ul className="flex flex-col gap-2">
              {matches.map((card) => (
                <li key={card.id}>
                  <Link
                    href={`/cards/${card.id}`}
                    className="group flex items-center gap-3.5 rounded-panel border border-hairline bg-base-200 p-3 shadow-sheen transition-colors duration-fast hover:border-strong hover:bg-base-300"
                  >
                    <div className="w-[3.25rem] shrink-0 overflow-hidden rounded-md shadow-sm">
                      <CardImage src={card.imageUrl} name={card.name} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body font-medium transition-colors duration-fast group-hover:text-primary">
                        {card.name}
                      </p>
                      <p className="mt-0.5 truncate text-meta text-faint">
                        {card.set?.name}
                        {card.collectorNumber && ` · #${card.collectorNumber}`}
                      </p>
                      {card.tcg?.slug && (
                        <span className="mt-1.5 inline-block">
                          <GameBadge tcg={card.tcg.slug as TcgSlug} size="sm" />
                        </span>
                      )}
                    </div>
                    <ChevronRight
                      className="h-4 w-4 shrink-0 text-faint transition-transform duration-fast group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </PageShell>
  );
}
