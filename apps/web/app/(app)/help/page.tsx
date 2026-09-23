"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { PageShell, PageHeader } from "@/components/layout/PageShell";
import { cn } from "@/lib/cn";

interface Faq {
  question: string;
  answer: React.ReactNode;
}

/**
 * Answers to what someone would actually ask on their first day, including the
 * honest ones about what is not built yet. Stated here so nobody has to work it
 * out from a screen that does nothing.
 */
const FAQS: Faq[] = [
  {
    question: "What can I do right now?",
    answer: (
      <>
        Search and browse the full Pokémon and Magic: The Gathering catalogs — around 130,000 cards
        across 1,270 sets, with artwork, set details, rarity and collector numbers. Start from{" "}
        <Link href="/discover" className="text-primary underline-offset-4 hover:underline">
          Discover
        </Link>{" "}
        or{" "}
        <Link href="/search" className="text-primary underline-offset-4 hover:underline">
          Search
        </Link>
        .
      </>
    ),
  },
  {
    question: "How does scanning work?",
    answer:
      "Open Scan and hold the card inside the frame. CardScan compares the photo with every card in the catalog and shows the best match; when it isn't sure, it asks you to pick. Each scan, and any correction you make, is kept in Scan history.",
  },
  {
    question: "Why is my collection empty?",
    answer:
      "Saving cards to a collection needs the collection service, which isn't live yet. Nothing you do today is lost — there's simply nothing to save to yet.",
  },
  {
    question: "Which games are supported?",
    answer:
      "Pokémon and Magic: The Gathering are imported and searchable. Yu-Gi-Oh!, Disney Lorcana, One Piece, Digimon, Star Wars: Unlimited and Flesh and Blood are planned — they're listed in the app but marked as coming soon rather than left to look broken.",
  },
  {
    question: "Where do the card images and data come from?",
    answer:
      "Pokémon data comes from TCGdex and Magic data from Scryfall. CardScan syncs from both and stores its own copy, so browsing stays fast.",
  },
];

function FaqItem({ faq }: { faq: Faq }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-hairline last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex min-h-touch w-full items-center justify-between gap-4 py-4 text-left"
      >
        <span className="text-body font-medium">{faq.question}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-faint transition-transform duration-fast",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {open && (
        <p className="pb-4 pr-8 text-body leading-relaxed text-muted motion-safe:animate-fade-in-up">
          {faq.answer}
        </p>
      )}
    </div>
  );
}

export default function HelpPage() {
  return (
    <PageShell width="narrow">
      <PageHeader title="Help" description="What works today, and what's on the way." />

      <div className="rounded-panel border border-hairline bg-base-200 px-5">
        {FAQS.map((faq) => (
          <FaqItem key={faq.question} faq={faq} />
        ))}
      </div>

      <section className="mt-6 rounded-panel border border-hairline bg-base-200 p-5">
        <h2 className="text-body font-medium">Still stuck?</h2>
        <p className="mt-1 text-body text-muted">
          Email{" "}
          <a
            href="mailto:support@cardscan.app"
            className="text-primary underline-offset-4 hover:underline"
          >
            support@cardscan.app
          </a>{" "}
          and tell us what you were trying to do.
        </p>
      </section>

      <p className="mt-6 text-meta leading-relaxed text-faint">
        Pokémon, Magic: The Gathering and the other games listed are trademarks of their respective
        owners. CardScan is not affiliated with or endorsed by these companies.
      </p>
    </PageShell>
  );
}
