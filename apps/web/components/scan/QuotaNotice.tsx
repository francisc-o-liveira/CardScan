"use client";

import Link from "next/link";
import { Crown } from "lucide-react";
import { useQuota } from "@/hooks/useQuota";

/** How many scans are left, in one quiet line above the camera. Premium shows its badge instead. */
export function QuotaNotice() {
  const { data } = useQuota();
  if (!data) return null;

  if (data.premium) {
    return (
      <p className="inline-flex items-center gap-1.5 text-meta text-muted">
        <Crown className="h-4 w-4 text-warning" aria-hidden />
        Premium: unlimited scans
      </p>
    );
  }

  const left = (data.freeRemaining ?? 0) + data.credits;
  return (
    <p className="text-meta text-muted" data-testid="quota-notice">
      <span className="font-semibold text-base-content">{left}</span> {left === 1 ? "scan" : "scans"} left
      {" · "}
      <Link href="/premium" className="font-medium text-primary hover:underline">
        Get more scans
      </Link>
    </p>
  );
}
