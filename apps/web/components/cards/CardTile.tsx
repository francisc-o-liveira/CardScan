"use client";

import Link from "next/link";
import { TCG_COLORS } from "@cardscan/config";
import type { TcgSlug } from "@cardscan/types";
import { CardImage } from "./CardImage";
import { cn } from "@/lib/cn";

/**
 * Only the fields the tile actually draws. Declaring them structurally lets it
 * take a full catalog card as well as the narrower rows nested in other
 * responses (a set's `cards`, for instance) without a cast.
 */
export interface CardTileCard {
  id: string;
  name: string;
  collectorNumber: string;
  rarity: string | null;
  imageUrl: string | null;
  set?: { name: string } | null;
  tcg?: { slug: TcgSlug } | null;
}

interface CardTileProps {
  card: CardTileCard;
  /** Show which game this is. Off inside a single-game grid — it's redundant there. */
  showGame?: boolean;
  /**
   * Show the set name. Off on a set's own page, where repeating it under all
   * 252 cards is noise — and where `GET /sets/:id` doesn't nest it anyway.
   */
  showSet?: boolean;
  /** Off in dense grids where rarity would be a fourth line of small print. */
  showRarity?: boolean;
  /**
   * Copies owned. Future / Requires Backend Support — there is no collection
   * endpoint yet, so nothing passes this today. The slot exists so "do I own
   * this?" becomes visible the moment the API lands.
   */
  quantity?: number;
  /** Handle the press yourself (a picker, say) instead of linking to the card. */
  onClick?: () => void;
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
  showRarity = true,
  quantity,
  onClick,
  priority,
}: CardTileProps) {
  const slug = card.tcg?.slug;
  const accent = slug ? TCG_COLORS[slug] : undefined;
  const meta = [showSet ? card.set?.name : null, card.collectorNumber]
    .filter(Boolean)
    .join(" \u00B7 ");

  const content = (
    <>
      <div className="relative">
        <div className="overflow-hidden rounded-card shadow-card transition-transform duration-base ease-standard motion-safe:group-hover:-translate-y-1">
          <CardImage
            src={card.imageUrl}
            name={card.name}
            priority={priority}
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 16vw"
            testId="card-image"
            fallbackLabel="No image available"
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

        {quantity !== undefined && (
          <span
            className="absolute right-1.5 top-1.5 flex min-h-6 min-w-6 items-center justify-center rounded-full bg-success px-1.5 text-[0.6875rem] font-semibold text-base-100 shadow-sm"
            title={`${quantity} ${quantity === 1 ? "copy" : "copies"} in your collection`}
          >
            x{quantity}
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
        {meta && <p className="truncate text-[0.75rem] text-faint">{meta}</p>}
        {showRarity && card.rarity && (
          <p className="truncate text-[0.75rem] capitalize text-faint/80">{card.rarity}</p>
        )}
      </div>
    </>
  );

  const className =
    "group flex flex-col gap-2 rounded-card text-left focus-visible:outline-offset-4";

  return onClick ? (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  ) : (
    <Link href={`/cards/${card.id}`} className={className}>
      {content}
    </Link>
  );
}
