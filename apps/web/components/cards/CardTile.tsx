"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";
import type { CatalogCard } from "@cardscan/types";

interface CardTileProps {
  card: CatalogCard;
  quantity?: number;
  showSet?: boolean;
  showRarity?: boolean;
  onClick?: () => void;
}

/** Shared card tile — used by the card database now, and by collection/wishlist/scan results later. */
export function CardTile({ card, quantity, showSet = true, showRarity = true, onClick }: CardTileProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(card.imageUrl) && !imageFailed;

  const content = (
    <>
      <div className="relative aspect-[5/7] w-full overflow-hidden rounded-lg bg-base-300/60">
        {showImage ? (
          // Plain <img>: card images come from several external hosts and our own /assets route.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.imageUrl as string}
            alt={card.name}
            loading="lazy"
            className="h-full w-full object-contain"
            onError={() => setImageFailed(true)}
            data-testid="card-image"
          />
        ) : (
          <div
            className="flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-center text-base-content/40"
            data-testid="card-image-fallback"
          >
            <ImageOff className="h-6 w-6" />
            <span className="text-xs">No image available</span>
          </div>
        )}
        {quantity !== undefined && (
          <span className="badge badge-primary absolute right-2 top-2">x{quantity}</span>
        )}
      </div>
      <div className="mt-2 min-w-0 text-left">
        <p className="truncate text-sm font-medium" title={card.name}>
          {card.name}
        </p>
        {showSet && (
          <p className="truncate text-xs text-base-content/60" title={card.set.name}>
            {card.set.name} · {card.collectorNumber}
          </p>
        )}
        {showRarity && card.rarity && (
          <p className="truncate text-xs capitalize text-base-content/50">{card.rarity}</p>
        )}
      </div>
    </>
  );

  const className =
    "block w-full rounded-xl border border-transparent p-2 transition-colors hover:border-base-300 hover:bg-base-200/60";

  return onClick ? (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  ) : (
    <div className={className}>{content}</div>
  );
}
