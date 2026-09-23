"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Layers, ScanLine, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ScanFrame } from "@/components/scan/ScanFrame";
import { Logo } from "@/components/layout/Logo";
import { markOnboardingSeen } from "@/lib/onboarding";
import { cn } from "@/lib/cn";

interface Slide {
  title: string;
  body: string;
  visual: ReactNode;
}

/**
 * Three screens. Not ten.
 *
 * Each states one fact in the user's own words, and every screen can be
 * skipped — the fastest route to the product is always one tap away, because
 * the product explains itself better than a tutorial does.
 */
const SLIDES: Slide[] = [
  {
    title: "Your cards. Organised.",
    body: "Keep your Pokémon, Yu-Gi-Oh! and Magic collection in one place — every set, every copy, every condition.",
    visual: (
      <div className="flex items-end justify-center gap-3" aria-hidden>
        {[
          { rotate: "-8deg", accent: "#FFC61E", lift: "mt-6" },
          { rotate: "0deg", accent: "#5B6CFF", lift: "" },
          { rotate: "8deg", accent: "#F2751A", lift: "mt-6" },
        ].map((card, index) => (
          <span
            key={index}
            className={cn("card-frame w-20 shadow-card sm:w-24", card.lift)}
            style={{
              transform: `rotate(${card.rotate})`,
              background: `linear-gradient(160deg, ${card.accent}30, ${card.accent}08)`,
              border: `1px solid ${card.accent}35`,
            }}
          />
        ))}
      </div>
    ),
  },
  {
    title: "Find any card in seconds.",
    body: "Scan a card with your camera, or search 130,000+ Pokémon and Magic cards by name, set or number — with the real artwork.",
    visual: <ScanFrame caption="Hold a card up to the camera" />,
  },
  {
    title: "Start collecting.",
    body: "Browse a set, look up a card you already own, and see what CardScan knows about it.",
    visual: (
      <div
        className="flex h-32 w-32 items-center justify-center rounded-full bg-primary/12 text-primary"
        aria-hidden
      >
        <Sparkles className="h-12 w-12" />
      </div>
    ),
  },
];

export default function WelcomePage() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index]!;
  const isLast = index === SLIDES.length - 1;

  const finish = (destination: string) => {
    markOnboardingSeen();
    router.replace(destination);
  };

  return (
    <main className="flex min-h-dvh flex-col bg-base-100 px-5 py-6">
      <header className="flex items-center justify-between">
        <Logo href="/home" />
        <button
          type="button"
          onClick={() => finish("/home")}
          className="min-h-9 rounded-lg px-3 text-meta font-medium text-muted transition-colors duration-fast hover:text-base-content"
        >
          Skip
        </button>
      </header>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center py-8 text-center">
        <div key={index} className="w-full motion-safe:animate-fade-in-up">
          <div className="flex min-h-[15rem] items-center justify-center">{slide.visual}</div>

          <h1 className="mt-10 text-title font-semibold tracking-tight">{slide.title}</h1>
          <p className="mx-auto mt-3 max-w-sm text-body text-muted">{slide.body}</p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-md">
        <ol className="mb-6 flex items-center justify-center gap-2" aria-label="Progress">
          {SLIDES.map((_, dot) => (
            <li key={dot}>
              <button
                type="button"
                onClick={() => setIndex(dot)}
                aria-label={`Go to screen ${dot + 1} of ${SLIDES.length}`}
                aria-current={dot === index ? "step" : undefined}
                className="flex h-9 items-center px-1"
              >
                <span
                  className={cn(
                    "block h-1.5 rounded-full transition-all duration-base ease-standard",
                    dot === index ? "w-6 bg-primary" : "w-1.5 bg-strong",
                  )}
                />
              </button>
            </li>
          ))}
        </ol>

        {isLast ? (
          <div className="flex flex-col gap-2.5">
            <Button variant="primary" size="lg" block onClick={() => finish("/scan")}>
              <ScanLine className="h-[1.1rem] w-[1.1rem]" aria-hidden />
              Find your first card
            </Button>
            <Button variant="ghost" size="lg" block onClick={() => finish("/home")}>
              <Layers className="h-[1.1rem] w-[1.1rem]" aria-hidden />
              Explore the app
            </Button>
          </div>
        ) : (
          <Button variant="primary" size="lg" block onClick={() => setIndex(index + 1)}>
            Continue
          </Button>
        )}
      </div>
    </main>
  );
}
