import { ExternalLink } from "lucide-react";
import type { BuyLink } from "@cardscan/types";

/**
 * Where to buy the card. Links open in a new tab and are marked `sponsored` for search engines; the
 * commission notice shows only when at least one of them really is an affiliate link.
 */
export function BuyLinks({ links }: { links: BuyLink[] }) {
  if (links.length === 0) return null;
  const hasAffiliate = links.some((link) => link.affiliate);

  return (
    <section className="mt-9 max-w-lg" aria-labelledby="where-to-buy">
      <h2 id="where-to-buy" className="text-section font-semibold">
        Where to buy
      </h2>
      <div className="mt-3 flex flex-wrap gap-2.5">
        {links.map((link) => (
          <a
            key={link.marketplace}
            href={link.url}
            target="_blank"
            rel={link.affiliate ? "sponsored noopener noreferrer" : "noopener noreferrer"}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-hairline px-4 text-body font-medium text-base-content transition-colors duration-fast hover:border-strong hover:bg-base-200"
          >
            {link.label}
            <ExternalLink className="h-4 w-4 text-muted" aria-hidden />
          </a>
        ))}
      </div>
      {hasAffiliate && (
        <p className="mt-2 text-[0.75rem] text-faint">
          Some links are affiliate links: CardScan may earn a commission if you buy, at no extra cost to you.
        </p>
      )}
    </section>
  );
}
