"use client";

import { ArrowRight } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { PageShell } from "@/components/layout/PageShell";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { CardRail } from "@/components/cards/CardRail";
import { CollectionHero, type CollectionSummary } from "@/components/home/CollectionHero";
import { QuickActions } from "@/components/home/QuickActions";
import { GamesGrid } from "@/components/home/GamesGrid";
import { useLatestSetCards } from "@/hooks/useLatestSetCards";
import { useCollectionSummary } from "@/hooks/useCollection";
import { CAPABILITIES } from "@/lib/features";

/** Shown until the totals load, and on error: the hero's empty state, never invented figures. */
const EMPTY_SUMMARY: CollectionSummary = { totalCards: 0, perGame: {} };

export default function HomePage() {
  const { user } = useAuth();
  const summary = useCollectionSummary();
  const pokemon = useLatestSetCards("pokemon", 12);
  const magic = useLatestSetCards("magic", 12);

  return (
    <PageShell>
      <div className="flex flex-col gap-10">
        <CollectionHero username={user?.username ?? "collector"} summary={summary.data ?? EMPTY_SUMMARY} />

        <section aria-labelledby="quick-actions">
          <h2 id="quick-actions" className="sr-only">
            Quick actions
          </h2>
          <QuickActions />
        </section>

        {/* Real catalog data, not a placeholder rail — the newest set of each
            game with an imported catalog. */}
        <section aria-labelledby="new-pokemon">
          <SectionHeader
            title="New in Pokémon"
            subtitle={pokemon.set?.name ?? "Latest set"}
            href={pokemon.set ? `/discover?game=pokemon&set=${pokemon.set.id}` : "/discover?game=pokemon"}
          />
          <CardRail cards={pokemon.cards} isLoading={pokemon.isLoading} />
        </section>

        <section aria-labelledby="new-magic">
          <SectionHeader
            title="New in Magic"
            subtitle={magic.set?.name ?? "Latest set"}
            href={magic.set ? `/discover?game=magic&set=${magic.set.id}` : "/discover?game=magic"}
          />
          <CardRail cards={magic.cards} isLoading={magic.isLoading} />
        </section>

        <section aria-labelledby="games">
          <SectionHeader
            title="Your games"
            subtitle="Pokémon and Magic catalogs are imported and searchable today."
          />
          <div id="games">
            <GamesGrid />
          </div>
        </section>

        {/* Honest about what is not built, with a next step that is. */}
        {!CAPABILITIES.scanning && (
          <section className="flex flex-col gap-4 rounded-panel border border-hairline bg-base-200 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-body font-medium">Camera scanning is in development</h2>
              <p className="mt-1 text-meta text-muted">
                Until it ships you can find any card by name, set or number and add it by hand.
              </p>
            </div>
            <a
              href="/search"
              className="flex shrink-0 items-center gap-1.5 text-meta font-medium text-primary hover:text-primary/80"
            >
              Search the catalog
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </a>
          </section>
        )}
      </div>
    </PageShell>
  );
}
