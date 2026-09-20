"use client";

import { WifiOff, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./Button";

/**
 * Errors are written for the person reading them, never as a status code.
 * Each one says what failed in plain words and offers at least one way out —
 * usually retry, sometimes an alternative route to the same goal.
 */
export function ErrorState({
  title = "We couldn't load that",
  description = "The connection to CardScan dropped. Check your network and try again.",
  onRetry,
  secondaryAction,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  secondaryAction?: ReactNode;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-panel border border-hairline bg-base-200/60 px-6 py-14 text-center"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-error/10 text-error">
        <WifiOff className="h-6 w-6" aria-hidden />
      </div>
      <h2 className="mt-4 text-section font-semibold">{title}</h2>
      <p className="mt-1.5 max-w-sm text-body text-muted">{description}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {onRetry && (
          <Button variant="primary" onClick={onRetry}>
            <RefreshCw className="h-4 w-4" aria-hidden />
            Try again
          </Button>
        )}
        {secondaryAction}
      </div>
    </div>
  );
}
