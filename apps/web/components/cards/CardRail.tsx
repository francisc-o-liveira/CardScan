import type { CatalogCard } from "@/services/catalog";
import { CardTile } from "./CardTile";
import { SkeletonCardTile } from "@/components/ui/Skeleton";

/**
 * Horizontal, snap-scrolling card row for home-screen sections. Keeps a
 * section to one screen of height while still showing artwork at full size.
 */
export function CardRail({
  cards,
  isLoading,
  showGame,
  skeletonCount = 6,
}: {
  cards: CatalogCard[];
  isLoading?: boolean;
  showGame?: boolean;
  skeletonCount?: number;
}) {
  return (
    <div className="scrollbar-none snap-row -mx-4 flex gap-4 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
      {isLoading
        ? Array.from({ length: skeletonCount }).map((_, i) => (
            <div key={i} className="w-[7.5rem] shrink-0 sm:w-[9rem]">
              <SkeletonCardTile />
            </div>
          ))
        : cards.map((card) => (
            <div key={card.id} className="w-[7.5rem] shrink-0 sm:w-[9rem]">
              <CardTile card={card} showGame={showGame} />
            </div>
          ))}
    </div>
  );
}
