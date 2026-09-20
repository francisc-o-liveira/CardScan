"use client";

import { useState } from "react";
import { Layers } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * A set's publisher symbol, with a fallback.
 *
 * Not every symbol URL the catalog sync produces resolves — some TCGdex
 * `/univ/.../symbol.webp` paths return 400 — and a bare <img> renders the
 * browser's broken-image glyph, which makes the whole tile look unfinished.
 */
export function SetSymbol({
  src,
  accent,
  size = "md",
  className,
}: {
  src: string | null;
  /** Game accent, used to tint the placeholder tile. */
  accent?: string;
  size?: "md" | "lg";
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  const box = size === "lg" ? "h-16 w-16 rounded-2xl" : "h-11 w-11 rounded-xl";
  const glyph = size === "lg" ? "h-9 w-9" : "h-6 w-6";
  const icon = size === "lg" ? "h-7 w-7" : "h-5 w-5";

  return (
    <span
      className={cn("flex shrink-0 items-center justify-center bg-base-300", box, className)}
      style={accent && !showImage ? { backgroundColor: `${accent}18` } : undefined}
    >
      {showImage ? (
        <img
          src={src!}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className={cn("object-contain", glyph)}
        />
      ) : (
        <Layers className={cn(icon, "text-faint")} style={accent ? { color: accent } : undefined} aria-hidden />
      )}
    </span>
  );
}
