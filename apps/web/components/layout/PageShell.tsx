import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Consistent page width and gutters. `wide` is for the browse screens where
 * more columns of card art is a genuine benefit of the larger screen; `narrow`
 * keeps reading-length content (settings, help) comfortable rather than
 * stretching it across 1600px because the space happens to be there.
 */
export function PageShell({
  children,
  width = "wide",
  className,
}: {
  children: ReactNode;
  width?: "wide" | "narrow";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 py-6 md:px-8 md:py-8",
        width === "wide" ? "max-w-content" : "max-w-3xl",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface PageHeaderProps {
  title: string;
  /** One line explaining what this screen is for. Skippable once obvious. */
  description?: string;
  /** The screen's primary action. At most one. */
  action?: ReactNode;
  /** Small supporting element under the title, e.g. a result count. */
  meta?: ReactNode;
}

export function PageHeader({ title, description, action, meta }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-title font-semibold tracking-tight text-base-content md:text-[2rem]">
          {title}
        </h1>
        {description && <p className="mt-1.5 max-w-xl text-body text-muted">{description}</p>}
        {meta && <div className="mt-2">{meta}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
