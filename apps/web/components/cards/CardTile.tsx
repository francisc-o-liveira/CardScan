"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { TCG_COLORS } from "@cardscan/config";
import type { TcgSlug } from "@cardscan/types";
import type { CatalogCard } from "@/services/catalog";
import { CardImage } from "./CardImage";
import { cn } from "@/lib/cn";

interface CardTileProps {
  card: CatalogCard;
  /** Show which game this is. Off inside a single-game grid — it's redundant there. */
  showGame?: boolean;
  /**
   * Show the set name. Off on a set's own page, where repeating it under all
   * 252 cards is noise — and where `GET /sets/:id` doesn't nest it anyway.
   */
  showSet?: boolean;
  /**
   * Copies owned. Future / Requires Backend Support — there is no collection
   * endpoint yet, so nothing passes this today. The slot exists so "do I own
   * this?" becomes visible the moment the API lands.
   */
  ownedQuantity?: number;
  priority?: boolean;
}

/**
 * The card grid's atom, and the app's most repeated component.
 *
 * Artwork gets ~85% of the tile; text is compact metadata beneath it. Only
 * three facts show at rest (name, set, number) — everything else lives on the
 * detail screen, per the progressive-disclosure rule.
 */
export function CardTile({
  card,
  showGame,
  showSet = true,
  ownedQuantity,
  priority,
}: CardTileProps) {
  const slug = card.tcg?.slug as TcgSlug | undefined;
  const accent = slug ? TCG_COLORS[slug] : undefined;

  return (
    <Link
      href={`/cards/${card.id}`}
      className="group flex flex-col gap-2 rounded-card focus-visible:outline-offset-4"
    >
      <div className="relative">
        <div className="overflow-hidden rounded-card shadow-card transition-transform duration-base ease-standard motion-safe:group-hover:-translate-y-1">
          <CardImage
            src={card.imageUrl}
            name={card.name}
            priority={priority}
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 16vw"
          />
        </div>

        {/* Game accent: a hairline at the foot of the art, not a coloured chrome. */}
        {showGame && accent && (
          <span
            className="pointer-events-none absolute inset-x-2 bottom-0 h-0.5 rounded-full opacity-80"
            style={{ backgroundColor: accent }}
            aria-hidden
          />
        )}

        {typeof ownedQuantity === "number" && ownedQuantity > 0 && (
          <span
            className="absolute right-1.5 top-1.5 flex min-h-6 min-w-6 items-center gap-0.5 rounded-full bg-success px-1.5 text-[0.6875rem] font-semibold text-base-100 shadow-sm"
            title={`${ownedQuantity} ${ownedQuantity === 1 ? "copy" : "copies"} in your collection`}
          >
            <Check className="h-3 w-3" aria-hidden />
            {ownedQuantity > 1 && ownedQuantity}
            <span className="sr-only">
              {ownedQuantity} {ownedQuantity === 1 ? "copy" : "copies"} owned
            </span>
          </span>
        )}
      </div>

      <div className="min-w-0 px-0.5">
        <p
          className={cn(
            "truncate text-meta font-medium text-base-content transition-colors duration-fast",
            "group-hover:text-primary",
          )}
          title={card.name}
        >
          {card.name}
        </p>
        <p className="truncate text-[0.75rem] text-faint">
          {[showSet ? card.set?.name : null, card.collectorNumber && `#${card.collectorNumber}`]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
    </Link>
  );
}
