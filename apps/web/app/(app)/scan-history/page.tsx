"use client";

import Link from "next/link";
import { ChevronRight, History, ScanLine } from "lucide-react";
import type { Scan } from "@cardscan/types";
import { PageShell, PageHeader } from "@/components/layout/PageShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useScanHistory } from "@/hooks/useScans";
import { formatDateTime } from "@/lib/format";

function ScanRow({ scan }: { scan: Scan }) {
  const card = scan.selectedCard ?? scan.candidates[0]?.card ?? null;
  const content = (
    <>
      {/* The user's own photo, so they can tell which scan is which. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={scan.imageUrl}
        alt=""
        loading="lazy"
        className="aspect-[63/88] w-12 shrink-0 rounded-md bg-base-300 object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-body font-medium">{card?.name ?? "Not identified"}</p>
        <p className="mt-0.5 truncate text-meta text-faint">
          {card?.set?.name ? `${card.set.name} · ` : ""}
          {formatDateTime(scan.createdAt)}
        </p>
        <span className="mt-1.5 inline-block">
          <Badge tone={scan.selectedCard ? "success" : "neutral"}>
            {scan.selectedCard ? "Confirmed" : "Not confirmed"}
          </Badge>
        </span>
      </div>
      {card && <ChevronRight className="h-4 w-4 shrink-0 text-faint" aria-hidden />}
    </>
  );
  const className = "flex items-center gap-3.5 rounded-panel border border-hairline bg-base-200 p-3 shadow-sheen";

  return card ? (
    <Link href={`/cards/${card.id}`} className={`${className} transition-colors duration-fast hover:bg-base-300`}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}

/** Every card the user has scanned, newest first, with what it was confirmed as. */
export default function ScanHistoryPage() {
  const { data: scans, isLoading, isError, refetch } = useScanHistory();

  return (
    <PageShell width="narrow">
      <PageHeader title="Scan history" />

      {isLoading ? (
        <ul className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i}>
              <Skeleton className="h-[5.5rem] rounded-panel" />
            </li>
          ))}
        </ul>
      ) : isError ? (
        <ErrorState title="We couldn't load your scans" onRetry={() => refetch()} />
      ) : !scans?.length ? (
        <EmptyState
          icon={History}
          title="No scans yet"
          description="Every card you scan is listed here with what CardScan identified it as, so you can correct anything it got wrong."
          action={
            <ButtonLink href="/scan" variant="primary" size="lg">
              <ScanLine className="h-[1.1rem] w-[1.1rem]" aria-hidden />
              Identify a card
            </ButtonLink>
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {scans.map((scan) => (
            <li key={scan.id}>
              <ScanRow scan={scan} />
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
