"use client";

import { useState } from "react";
import { useImageRetry } from "@/hooks/useImageRetry";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/cn";

interface CardImageProps {
  src: string | null;
  /** Card name — also the alt text, so it must be the real name, not "card image". */
  name: string;
  /** `eager` for above-the-fold hero art; everything in a grid stays lazy. */
  priority?: boolean;
  className?: string;
  sizes?: string;
  /** Test hook. The fallback gets `${testId}-fallback`. */
  testId?: string;
  /** Shown in place of the art when there is none. Defaults to the card name. */
  fallbackLabel?: string;
}

/**
 * Card artwork in a fixed 2.5:3.5 frame.
 *
 * Uses a plain <img> rather than next/image on purpose: the catalog is ~130k
 * cards served from TCGdex/Scryfall CDNs at appropriate sizes already, and
 * routing all of it through the Next optimizer would add cost and latency for
 * no visual gain.
 */
export function CardImage({
  src,
  name,
  priority,
  className,
  sizes,
  testId,
  fallbackLabel,
}: CardImageProps) {
  const [loaded, setLoaded] = useState(false);
  const { attempt, failed, onError } = useImageRetry(src);
  const state = !src || failed ? "error" : loaded ? "loaded" : "loading";

  return (
    <div className={cn("card-frame relative isolate bg-base-300", className)}>
      {state === "loading" && <div className="skeleton-shimmer absolute inset-0" aria-hidden />}

      {src && state !== "error" && (
        <img
          key={attempt}
          src={src}
          alt={name}
          data-testid={testId}
          sizes={sizes}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={onError}
          className={cn(
            "h-full w-full object-cover transition-opacity duration-base ease-standard",
            state === "loaded" ? "opacity-100" : "opacity-0",
          )}
        />
      )}

      {state === "error" && (
        // Named fallback: the user still learns which card this is.
        <div
          className="flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-center"
          data-testid={testId ? `${testId}-fallback` : undefined}
        >
          <ImageOff className="h-5 w-5 text-faint" aria-hidden />
          <span className="line-clamp-3 text-[0.6875rem] leading-tight text-faint">
            {fallbackLabel ?? name}
          </span>
        </div>
      )}
    </div>
  );
}
