"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Crown, Play, ScanLine, Search, SearchX } from "lucide-react";
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
import { QuotaNotice } from "@/components/scan/QuotaNotice";
import { WebAdModal } from "@/components/scan/WebAdModal";
import { webAdTagUrl } from "@/lib/web-ad";
import { QUOTA_KEY } from "@/hooks/useQuota";
import { useQueryClient } from "@tanstack/react-query";
import { useQuota } from "@/hooks/useQuota";
import { getErrorMessage, getQuotaExceeded } from "@/lib/api-error";

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
  const { data: quota } = useQuota();
  const queryClient = useQueryClient();
  const [adOpen, setAdOpen] = useState(false);
  // Web ads exist only when an ad tag is configured, and while today's are not used up.
  const canWatchAd = Boolean(webAdTagUrl()) && (quota?.webRewardedAd.remainingToday ?? 0) > 0;
  const noneLeft = quota && !quota.premium && (quota.freeRemaining ?? 0) + quota.credits === 0 ? quota : null;
  // Out of scans: known from the count, or from the server refusing one. A result on screen stays visible first.
  const outOfScans = (createScan.isError ? getQuotaExceeded(createScan.error) : null) ?? noneLeft;
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

      <div className="mb-3">
        <QuotaNotice />
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

        {adOpen && outOfScans ? (
          <WebAdModal
            credits={outOfScans.webRewardedAd.credits}
            onClose={() => setAdOpen(false)}
            onEarned={() => {
              setAdOpen(false);
              createScan.reset();
              void queryClient.invalidateQueries({ queryKey: QUOTA_KEY });
            }}
          />
        ) : null}

        {outOfScans && !scan ? (
          <EmptyState
            icon={Crown}
            title={canWatchAd ? "Watch an ad to keep scanning" : "You've used your free scans"}
            description={
              canWatchAd
                ? `Each ad gives you ${outOfScans.webRewardedAd.credits} more scans. Searching for a card by name is always free.`
                : `Get a scan pack or go Premium to keep scanning here; searching by name is always free. On Android, an ad gives you ${outOfScans.rewardedAd.credits} more scans.`
            }
            action={
              canWatchAd ? (
                <Button variant="primary" size="lg" onClick={() => setAdOpen(true)}>
                  <Play className="h-[1.1rem] w-[1.1rem]" aria-hidden />
                  Watch an ad, get {outOfScans.webRewardedAd.credits} scans
                </Button>
              ) : (
                <Button variant="primary" size="lg" onClick={() => router.push("/premium")}>
                  <Crown className="h-[1.1rem] w-[1.1rem]" aria-hidden />
                  Get more scans
                </Button>
              )
            }
            secondaryAction={
              <>
                {canWatchAd && (
                  <Button variant="outline" size="lg" onClick={() => router.push("/premium")}>
                    <Crown className="h-[1.1rem] w-[1.1rem]" aria-hidden />
                    Buy scans or go Premium
                  </Button>
                )}
                <Button variant="outline" size="lg" onClick={enterManually}>
                  <Search className="h-[1.1rem] w-[1.1rem]" aria-hidden />
                  Find it by name
                </Button>
              </>
            }
          />
        ) : createScan.isError ? (
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
