"use client";

import { ScanLine, Layers, Compass } from "lucide-react";
import { SUPPORTED_TCGS, TCG_COLORS, TCG_SHORT_LABELS } from "@cardscan/config";
import type { TcgSlug } from "@cardscan/types";
import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

export interface CollectionSummary {
  totalCards: number;
  perGame: Partial<Record<TcgSlug, number>>;
}

/** Abstract card shapes for the hero's right side. */
const DECOR = [
  { rotate: "-10deg", accent: "#FFC61E", lift: "mt-10" },
  { rotate: "-2deg", accent: "#5B6CFF", lift: "" },
  { rotate: "8deg", accent: "#F2751A", lift: "mt-10" },
];

/**
 * The first thing anyone sees after signing in.
 *
 * It answers "what is this and what do I do next?" in one view: the headline
 * states the product's job, the number states where you stand, and exactly one
 * filled button says how to move forward.
 *
 * Two states, because a hero that shows "0 cards / 0 sets / EUR 0.00" to a new
 * user reads as a broken dashboard rather than an invitation.
 */
export function CollectionHero({
  username,
  summary,
}: {
  username: string;
  summary: CollectionSummary;
}) {
  const isEmpty = summary.totalCards === 0;

  return (
    <section className="relative isolate overflow-hidden rounded-hero border border-hairline bg-base-200">
      {/* Restrained colour: one soft primary wash, not eight competing glows. */}
      <div
        className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-primary/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-40 -left-20 h-72 w-72 rounded-full bg-accent/10 blur-3xl"
        aria-hidden
      />

      <div className="relative flex items-center gap-8 px-5 py-8 md:px-10 md:py-12">
        <div className="min-w-0 flex-1">
          <p className="text-meta text-muted">Welcome back, {username}</p>

          {isEmpty ? (
            <>
              <h1 className="mt-2 max-w-lg text-balance text-[1.75rem] font-semibold leading-tight tracking-tight md:text-display">
                Your collection starts with one scan.
              </h1>
              <p className="mt-3 max-w-md text-body text-muted">
                Point your camera at a card and CardScan identifies it — name, set and number —
                then files it away in your collection.
              </p>
            </>
          ) : (
            <>
              <h1 className="mt-1 text-[3rem] font-semibold leading-none tracking-tight tabular-nums md:text-[3.75rem]">
                {summary.totalCards.toLocaleString()}
              </h1>
              <p className="mt-1.5 text-body text-muted">cards in your collection</p>
              <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
                {SUPPORTED_TCGS.filter((slug) => (summary.perGame[slug] ?? 0) > 0).map((slug) => (
                  <li key={slug} className="flex items-center gap-2 text-meta">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: TCG_COLORS[slug] }}
                      aria-hidden
                    />
                    <span className="text-muted">{TCG_SHORT_LABELS[slug]}</span>
                    <span className="font-semibold tabular-nums">
                      {(summary.perGame[slug] ?? 0).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className={cn("flex flex-wrap items-center gap-3", isEmpty ? "mt-7" : "mt-8")}>
            <ButtonLink href="/scan" variant="primary" size="lg">
              <ScanLine className="h-[1.1rem] w-[1.1rem]" aria-hidden />
              Scan a card
            </ButtonLink>
            <ButtonLink href={isEmpty ? "/discover" : "/collection"} variant="outline" size="lg">
              {isEmpty ? (
                <>
                  <Compass className="h-[1.1rem] w-[1.1rem]" aria-hidden />
                  Explore cards
                </>
              ) : (
                <>
                  <Layers className="h-[1.1rem] w-[1.1rem]" aria-hidden />
                  View collection
                </>
              )}
            </ButtonLink>
          </div>
        </div>

        {/* Fills the right half at desktop width. Deliberately abstract shapes,
            not real artwork — real cards here would read as "these are yours",
            which is exactly what an empty collection is not. */}
        <div className="hidden shrink-0 items-end gap-3 pr-2 lg:flex" aria-hidden>
          {DECOR.map((card, index) => (
            <span
              key={index}
              className={cn("card-frame w-24 shadow-card xl:w-28", card.lift)}
              style={{
                transform: `rotate(${card.rotate})`,
                background: `linear-gradient(160deg, ${card.accent}30, ${card.accent}08)`,
                border: `1px solid ${card.accent}35`,
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
