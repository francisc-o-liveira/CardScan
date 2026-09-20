import Link from "next/link";
import { TCG_COLORS } from "@cardscan/config";
import type { TcgSlug } from "@cardscan/types";
import type { CatalogSet } from "@/services/catalog";
import { SetSymbol } from "./SetSymbol";
import { formatMonthYear } from "@/lib/format";

/**
 * A set in a browse list. The publisher's own set symbol is the recognisable
 * element for collectors, so it leads; the code and card count are the two
 * facts that actually help someone choose.
 */
export function SetTile({ set }: { set: CatalogSet }) {
  const slug = set.tcg?.slug as TcgSlug | undefined;
  const accent = slug ? TCG_COLORS[slug] : undefined;
  const released = formatMonthYear(set.releaseDate);

  return (
    <Link
      href={`/sets/${set.id}`}
      className="group flex items-center gap-3.5 rounded-panel border border-hairline bg-base-200 p-3.5 shadow-sheen transition-colors duration-fast hover:border-strong hover:bg-base-300"
    >
      <SetSymbol src={set.symbolUrl} accent={accent} />

      <span className="min-w-0 flex-1">
        <span className="block truncate text-body font-medium text-base-content transition-colors duration-fast group-hover:text-primary">
          {set.name}
        </span>
        <span className="mt-0.5 block truncate text-meta text-faint">
          {set.code.toUpperCase()}
          {released && ` · ${released}`}
          {set.totalCards ? ` · ${set.totalCards.toLocaleString()} cards` : ""}
        </span>
      </span>
    </Link>
  );
}
