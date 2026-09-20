"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Active-filter chip. Always removable — a filter the user can see but can't
 * clear is how people get stranded in an empty result set.
 */
export function FilterChip({
  label,
  value,
  onRemove,
  accent,
}: {
  /** Which filter this is, e.g. "Game". Read out to screen readers. */
  label: string;
  /** The selected value, shown to the user. */
  value: string;
  onRemove: () => void;
  /** Optional hex accent, used for game chips. */
  accent?: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-hairline bg-base-200 py-1 pl-3 pr-1 text-meta"
      style={accent ? { borderColor: `${accent}40`, backgroundColor: `${accent}12` } : undefined}
    >
      <span className="font-medium" style={accent ? { color: accent } : undefined}>
        {value}
      </span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label} filter: ${value}`}
        className="flex h-6 w-6 items-center justify-center rounded-full text-muted transition-colors duration-fast hover:bg-base-300 hover:text-base-content"
      >
        <X className="h-3.5 w-3.5" aria-hidden />
      </button>
    </span>
  );
}

/** Non-removable selectable chip, for quick toggles inside the filter sheet. */
export function ToggleChip({
  children,
  selected,
  onClick,
  accent,
}: {
  children: React.ReactNode;
  selected: boolean;
  onClick: () => void;
  accent?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 text-meta font-medium transition-colors duration-fast",
        selected
          ? "border-primary/40 bg-primary/12 text-primary"
          : "border-hairline bg-base-200 text-muted hover:border-strong hover:text-base-content",
      )}
      style={
        selected && accent
          ? { borderColor: `${accent}55`, backgroundColor: `${accent}18`, color: accent }
          : undefined
      }
    >
      {children}
    </button>
  );
}
