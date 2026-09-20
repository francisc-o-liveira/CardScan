import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

interface SectionHeaderProps {
  title: string;
  /** Optional one-liner clarifying what the section contains. */
  subtitle?: string;
  /** "See all" style affordance. Kept text + chevron so it reads as a link. */
  href?: string;
  linkLabel?: string;
  action?: ReactNode;
}

export function SectionHeader({
  title,
  subtitle,
  href,
  linkLabel = "See all",
  action,
}: SectionHeaderProps) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-section font-semibold text-base-content">{title}</h2>
        {subtitle && <p className="mt-0.5 text-meta text-muted">{subtitle}</p>}
      </div>
      {action}
      {href && !action && (
        <Link
          href={href}
          className="flex shrink-0 items-center gap-0.5 text-meta font-medium text-primary transition-colors duration-fast hover:text-primary/80"
        >
          {linkLabel}
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      )}
    </div>
  );
}
