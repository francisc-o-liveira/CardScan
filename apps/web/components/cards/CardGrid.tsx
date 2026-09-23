import type { CatalogCard } from "@/services/catalog";
import { CardTile } from "./CardTile";

/**
 * Responsive card grid: 2 columns on phones up to 6 on large desktops.
 * Column counts come from the tile staying legible (~150–210px wide), not from
 * filling the viewport — cards below ~140px lose their artwork's readability.
 */
export function CardGrid({
  cards,
  showGame,
  showSet,
  quantities,
}: {
  cards: CatalogCard[];
  showGame?: boolean;
  showSet?: boolean;
  /** Copies owned per card id, shown as a badge on the tile. */
  quantities?: Record<string, number>;
}) {
  return (
    <div
      data-testid="card-grid"
      className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
    >
      {cards.map((card, index) => (
        <CardTile
          key={card.id}
          card={card}
          showGame={showGame}
          showSet={showSet}
          quantity={quantities?.[card.id]}
          priority={index < 6}
        />
      ))}
    </div>
  );
}
