import type { ReactNode } from "react";

/**
 * The viewfinder: a card-shaped cut-out with corner brackets and a slow sweep.
 *
 * It does the explaining that instructions otherwise would — the aperture is
 * the exact 2.5:3.5 shape of the card you are meant to hold up, so "position
 * your card inside the frame" is legible before anyone reads the caption.
 */
export function ScanFrame({ caption, children }: { caption: string; children?: ReactNode }) {
  return (
    <div className="relative isolate overflow-hidden rounded-hero border border-hairline bg-[#08080B]">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(91,108,255,0.12),transparent_65%)]"
        aria-hidden
      />

      <div className="relative flex flex-col items-center gap-6 px-6 py-10 md:py-14">
        <div className="relative w-full max-w-[15rem]">
          <div className="card-frame relative w-full !bg-white/[0.03]">
            {/* Corner brackets — the universal "align here" signal. */}
            {(
              [
                "left-0 top-0 border-l-2 border-t-2 rounded-tl-lg",
                "right-0 top-0 border-r-2 border-t-2 rounded-tr-lg",
                "left-0 bottom-0 border-b-2 border-l-2 rounded-bl-lg",
                "right-0 bottom-0 border-b-2 border-r-2 rounded-br-lg",
              ] as const
            ).map((position) => (
              <span
                key={position}
                className={`absolute h-9 w-9 border-primary ${position}`}
                aria-hidden
              />
            ))}

            {/* Sweep: communicates "actively looking", the one thing motion
                should say here. */}
            <span
              className="pointer-events-none absolute inset-x-3 top-0 h-16 bg-[linear-gradient(to_bottom,transparent,rgba(91,108,255,0.28),transparent)] motion-safe:animate-scan-sweep"
              aria-hidden
            />

            {children && (
              <div className="absolute inset-0 flex items-center justify-center p-4">{children}</div>
            )}
          </div>
        </div>

        <p className="max-w-xs text-center text-body text-white/70">{caption}</p>
      </div>
    </div>
  );
}
