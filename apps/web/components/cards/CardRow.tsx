import { ChevronRight } from "lucide-react";
import type { CatalogCard, TcgSlug } from "@cardscan/types";
import { CardImage } from "@/components/cards/CardImage";
import { GameBadge } from "@/components/ui/Badge";

/** One card as a tappable row: thumbnail, name, set and number, game. Used by search and scan results. */
export function CardRow({ card, onSelect }: { card: CatalogCard; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex w-full items-center gap-3.5 rounded-panel border border-hairline bg-base-200 p-3 text-left shadow-sheen transition-colors duration-fast hover:border-strong hover:bg-base-300"
    >
      <div className="w-[3.25rem] shrink-0 overflow-hidden rounded-md shadow-sm">
        <CardImage src={card.imageUrl} name={card.name} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-body font-medium transition-colors duration-fast group-hover:text-primary">
          {card.name}
        </p>
        <p className="mt-0.5 truncate text-meta text-faint">
          {card.set?.name}
          {card.collectorNumber && ` · #${card.collectorNumber}`}
        </p>
        {card.tcg?.slug && (
          <span className="mt-1.5 inline-block">
            <GameBadge tcg={card.tcg.slug as TcgSlug} size="sm" />
          </span>
        )}
      </div>
      <ChevronRight
        className="h-4 w-4 shrink-0 text-faint transition-transform duration-fast group-hover:translate-x-0.5"
        aria-hidden
      />
    </button>
  );
}
