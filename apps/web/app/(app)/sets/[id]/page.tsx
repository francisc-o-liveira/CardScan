"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, SearchX } from "lucide-react";
import type { TcgSlug } from "@cardscan/types";
import { PageShell } from "@/components/layout/PageShell";
import { CardGrid } from "@/components/cards/CardGrid";
import { useOwned } from "@/hooks/useCollection";
import { SetSymbol } from "@/components/cards/SetSymbol";
import { GameBadge } from "@/components/ui/Badge";
import { SearchField } from "@/components/ui/SearchField";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton, SkeletonCardGrid } from "@/components/ui/Skeleton";
import { ButtonLink } from "@/components/ui/Button";
import { useSet } from "@/hooks/useCatalog";
import { formatLongDate } from "@/lib/format";

const PAGE_SIZE = 60;

/**
 * One set, with its cards.
 *
 * `GET /sets/:id` returns the whole set in a single response, so filtering and
 * paging happen in the browser — instant, and no request per page.
 */
export default function SetDetailPage() {
  const params = useParams<{ id: string }>();
  const setId = params?.id;
  const { data: set, isLoading, isError, refetch } = useSet(setId);

  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const cards = set?.cards ?? [];
    const needle = query.trim().toLowerCase();
    if (!needle) return cards;
    return cards.filter(
      (card) =>
        card.name.toLowerCase().includes(needle) ||
        card.collectorNumber.toLowerCase().includes(needle),
    );
  }, [set?.cards, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const owned = useOwned(visible.map((card) => card.id));

  const onQueryChange = (value: string) => {
    setQuery(value);
    setPage(1);
  };

  if (isError) {
    return (
      <PageShell>
        <ErrorState
          title="We couldn't load that set"
          onRetry={() => refetch()}
          secondaryAction={<ButtonLink href="/discover">Back to Discover</ButtonLink>}
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <Link
        href={set?.tcg?.slug ? `/discover?game=${set.tcg.slug}` : "/discover"}
        className="mb-5 inline-flex min-h-9 items-center gap-1.5 text-meta font-medium text-muted transition-colors duration-fast hover:text-base-content"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        All sets
      </Link>

      {isLoading ? (
        <>
          <div className="mb-8 flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-2xl" />
            <div className="flex-1">
              <Skeleton className="h-7 w-64" />
              <Skeleton className="mt-2 h-4 w-40" />
            </div>
          </div>
          <SkeletonCardGrid count={18} />
        </>
      ) : set ? (
        <>
          <header className="mb-8 flex flex-wrap items-center gap-4">
            <SetSymbol
              src={set.symbolUrl}
              size="lg"
              className="border border-hairline !bg-base-200"
            />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {set.tcg?.slug && <GameBadge tcg={set.tcg.slug as TcgSlug} size="sm" />}
                <span className="text-meta font-medium uppercase tracking-wide text-faint">
                  {set.code}
                </span>
              </div>
              <h1 className="mt-1.5 text-title font-semibold tracking-tight">{set.name}</h1>
              <p className="mt-1 text-meta text-muted">
                {set.cards.length.toLocaleString()} cards
                {formatLongDate(set.releaseDate) &&
                  ` · Released ${formatLongDate(set.releaseDate)}`}
              </p>
            </div>
          </header>

          <SearchField
            label={`Search cards in ${set.name}`}
            placeholder="Search this set by name or number"
            value={query}
            onValueChange={onQueryChange}
            className="mb-6 max-w-md"
          />

          {visible.length > 0 ? (
            <>
              <CardGrid cards={visible} showSet={false} quantities={owned} />
              <div className="mt-8">
                <Pagination
                  page={safePage}
                  totalPages={totalPages}
                  total={filtered.length}
                  onPageChange={(next) => {
                    setPage(next);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                />
              </div>
            </>
          ) : (
            <EmptyState
              icon={SearchX}
              title="No cards match that"
              description={`Nothing in ${set.name} matches "${query}". Try a partial name, or a collector number like 4 or 025.`}
            />
          )}
        </>
      ) : null}
    </PageShell>
  );
}
