"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, ScanLine, Search, SearchX } from "lucide-react";
import { LIVE_TCGS } from "@cardscan/config";
import type { CatalogCard, Scan } from "@cardscan/types";
import { PageShell, PageHeader } from "@/components/layout/PageShell";
import { Viewfinder } from "@/components/scan/Viewfinder";
import { ScanResult } from "@/components/scan/ScanResult";
import { SearchField } from "@/components/ui/SearchField";
import { GameSwitcher, type GameFilter } from "@/components/ui/GameSwitcher";
import { CardRow } from "@/components/cards/CardRow";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useCards } from "@/hooks/useCatalog";
import { useCreateScan } from "@/hooks/useScans";
import { useAddToCollection } from "@/hooks/useCollection";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { getErrorMessage } from "@/lib/api-error";

/**
 * Identify a card: point the camera at it, or find it by name. Batch-friendly, as docs/design-system.md
 * asks: scan, add to the collection, and the viewfinder re-arms on the same screen for the next card.
 * Every card added from a scan (including one picked by name after "Enter manually") also confirms the
 * scan, which records the correction as recognition feedback.
 */
export default function ScanPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [game, setGame] = useState<GameFilter>("all");
  const [scan, setScan] = useState<Scan | null>(null);
  /** The scan waiting for the user to find its card by name, after "Enter manually". */
  const [manualFor, setManualFor] = useState<string | null>(null);
  const [recorded, setRecorded] = useState<CatalogCard | null>(null);
  const searchInput = useRef<HTMLInputElement>(null);

  const createScan = useCreateScan();
  const addToCollection = useAddToCollection();

  const debounced = useDebouncedValue(query);
  const hasQuery = debounced.trim().length >= 2;
  const { data, isLoading, isFetching, isError, refetch } = useCards(
    { query: debounced.trim(), tcg: game === "all" ? undefined : game, limit: 8 },
    hasQuery,
  );
  const matches = data?.data ?? [];

  const rearm = () => {
    setScan(null);
    setManualFor(null);
    createScan.reset();
  };

  const capture = (photo: Blob) => {
    setRecorded(null);
    rearm();
    createScan.mutate({ photo, tcg: game === "all" ? undefined : game }, { onSuccess: setScan });
  };

  const confirm = (card: CatalogCard) => {
    const scanId = scan?.id ?? manualFor;
    if (!scanId) {
      router.push(`/cards/${card.id}`);
      return;
    }
    // Adds the card and confirms the scan in one request; the viewfinder then re-arms for the next card.
    addToCollection.mutate(
      { cardId: card.id, scanId },
      {
        onSuccess: () => {
          setRecorded(card);
          setQuery("");
          rearm();
        },
      },
    );
  };

  const enterManually = () => {
    setManualFor(scan?.id ?? null);
    setScan(null);
    createScan.reset();
    searchInput.current?.focus();
  };

  return (
    <PageShell width="narrow">
      <PageHeader title="Identify a card" description="Point your camera at a card, or find it by name." />

      {/* Which game the card is from narrows the search of the camera scan as well as the name search below. */}
      <div className="mb-3">
        <GameSwitcher value={game} onChange={setGame} games={LIVE_TCGS} />
      </div>

      <div className="flex flex-col gap-3">
        {recorded && (
          <div className="flex items-center gap-2.5 rounded-panel border border-success/25 bg-success/10 px-4 py-3">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-hidden />
            <p className="min-w-0 flex-1 truncate text-body font-medium">{recorded.name} added to your collection</p>
            <Link href={`/cards/${recorded.id}`} className="shrink-0 text-meta font-semibold text-primary hover:underline">
              View card
            </Link>
          </div>
        )}

        {createScan.isError ? (
          <EmptyState
            icon={AlertCircle}
            title="We couldn't identify that card"
            description={getErrorMessage(createScan.error, "Try better lighting, or the card fully inside the frame.")}
            action={
              <Button variant="primary" size="lg" onClick={rearm}>
                <ScanLine className="h-[1.1rem] w-[1.1rem]" aria-hidden />
                Try again
              </Button>
            }
            secondaryAction={
              <Button variant="outline" size="lg" onClick={enterManually}>
                <Search className="h-[1.1rem] w-[1.1rem]" aria-hidden />
                Enter manually
              </Button>
            }
          />
        ) : scan ? (
          <ScanResult
            scan={scan}
            confirming={addToCollection.isPending}
            onConfirm={confirm}
            onRetry={rearm}
            onEnterManually={enterManually}
          />
        ) : (
          <Viewfinder busy={createScan.isPending} onCapture={capture} />
        )}
      </div>

      <section className="mt-8" aria-labelledby="find-by-name">
        <h2 id="find-by-name" className="mb-3 text-section font-semibold">
          Find it by name
        </h2>

        {manualFor && (
          <div className="mb-3 flex items-center gap-2 rounded-panel bg-primary/10 px-4 py-3">
            <p className="flex-1 text-meta">Search for the card you scanned, then select it.</p>
            <button
              type="button"
              onClick={() => setManualFor(null)}
              className="text-meta font-semibold text-primary hover:underline"
            >
              Cancel
            </button>
          </div>
        )}

        <SearchField
          ref={searchInput}
          size="lg"
          label="Find a card by name"
          placeholder="Type a card name, like Charizard"
          value={query}
          onValueChange={setQuery}
          isLoading={hasQuery && isFetching}
        />

        <div className="mt-6">
          {!hasQuery && <p className="text-meta text-faint">Start typing to search 212,000+ cards across eight games.</p>}

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
                  <CardRow card={card} onSelect={() => confirm(card)} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </PageShell>
  );
}
