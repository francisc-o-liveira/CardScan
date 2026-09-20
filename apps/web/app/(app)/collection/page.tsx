"use client";

import { Layers, ScanLine, Compass } from "lucide-react";
import { PageShell, PageHeader } from "@/components/layout/PageShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";
import { CAPABILITIES } from "@/lib/features";

/**
 * Cards the user owns.
 *
 * Future / Requires Backend Support: there are no /collection routes yet, so
 * the collection is always empty. Rather than render a search bar, a filter
 * sheet and a sort control over nothing, the screen is exactly what it can
 * honestly be — one empty state with the two things a collector can actually
 * do today.
 *
 * The populated layout (search, game switcher, filter sheet with removable
 * chips, responsive grid) is specified in docs/design-system.md section 5.4 and
 * should be built alongside the endpoint, against real data.
 */
export default function CollectionPage() {
  return (
    <PageShell width="narrow">
      <PageHeader title="My collection" />

      <EmptyState
        icon={Layers}
        title="Your collection is empty"
        description="Scan a card to add your first one. Everything you own — quantities, condition and sets — is tracked here."
        action={
          <ButtonLink href="/scan" variant="primary" size="lg">
            <ScanLine className="h-[1.1rem] w-[1.1rem]" aria-hidden />
            Scan your first card
          </ButtonLink>
        }
        secondaryAction={
          <ButtonLink href="/discover" variant="outline" size="lg">
            <Compass className="h-[1.1rem] w-[1.1rem]" aria-hidden />
            Browse the catalog
          </ButtonLink>
        }
      />

      {!CAPABILITIES.collection && (
        <p className="mt-4 text-center text-meta text-faint">
          Collection tracking is in development — browsing and search work today.
        </p>
      )}
    </PageShell>
  );
}
