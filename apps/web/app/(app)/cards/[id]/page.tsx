"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Heart,
  Maximize2,
  Layers,
  Tag,
  Hash,
  Languages,
  Coins,
  Share2,
} from "lucide-react";
import { LANGUAGE_LABELS } from "@cardscan/config";
import type { CardPrice, TcgSlug } from "@cardscan/types";
import { formatPrice } from "@/lib/format";
import { PageShell } from "@/components/layout/PageShell";
import { CardImage } from "@/components/cards/CardImage";
import { CardLightbox } from "@/components/cards/CardLightbox";
import { CardRail } from "@/components/cards/CardRail";
import { PriceHistory } from "@/components/cards/PriceHistory";
import { GameBadge, Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { useCard, useCards } from "@/hooks/useCatalog";
import { CAPABILITIES } from "@/lib/features";

/** One labelled fact in the Details list. */
function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Tag;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-faint" aria-hidden />
      <dt className="w-28 shrink-0 text-meta text-muted">{label}</dt>
      <dd className="min-w-0 flex-1 text-meta font-medium text-base-content">{value}</dd>
    </div>
  );
}

/**
 * Every finish TCGplayer prices for this card. "Market" is TCGplayer's figure
 * from recent completed sales; low/mid/high are current listings.
 */
function MarketPrices({ prices }: { prices: CardPrice[] }) {
  return (
    <section className="mt-9 max-w-lg">
      <h2 className="text-section font-semibold">Market prices</h2>

      {prices.length === 0 ? (
        <div className="mt-3 flex items-start gap-3 text-meta text-muted">
          <Coins className="mt-0.5 h-4 w-4 shrink-0 text-faint" aria-hidden />
          <p>TCGplayer doesn&apos;t list a price for this card.</p>
        </div>
      ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-meta">
              <thead>
                <tr className="text-left text-muted">
                  <th className="py-2 pr-3 font-medium">Finish</th>
                  <th className="py-2 pr-3 text-right font-medium">Market</th>
                  <th className="py-2 pr-3 text-right font-medium">Low</th>
                  <th className="py-2 pr-3 text-right font-medium">Mid</th>
                  <th className="py-2 text-right font-medium">High</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border-hairline)] border-t border-[color:var(--border-hairline)]">
                {prices.map((price) => (
                  <tr key={price.subType} className="tabular-nums">
                    <td className="py-2.5 pr-3 font-medium text-base-content">
                      {price.subType || "Normal"}
                    </td>
                    <td className="py-2.5 pr-3 text-right font-semibold text-base-content">
                      {formatPrice(price.market, price.currency) ?? "—"}
                    </td>
                    {[price.low, price.mid, price.high].map((amount, i) => (
                      <td key={i} className={`py-2.5 text-right text-muted ${i < 2 ? "pr-3" : ""}`}>
                        {formatPrice(amount, price.currency) ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      )}
    </section>
  );
}

export default function CardDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const cardId = params?.id;
  const toast = useToast();
  const [zoomed, setZoomed] = useState(false);

  const { data: card, isLoading, isError, refetch } = useCard(cardId);

  // Related = the rest of this card's set. Real data, and the association a
  // collector actually thinks in. Sampled across the set rather than taking the
  // first 14 by name, which would be runs of the same card's alternate prints.
  const related = useCards({ setId: card?.setId, limit: 100 }, Boolean(card?.setId));
  const relatedCards = useMemo(() => {
    const pool = (related.data?.data ?? []).filter((item) => item.id !== cardId);
    if (pool.length <= 14) return pool;
    const step = pool.length / 14;
    return Array.from({ length: 14 }, (_, i) => pool[Math.floor(i * step)]!);
  }, [related.data, cardId]);

  const languages = Array.from(
    new Set((card?.variants ?? []).map((variant) => variant.language.toLowerCase())),
  );

  if (isError) {
    return (
      <PageShell>
        <ErrorState
          title="We couldn't load that card"
          description="The card may have been removed in the last catalog sync, or the connection dropped."
          onRetry={() => refetch()}
          secondaryAction={<ButtonLink href="/search">Search for a card</ButtonLink>}
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-5 inline-flex min-h-9 items-center gap-1.5 text-meta font-medium text-muted transition-colors duration-fast hover:text-base-content"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back
      </button>

      {isLoading || !card ? (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,22rem)_1fr] lg:gap-12">
          <Skeleton className="card-frame w-full" />
          <div>
            <Skeleton className="h-6 w-28 rounded-full" />
            <Skeleton className="mt-4 h-9 w-72" />
            <Skeleton className="mt-3 h-4 w-52" />
            <Skeleton className="mt-8 h-12 w-full max-w-sm rounded-xl" />
            <Skeleton className="mt-8 h-44 w-full rounded-panel" />
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-8 lg:grid-cols-[minmax(0,22rem)_1fr] lg:gap-12">
            {/* Hero artwork. Sticky on desktop so it stays visible while the
                detail column scrolls. */}
            <div className="mx-auto w-full max-w-[18rem] lg:sticky lg:top-24 lg:mx-0 lg:max-w-none lg:self-start">
              <button
                type="button"
                onClick={() => card.imageUrl && setZoomed(true)}
                disabled={!card.imageUrl}
                aria-label={`Enlarge ${card.name}`}
                className="group relative block w-full overflow-hidden rounded-card shadow-card transition-transform duration-base ease-standard disabled:cursor-default motion-safe:enabled:hover:-translate-y-1"
              >
                <CardImage src={card.imageUrl} name={card.name} priority />
                {card.imageUrl && (
                  <span className="pointer-events-none absolute bottom-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-black/55 text-white opacity-0 backdrop-blur transition-opacity duration-fast group-hover:opacity-100">
                    <Maximize2 className="h-4 w-4" aria-hidden />
                  </span>
                )}
              </button>
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {card.tcg?.slug && <GameBadge tcg={card.tcg.slug as TcgSlug} />}
                {card.rarity && <Badge tone="neutral">{card.rarity}</Badge>}
                {card.variant && <Badge tone="info">{card.variant}</Badge>}
              </div>

              <h1 className="mt-3 text-title font-semibold tracking-tight md:text-[2rem]">
                {card.name}
              </h1>

              <p className="mt-1.5 text-body text-muted">
                <Link
                  href={`/sets/${card.setId}`}
                  className="font-medium text-base-content underline-offset-4 transition-colors duration-fast hover:text-primary hover:underline"
                >
                  {card.set?.name}
                </Link>
                {card.collectorNumber && ` · #${card.collectorNumber}`}
              </p>

              {card.marketPrice && (
                <p className="mt-4 flex flex-wrap items-baseline gap-x-2">
                  <span className="text-title font-semibold tabular-nums tracking-tight">
                    {formatPrice(card.marketPrice.amount, card.marketPrice.currency)}
                  </span>
                  <span className="text-meta text-muted">
                    market price
                    {card.marketPrice.subType && ` · ${card.marketPrice.subType}`}
                  </span>
                </p>
              )}

              {/* One primary action, stated plainly. It is disabled rather than
                  hidden: the path has to be obvious now, and it only needs the
                  endpoint to work. */}
              <div className="mt-7 flex flex-wrap items-center gap-2.5">
                <Button
                  variant="primary"
                  size="lg"
                  disabled={!CAPABILITIES.collection}
                  title={
                    CAPABILITIES.collection
                      ? undefined
                      : "Saving to your collection is not available yet"
                  }
                >
                  <Plus className="h-[1.1rem] w-[1.1rem]" aria-hidden />
                  Add to collection
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  disabled={!CAPABILITIES.wishlist}
                  aria-label="Add to wishlist"
                  title={
                    CAPABILITIES.wishlist ? undefined : "Wishlists are not available yet"
                  }
                >
                  <Heart className="h-[1.1rem] w-[1.1rem]" aria-hidden />
                  Wishlist
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={async () => {
                    const url = window.location.href;
                    try {
                      // Native share on mobile, clipboard everywhere else.
                      if (navigator.share) {
                        await navigator.share({ title: card.name, url });
                        return;
                      }
                      await navigator.clipboard.writeText(url);
                      toast("Link copied");
                    } catch {
                      // A cancelled share sheet lands here too — say nothing.
                    }
                  }}
                >
                  <Share2 className="h-[1.1rem] w-[1.1rem]" aria-hidden />
                  Share
                </Button>
              </div>

              {!CAPABILITIES.collection && (
                <p className="mt-2.5 text-meta text-faint">
                  Saving cards arrives with the collection release. You can browse and search the
                  full catalog today.
                </p>
              )}

              <section className="mt-9">
                <h2 className="text-section font-semibold">Details</h2>
                <dl className="mt-1 max-w-lg divide-y divide-[color:var(--border-hairline)]">
                  <DetailRow icon={Layers} label="Set" value={card.set?.name ?? "—"} />
                  <DetailRow icon={Hash} label="Number" value={`#${card.collectorNumber}`} />
                  <DetailRow icon={Tag} label="Rarity" value={card.rarity ?? "Not recorded"} />
                  <DetailRow
                    icon={Languages}
                    label="Languages"
                    value={
                      languages.length
                        ? languages
                            .map(
                              (code) =>
                                LANGUAGE_LABELS[code as keyof typeof LANGUAGE_LABELS] ??
                                code.toUpperCase(),
                            )
                            .join(", ")
                        : "English"
                    }
                  />
                </dl>
              </section>

              <MarketPrices prices={card.prices} />

            </div>
          </div>

          <PriceHistory cardId={card.id} prices={card.prices} />

          {(related.isLoading || relatedCards.length > 0) && (
            <section className="mt-14">
              <SectionHeader
                title="More from this set"
                subtitle={card.set?.name}
                href={`/sets/${card.setId}`}
                linkLabel="View set"
              />
              <CardRail cards={relatedCards} isLoading={related.isLoading} />
            </section>
          )}
        </>
      )}

      {zoomed && card?.imageUrl && (
        <CardLightbox src={card.imageUrl} name={card.name} onClose={() => setZoomed(false)} />
      )}
    </PageShell>
  );
}
