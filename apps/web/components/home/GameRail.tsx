"use client";

import type { TcgSlug } from "@cardscan/types";
import { TCG_LABELS } from "@cardscan/config";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { CardRail } from "@/components/cards/CardRail";
import { useLatestSetCards } from "@/hooks/useLatestSetCards";

/** "New in {game}": the newest set of one game, as a rail. Empty games render nothing. */
export function GameRail({ tcg }: { tcg: TcgSlug }) {
  const latest = useLatestSetCards(tcg, 12);
  if (!latest.isLoading && latest.cards.length === 0) return null;

  return (
    <section aria-labelledby={`new-${tcg}`}>
      <SectionHeader
        title={`New in ${TCG_LABELS[tcg]}`}
        subtitle={latest.set?.name ?? "Latest set"}
        href={latest.set ? `/discover?game=${tcg}&set=${latest.set.id}` : `/discover?game=${tcg}`}
      />
      <CardRail cards={latest.cards} isLoading={latest.isLoading} />
    </section>
  );
}
