import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface EmptyStateProps {
  icon: LucideIcon;
  /** What is missing, stated plainly. */
  title: string;
  /** Why it matters / what will appear here. One or two sentences. */
  description: string;
  /** The one thing the user should do next. Every empty state should have one. */
  action?: ReactNode;
  secondaryAction?: ReactNode;
  /** `inline` sits inside an existing panel; `page` owns the viewport. */
  tone?: "page" | "inline";
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  tone = "page",
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        tone === "page"
          ? "rounded-panel border border-dashed border-hairline bg-base-200/40 px-6 py-16"
          : "px-4 py-10",
        className,
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-base-300 text-muted shadow-sheen">
        <Icon className="h-6 w-6" aria-hidden />
      </div>
      <h2 className="mt-4 text-section font-semibold text-base-content">{title}</h2>
      <p className="mt-1.5 max-w-sm text-body text-muted">{description}</p>
      {(action || secondaryAction) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
