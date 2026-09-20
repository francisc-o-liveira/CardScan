"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./Button";

/**
 * Deliberately a simple prev/next with position, not a numbered page strip:
 * Magic alone runs to thousands of pages, where page numbers are noise. The
 * count tells the user where they are; search and filters are how they get
 * somewhere specific.
 */
export function Pagination({
  page,
  totalPages,
  total,
  onPageChange,
  isFetching,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  isFetching?: boolean;
}) {
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-5"
    >
      <p className="text-meta text-muted" aria-live="polite">
        Page <span className="font-medium text-base-content tabular-nums">{page}</span> of{" "}
        <span className="tabular-nums">{totalPages.toLocaleString()}</span>
        <span className="text-faint"> · {total.toLocaleString()} cards</span>
      </p>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={page <= 1 || isFetching}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Previous
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={page >= totalPages || isFetching}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </nav>
  );
}
