import { cn } from "@/lib/cn";

/**
 * Loading placeholders. These mirror the real layout's shape so content doesn't
 * jump when it arrives — a spinner over an empty page loses that for free.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton-shimmer rounded-lg", className)} aria-hidden />;
}

export function SkeletonText({ lines = 2, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)} aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-3", i === lines - 1 ? "w-1/2" : "w-full")}
        />
      ))}
    </div>
  );
}

export function SkeletonCardTile() {
  return (
    <div className="flex flex-col gap-2" aria-hidden>
      <Skeleton className="card-frame w-full" />
      <Skeleton className="h-3.5 w-4/5" />
      <Skeleton className="h-3 w-3/5" />
    </div>
  );
}

/**
 * A full grid of card skeletons. `count` should roughly match a real page of
 * results so the scrollbar doesn't lurch on load.
 */
export function SkeletonCardGrid({ count = 12 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
      role="status"
      aria-label="Loading cards"
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCardTile key={i} />
      ))}
    </div>
  );
}
