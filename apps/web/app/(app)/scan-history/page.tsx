"use client";

import { History, ScanLine } from "lucide-react";
import { PageShell, PageHeader } from "@/components/layout/PageShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";

/**
 * Future / Requires Backend Support: the Scan model exists but nothing writes
 * to it until recognition ships.
 */
export default function ScanHistoryPage() {
  return (
    <PageShell width="narrow">
      <PageHeader title="Scan history" />
      <EmptyState
        icon={History}
        title="No scans yet"
        description="Every card you scan is listed here with what CardScan identified it as, so you can correct anything it got wrong."
        action={
          <ButtonLink href="/scan" variant="primary" size="lg">
            <ScanLine className="h-[1.1rem] w-[1.1rem]" aria-hidden />
            Identify a card
          </ButtonLink>
        }
      />
    </PageShell>
  );
}
