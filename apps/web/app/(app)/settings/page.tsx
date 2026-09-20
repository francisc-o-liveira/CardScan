"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { PageShell, PageHeader } from "@/components/layout/PageShell";
import { ThemeToggle } from "@/components/settings/ThemeToggle";
import { Badge } from "@/components/ui/Badge";

/** A labelled setting with its control on the right. */
function SettingRow({
  title,
  description,
  control,
}: {
  title: string;
  description?: string;
  control: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4">
      <div className="min-w-0">
        <p className="text-body font-medium">{title}</p>
        {description && <p className="mt-0.5 text-meta text-muted">{description}</p>}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 px-1 text-meta font-medium uppercase tracking-wide text-faint">
        {title}
      </h2>
      <div className="divide-y divide-[color:var(--border-hairline)] overflow-hidden rounded-panel border border-hairline bg-base-200">
        {children}
      </div>
    </section>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <PageShell width="narrow">
      <PageHeader title="Settings" />

      <SettingsGroup title="Appearance">
        <SettingRow
          title="Theme"
          description="CardScan is designed for dark, where card art reads best."
          control={<ThemeToggle />}
        />
      </SettingsGroup>

      <SettingsGroup title="Account">
        <SettingRow title="Username" control={<span className="text-body text-muted">{user?.username}</span>} />
        <SettingRow title="Email" control={<span className="text-body text-muted">{user?.email}</span>} />
        <Link
          href="/profile"
          className="flex min-h-touch items-center justify-between gap-3 px-4 py-4 transition-colors duration-fast hover:bg-base-300"
        >
          <span className="text-body font-medium">View profile</span>
          <ChevronRight className="h-4 w-4 shrink-0 text-faint" aria-hidden />
        </Link>
      </SettingsGroup>

      {/* Named honestly, with what each one will do — not a vague "more later". */}
      <SettingsGroup title="Not available yet">
        <SettingRow
          title="Notifications"
          description="Price alerts and set release reminders."
          control={<Badge tone="neutral">Planned</Badge>}
        />
        <SettingRow
          title="Default language"
          description="Which printing to show first for cards with several languages."
          control={<Badge tone="neutral">Planned</Badge>}
        />
        <SettingRow
          title="Currency"
          description="For market values, once pricing is wired up."
          control={<Badge tone="neutral">Planned</Badge>}
        />
      </SettingsGroup>

      <SettingsGroup title="About">
        <Link
          href="/help"
          className="flex min-h-touch items-center justify-between gap-3 px-4 py-4 transition-colors duration-fast hover:bg-base-300"
        >
          <span className="text-body font-medium">Help</span>
          <ChevronRight className="h-4 w-4 shrink-0 text-faint" aria-hidden />
        </Link>
        <SettingRow title="Version" control={<span className="text-body text-muted">0.1.0</span>} />
      </SettingsGroup>

      <p className="mt-6 px-1 text-meta leading-relaxed text-faint">
        Pokémon, Magic: The Gathering and the other games listed are trademarks of their respective
        owners. CardScan is not affiliated with or endorsed by these companies.
      </p>
    </PageShell>
  );
}
