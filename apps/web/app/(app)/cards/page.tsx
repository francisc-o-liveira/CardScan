"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Database, Search } from "lucide-react";
import { useCards, useSets, useTcgs } from "@/hooks/useCatalog";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { CardTile } from "@/components/cards/CardTile";
import { EmptyState } from "@/components/ui/EmptyState";

const PAGE_SIZE = 24;

export default function CardDatabasePage() {
  const [search, setSearch] = useState("");
  const [tcg, setTcg] = useState("");
  const [setId, setSetId] = useState("");
  const [page, setPage] = useState(1);

  const query = useDebouncedValue(search.trim(), 300);
  const tcgs = useTcgs();
  const sets = useSets(tcg || undefined);
  const cards = useCards({
    tcg: tcg || undefined,
    setId: setId || undefined,
    query: query || undefined,
    page,
    limit: PAGE_SIZE,
  });

  const pagination = cards.data?.pagination;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Card Database</h1>
        <p className="mt-1 text-sm text-base-content/60">
          {pagination ? `${pagination.total.toLocaleString()} cards` : "Search every card in the catalog."}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_200px_240px]">
        <label className="input input-bordered flex items-center gap-2">
          <Search className="h-4 w-4 shrink-0 opacity-60" />
          <input
            type="search"
            className="grow"
            placeholder="Search cards by name..."
            aria-label="Search cards"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </label>

        <select
          className="select select-bordered"
          aria-label="Filter by TCG"
          value={tcg}
          onChange={(event) => {
            setTcg(event.target.value);
            setSetId("");
            setPage(1);
          }}
        >
          <option value="">All TCGs</option>
          {tcgs.data?.map((item) => (
            <option key={item.id} value={item.slug}>
              {item.name}
            </option>
          ))}
        </select>

        <select
          className="select select-bordered"
          aria-label="Filter by set"
          value={setId}
          disabled={!tcg}
          onChange={(event) => {
            setSetId(event.target.value);
            setPage(1);
          }}
        >
          <option value="">{tcg ? "All sets" : "Select a TCG first"}</option>
          {sets.data?.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>

      {cards.isError ? (
        <div role="alert" className="alert alert-error">
          <span>Couldn&apos;t load cards. {cards.error instanceof Error ? cards.error.message : ""}</span>
          <button type="button" className="btn btn-sm" onClick={() => cards.refetch()}>
            Try again
          </button>
        </div>
      ) : cards.isPending ? (
        <div
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
          aria-busy="true"
          aria-label="Loading cards"
        >
          {Array.from({ length: PAGE_SIZE }, (_, index) => (
            <div key={index} className="p-2">
              <div className="skeleton aspect-[5/7] w-full" />
              <div className="skeleton mt-2 h-4 w-3/4" />
              <div className="skeleton mt-1 h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : cards.data.data.length === 0 ? (
        <EmptyState
          icon={Database}
          title="No cards found"
          description="Try a different name, or clear the TCG and set filters."
        />
      ) : (
        <>
          <ul
            className={`grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 ${
              cards.isPlaceholderData ? "opacity-60" : ""
            }`}
            aria-label="Cards"
          >
            {cards.data.data.map((card) => (
              <li key={card.id}>
                <CardTile card={card} />
              </li>
            ))}
          </ul>

          {pagination && (
            <nav className="flex items-center justify-center gap-4" aria-label="Pagination">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={pagination.page <= 1}
                onClick={() => setPage((current) => current - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <span className="text-sm text-base-content/60">
                Page {pagination.page} of {pagination.totalPages.toLocaleString()}
              </span>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
