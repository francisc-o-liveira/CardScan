"use client";

import { useState } from "react";
import { HelpCircle, Plus, ScanLine, Search } from "lucide-react";
import { SCAN_CONFIDENT } from "@cardscan/config";
import type { CatalogCard, Scan, TcgSlug } from "@cardscan/types";
import { Button } from "@/components/ui/Button";
import { GameBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardImage } from "@/components/cards/CardImage";
import { CardRow } from "@/components/cards/CardRow";

interface ScanResultProps {
  scan: Scan;
  confirming: boolean;
  onConfirm: (card: CatalogCard) => void;
  onRetry: () => void;
  onEnterManually: () => void;
}

/**
 * What the scan found, per the flow in docs/design-system.md: one card to confirm when CardScan is sure,
 * the candidate list when it is not, and a way out ("Enter manually") in every case.
 */
export function ScanResult({ scan, confirming, onConfirm, onRetry, onEnterManually }: ScanResultProps) {
  const [showAll, setShowAll] = useState(false);
  const [best, ...others] = scan.candidates;

  if (!best) {
    return (
      <EmptyState
        icon={HelpCircle}
        title="We couldn't identify that card"
        description="Try better lighting, or the card fully inside the frame."
        action={
          <Button variant="primary" size="lg" onClick={onRetry}>
            <ScanLine className="h-[1.1rem] w-[1.1rem]" aria-hidden />
            Try again
          </Button>
        }
        secondaryAction={
          <Button variant="outline" size="lg" onClick={onEnterManually}>
            <Search className="h-[1.1rem] w-[1.1rem]" aria-hidden />
            Enter manually
          </Button>
        }
      />
    );
  }

  const confident = (scan.confidence ?? 0) >= SCAN_CONFIDENT;

  if (confident && !showAll) {
    return (
      <div className="rounded-hero border border-hairline bg-base-200 p-5 text-center">
        <div className="mx-auto w-full max-w-[12rem] overflow-hidden rounded-card shadow-card">
          <CardImage src={best.card.imageUrl} name={best.card.name} priority />
        </div>
        <h2 className="mt-4 text-title font-semibold tracking-tight">{best.card.name}</h2>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-meta text-muted">
          {best.card.tcg?.slug && <GameBadge tcg={best.card.tcg.slug as TcgSlug} size="sm" />}
          <span>
            {best.card.set?.name}
            {best.card.collectorNumber && ` · #${best.card.collectorNumber}`}
          </span>
        </div>
        <p className="mt-2 text-meta text-faint">{Math.round((scan.confidence ?? 0) * 100)}% sure</p>
        <div className="mt-5 flex flex-col gap-2.5">
          <Button variant="primary" size="lg" block isLoading={confirming} onClick={() => onConfirm(best.card)}>
            <Plus className="h-[1.1rem] w-[1.1rem]" aria-hidden />
            Add to collection
          </Button>
          <Button variant="outline" size="lg" block onClick={() => setShowAll(true)}>
            Not this card
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-hero border border-hairline bg-base-200 p-5">
      <h2 className="text-section font-semibold">Which card is it?</h2>
      <p className="mt-1 text-meta text-muted">
        {confident ? "Pick the card you scanned to add it." : "CardScan isn't sure. Pick the card you scanned to add it."}
      </p>
      <ul className="mt-4 flex flex-col gap-2">
        {(showAll ? others : scan.candidates).map(({ card }) => (
          <li key={card.id}>
            <CardRow card={card} onSelect={() => onConfirm(card)} />
          </li>
        ))}
      </ul>
      <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
        <Button variant="outline" size="lg" block onClick={onEnterManually}>
          <Search className="h-[1.1rem] w-[1.1rem]" aria-hidden />
          None of these — enter manually
        </Button>
        <Button variant="ghost" size="lg" block onClick={onRetry}>
          <ScanLine className="h-[1.1rem] w-[1.1rem]" aria-hidden />
          Scan again
        </Button>
      </div>
    </div>
  );
}
