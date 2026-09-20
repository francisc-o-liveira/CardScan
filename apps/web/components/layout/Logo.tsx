import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Wordmark. The glyph is a card silhouette crossed by a scan line — the two
 * things the product does, in one mark.
 */
export function Logo({ className, href = "/home" }: { className?: string; href?: string }) {
  return (
    <Link
      href={href}
      className={cn("flex shrink-0 items-center gap-2.5", className)}
      aria-label="CardScan home"
    >
      <span className="relative flex h-8 w-8 items-center justify-center rounded-[0.6rem] bg-primary text-primary-content shadow-sm">
        <svg viewBox="0 0 24 24" className="h-[1.1rem] w-[1.1rem]" aria-hidden>
          <rect
            x="5.5"
            y="3.5"
            width="13"
            height="17"
            rx="2.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path d="M3 12h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </span>
      <span className="text-[1.0625rem] font-semibold tracking-tight">CardScan</span>
    </Link>
  );
}
