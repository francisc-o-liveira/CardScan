import type { ReactNode } from "react";
import { Logo } from "./Logo";

/**
 * Sign-in and sign-up frame.
 *
 * A collector's first impression of the product, so the left panel shows what
 * they are signing up for rather than a stock illustration. It collapses away
 * entirely below `lg`, where the form is all that matters.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main className="flex min-h-dvh bg-base-100">
      <section
        className="relative hidden w-[45%] max-w-2xl flex-col justify-between overflow-hidden border-r border-hairline bg-base-200 p-10 lg:flex"
        aria-hidden
      >
        <div
          className="pointer-events-none absolute -right-20 top-10 h-96 w-96 rounded-full bg-primary/20 blur-3xl"
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-accent/10 blur-3xl"
        />

        <Logo href="/login" />

        <div className="relative">
          <div className="flex items-end gap-4">
            {[
              { rotate: "-9deg", accent: "#FFC61E", lift: "mt-8" },
              { rotate: "-1deg", accent: "#5B6CFF", lift: "" },
              { rotate: "9deg", accent: "#F2751A", lift: "mt-8" },
            ].map((card, index) => (
              <span
                key={index}
                className={`card-frame w-28 shadow-card xl:w-32 ${card.lift}`}
                style={{
                  transform: `rotate(${card.rotate})`,
                  background: `linear-gradient(160deg, ${card.accent}30, ${card.accent}08)`,
                  border: `1px solid ${card.accent}35`,
                }}
              />
            ))}
          </div>

          <p className="mt-12 max-w-sm text-[1.75rem] font-semibold leading-snug tracking-tight">
            Every card you own, in one place.
          </p>
          <p className="mt-3 max-w-sm text-body text-muted">
            212,000+ cards across eight games, searchable by name, set or number.
          </p>
        </div>

        <p className="relative text-meta text-faint">Scan. Identify. Collect.</p>
      </section>

      <section className="flex flex-1 items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <div className="lg:hidden">
            <Logo href="/login" />
          </div>

          <h1 className="mt-8 text-title font-semibold tracking-tight lg:mt-0">{title}</h1>
          <p className="mt-1.5 text-body text-muted">{subtitle}</p>

          <div className="mt-8">{children}</div>

          <div className="mt-6 text-center text-meta text-muted">{footer}</div>
        </div>
      </section>
    </main>
  );
}
