import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-base-300 bg-base-200/40 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-base-300/60 text-base-content/60">
        <Icon className="h-6 w-6" />
      </div>
      <h2 className="text-lg font-medium text-base-content">{title}</h2>
      <p className="max-w-sm text-sm text-base-content/60">{description}</p>
      {action}
    </div>
  );
}
