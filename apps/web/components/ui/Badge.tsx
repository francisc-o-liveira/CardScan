import { TCG_COLORS, TCG_SHORT_LABELS } from "@cardscan/config";
import type { TcgSlug } from "@cardscan/types";
import { cn } from "@/lib/cn";

/**
 * Game identity marker. Colour is paired with the game's name so it never
 * carries the meaning alone (see TCG_COLORS in packages/config).
 */
export function GameBadge({
  tcg,
  size = "md",
  className,
}: {
  tcg: TcgSlug;
  size?: "sm" | "md";
  className?: string;
}) {
  const color = TCG_COLORS[tcg];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        size === "sm" ? "px-2 py-0.5 text-[0.6875rem]" : "px-2.5 py-1 text-meta",
        className,
      )}
      style={{
        color,
        borderColor: `${color}38`,
        backgroundColor: `${color}14`,
      }}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      {TCG_SHORT_LABELS[tcg]}
    </span>
  );
}

type BadgeTone = "neutral" | "primary" | "success" | "warning" | "info";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-base-300 text-muted border-hairline",
  primary: "bg-primary/12 text-primary border-primary/25",
  success: "bg-success/12 text-success border-success/25",
  warning: "bg-warning/12 text-warning border-warning/25",
  info: "bg-info/12 text-info border-info/25",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.6875rem] font-medium",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
