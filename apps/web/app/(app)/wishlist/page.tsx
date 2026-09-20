"use client";

import { Heart, Compass } from "lucide-react";
import { PageShell, PageHeader } from "@/components/layout/PageShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";

/**
 * Future / Requires Backend Support: the Wishlist tables exist in the schema
 * but no /wishlist routes are wired up yet.
 */
export default function WishlistPage() {
  return (
    <PageShell width="narrow">
      <PageHeader title="Wishlist" />
      <EmptyState
        icon={Heart}
        title="Nothing on your wishlist yet"
        description="Save the cards you're hunting for and track what they'd cost to close out a set."
        action={
          <ButtonLink href="/discover" variant="primary" size="lg">
            <Compass className="h-[1.1rem] w-[1.1rem]" aria-hidden />
            Browse the catalog
          </ButtonLink>
        }
      />
      <p className="mt-4 text-center text-meta text-faint">
        Saving to a wishlist is in development.
      </p>
    </PageShell>
  );
}
