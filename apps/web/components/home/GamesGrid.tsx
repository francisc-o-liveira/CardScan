"use client";

import Link from "next/link";
import {
  SUPPORTED_TCGS,
  TCG_LABELS,
  TCG_COLORS,
  TCG_CATALOG_STATUS,
} from "@cardscan/config";
import { TCG_ICONS } from "@/components/layout/tcgIcons";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";

/**
 * The eight supported games, with an honest label on the ones whose catalog
 * isn't imported yet. Live games link into Discover; planned ones are visibly
 * inert rather than dead links into an empty grid.
 *
 * Game colour appears here as a small icon tint only — the tiles themselves
 * stay on the neutral surface so the screen still reads as one product.
 */
export function GamesGrid() {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {SUPPORTED_TCGS.map((slug) => {
        const color = TCG_COLORS[slug];
        const Icon = TCG_ICONS[slug];
        const live = TCG_CATALOG_STATUS[slug] === "live";

        const inner = (
          <>
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${color}1F`, color }}
            >
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-body font-medium text-base-content">
                {TCG_LABELS[slug]}
              </span>
              <span className="mt-1 block">
                {live ? (
                  <Badge tone="success">Browsable</Badge>
                ) : (
                  <Badge tone="neutral">Coming soon</Badge>
                )}
              </span>
            </span>
          </>
        );

        const shared =
          "flex h-full items-center gap-3 rounded-panel border border-hairline bg-base-200 p-4 shadow-sheen";

        return (
          <li key={slug}>
            {live ? (
              <Link
                href={`/discover?game=${slug}`}
                className={cn(
                  shared,
                  "transition-colors duration-fast hover:border-strong hover:bg-base-300",
                )}
              >
                {inner}
              </Link>
            ) : (
              <div className={cn(shared, "opacity-55")} aria-disabled>
                {inner}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
