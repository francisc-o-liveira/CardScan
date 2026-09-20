"use client";

import { Swords, Compass } from "lucide-react";
import { PageShell, PageHeader } from "@/components/layout/PageShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";

/**
 * Future / Requires Backend Support: Deck tables exist in the schema, but deck
 * building is a later phase and has no API.
 */
export default function DecksPage() {
  return (
    <PageShell width="narrow">
      <PageHeader title="Decks" />
      <EmptyState
        icon={Swords}
        title="No decks yet"
        description="Deck building lets you group cards from your collection into lists you can play or trade from."
        action={
          <ButtonLink href="/discover" variant="outline" size="lg">
            <Compass className="h-[1.1rem] w-[1.1rem]" aria-hidden />
            Browse the catalog
          </ButtonLink>
        }
      />
      <p className="mt-4 text-center text-meta text-faint">Deck building is planned for a later release.</p>
    </PageShell>
  );
}
